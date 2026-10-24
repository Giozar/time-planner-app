import { Injectable, signal, computed, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DataProvider } from '../providers/data.provider';
import { Goal, GoalStatus } from '../models/goal.model';
import { Objective } from '../models/objective.model';
import {
  Activity,
  ActivityStatus,
  ActivityType,
  ClosureType,
  ExecutionPlan,
  ItemClosure,
  SubActivity,
  TaskSourceType,
} from '../models/activity.model';
import { DailyRecord } from '../models/daily-record.model';
import { ExecutionSession, SessionStatus, WorkLog } from '../models/session.model';
import { AgendaItem } from '../models/agenda-item.model';
import { CalendarEntry } from '../models/calendar-entry.model';
import { DeletableType, DeletionImpact, TypeChangeImpact } from '../models/deletion-impact.model';
import { DateUtils } from '../utils/date.utils';
import {
  DeadlineConflict,
  autoClosure,
  averageProgress,
  canMoveSession,
  moveSessionTo,
  closedProgress,
  effectiveActivityDeadline,
  effectiveDeadline,
  computeProgress,
  deriveGoalStatus,
  deriveObjectiveStatus,
  deriveRecurrence,
  deriveStatus,
  deriveSubActivityStatus,
  isClosed,
  isCoveredByClosure,
  isFutureDate,
  isValidISODate,
  ConsistencyEntry,
  computeConsistency,
  endPause,
  plannedMinutesOf,
  startPause,
  validateDeadlines,
} from '../rules';

/** Tarea simple o paso donde se puede registrar tiempo. */
export interface ExecutableItem {
  id: string;
  sourceType: TaskSourceType;
  label: string;
}

export interface DayWorkLog {
  log: WorkLog;
  label: string;
}

/** Dueño de un plan de ejecución: una tarea simple o un paso. */
interface PlanOwner {
  id: string;
  title: string;
  sourceType: TaskSourceType;
  activity: Activity;
  step?: SubActivity;
}

@Injectable({
  providedIn: 'root'
})
export class PlannerService {
  private dataProvider = inject(DataProvider);

  // --- SIGNALS ---
  private goalsSignal = signal<Goal[]>([]);
  private objectivesSignal = signal<Objective[]>([]);
  private activitiesSignal = signal<Activity[]>([]);
  private subActivitiesSignal = signal<SubActivity[]>([]);
  private sessionsSignal = signal<ExecutionSession[]>([]);
  private workLogsSignal = signal<WorkLog[]>([]);
  private recordsSignal = signal<DailyRecord[]>([]);

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    forkJoin({
      goals: this.dataProvider.getGoals(),
      objectives: this.dataProvider.getObjectives(),
      activities: this.dataProvider.getActivities(),
      subActivities: this.dataProvider.getSubActivities(),
      sessions: this.dataProvider.getSessions(),
      workLogs: this.dataProvider.getWorkLogs(),
      records: this.dataProvider.getRecords(),
    }).subscribe(data => {
      this.goalsSignal.set(data.goals);
      this.objectivesSignal.set(data.objectives);
      this.activitiesSignal.set(data.activities);
      this.subActivitiesSignal.set(data.subActivities);
      this.sessionsSignal.set(data.sessions);
      this.workLogsSignal.set(data.workLogs);
      this.recordsSignal.set(data.records);
      // Al abrir se aplican los cierres automáticos de elementos y de días (RN-77, RN-81).
      this.commit();
      this.closePendingDays();
    });
  }

  // --- SELECTORES PÚBLICOS ---
  public goals = this.goalsSignal.asReadonly();
  public objectives = this.objectivesSignal.asReadonly();
  public activities = this.activitiesSignal.asReadonly();
  public subActivities = this.subActivitiesSignal.asReadonly();
  public sessions = this.sessionsSignal.asReadonly();
  public workLogs = this.workLogsSignal.asReadonly();
  public records = this.recordsSignal.asReadonly();

  /** Sesiones de un plan, ordenadas por fecha. */
  sessionsOf(planId: string): ExecutionSession[] {
    return this.sessionsSignal().filter(s => s.planId === planId).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }

  /** Realizadas y totales por plan, para mostrar «x / y» sin recorrer las sesiones en cada pantalla. */
  public sessionCounts = computed<ReadonlyMap<string, { done: number; total: number }>>(() => {
    const counts = new Map<string, { done: number; total: number }>();
    for (const s of this.sessionsSignal()) {
      const c = counts.get(s.planId) ?? { done: 0, total: 0 };
      c.total++;
      if (s.status === SessionStatus.DONE) c.done++;
      counts.set(s.planId, c);
    }
    return counts;
  });

  /** Tarea simple o paso dueño de cada plan. */
  private planOwners = computed<ReadonlyMap<string, PlanOwner>>(() => {
    const owners = new Map<string, PlanOwner>();
    const activities = this.activitiesSignal();
    for (const activity of activities) {
      if (activity.type === ActivityType.SIMPLE && activity.executionPlan) {
        owners.set(activity.executionPlan.id, {
          id: activity.id, title: activity.title, sourceType: TaskSourceType.ACTIVITY, activity,
        });
      }
    }
    for (const step of this.subActivitiesSignal()) {
      const activity = activities.find(a => a.id === step.activityId);
      if (activity) {
        owners.set(step.executionPlan.id, {
          id: step.id, title: step.title, sourceType: TaskSourceType.SUBACTIVITY, activity, step,
        });
      }
    }
    return owners;
  });

  /** Cierre guardado del dueño de un plan: el del paso o el de la tarea simple (RN-77). */
  private closureOfOwner(owner: PlanOwner): ItemClosure | undefined {
    return owner.step ? owner.step.closure : owner.activity.closure;
  }

  /**
   * Tareas cuyas sesiones se muestran (RN-29, RN-66): excluye las de metas PAUSED/IDEA y las tareas PAUSED.
   * Una meta finalizada sigue visible: lo cerrado aparece como completo (RN-78).
   * Única fuente de visibilidad: la usan la agenda de hoy y el calendario, para que nunca difieran.
   */
  private visibleActivityIds = computed<Set<string>>(() => {
    const goals = this.goalsSignal();
    const objectives = this.objectivesSignal();

    return new Set(this.activitiesSignal().filter(activity => {
      if (activity.status === ActivityStatus.PAUSED) return false;
      const objective = objectives.find(o => o.id === activity.objectiveId);
      const goal = goals.find(g => g.id === objective?.goalId);
      return !!goal && (goal.status === GoalStatus.ACTIVE || goal.status === GoalStatus.FINISHED);
    }).map(a => a.id));
  });

  /** Fecha de la agenda; hoy por defecto (RN-75). */
  private selectedDateSignal = signal<string>(DateUtils.getTodayISO());
  public selectedDate = this.selectedDateSignal.asReadonly();

  /** Las fechas futuras son de solo lectura (RN-27). */
  public isSelectedDateReadOnly = computed(() => isFutureDate(this.selectedDateSignal(), DateUtils.getTodayISO()));

  /** Cambia la fecha de la agenda. Devuelve `false` si no es una fecha válida. */
  setSelectedDate(date: string): boolean {
    if (!isValidISODate(date)) return false;
    this.selectedDateSignal.set(date);
    return true;
  }

  /** Fija la fecha desde el parámetro `?date=` de la URL; sin parámetro o inválido, hoy (RN-75). */
  syncSelectedDate(param: string | null) {
    this.setSelectedDate(param && isValidISODate(param) ? param : DateUtils.getTodayISO());
  }

  /** Agenda de la fecha elegida (RN-25 a RN-29, RN-75). */
  public agendaTasks = computed<AgendaItem[]>(() => this.agendaFor(this.selectedDateSignal()));

  public agendaMetrics = computed(() => this.metricsOf(this.agendaTasks(), this.selectedDateSignal()));

  /** Sesiones de `date` de tareas simples y pasos visibles. */
  private agendaFor(date: string): AgendaItem[] {
    const today = DateUtils.getTodayISO();
    const visible = this.visibleActivityIds();
    const owners = this.planOwners();
    const logs = this.workLogsSignal();
    const items: AgendaItem[] = [];

    for (const session of this.sessionsSignal()) {
      const owner = owners.get(session.planId);
      if (session.scheduledDate !== date || !owner || !visible.has(owner.activity.id)) continue;

      const isCovered = isCoveredByClosure(session, this.closureOfOwner(owner));
      items.push({
        sessionId: session.id,
        canMove: canMoveSession(session, today) && !isClosed(owner.step ?? owner.activity),
        deadline: this.deadlineOfOwner(owner) ?? date,
        id: owner.id,
        title: owner.title,
        sourceType: owner.sourceType,
        parentId: owner.step ? owner.activity.id : null,
        isCompleted: session.status === SessionStatus.DONE || isCovered,
        isCovered,
        estimatedDurationMin: session.plannedMinutes,
        executedMinutes: logs.filter(l => l.sessionId === session.id).reduce((sum, l) => sum + l.minutes, 0),
      });
    }

    return items;
  }

  /**
   * Métricas de la fecha sin las sesiones cubiertas por un cierre manual (RN-79).
   * `executedTimeMin` suma todo el `WorkLog` de la fecha, también el trabajo sin sesión (RN-72).
   */
  private metricsOf(agenda: AgendaItem[], date: string) {
    const tasks = agenda.filter(t => !t.isCovered);
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    const plannedTimeMin = tasks.reduce((acc, t) => acc + t.estimatedDurationMin, 0);
    const executedTimeMin = this.workLogsSignal().filter(l => l.date === date).reduce((acc, l) => acc + l.minutes, 0);
    return { total, completed, percentage, remaining: total - completed, plannedTimeMin, executedTimeMin };
  }

  /**
   * Sesiones programadas por fecha para el calendario (RN-66): tareas simples y pasos visibles,
   * con su jerarquía y deadlines efectivos (RN-48). Ordenadas por título dentro de cada día.
   */
  public calendarEntries = computed<ReadonlyMap<string, CalendarEntry[]>>(() => {
    const visible = this.visibleActivityIds();
    const goals = this.goalsSignal();
    const objectives = this.objectivesSignal();
    const entries = new Map<string, CalendarEntry[]>();

    const add = (entry: CalendarEntry) => {
      const day = entries.get(entry.date);
      if (day) day.push(entry); else entries.set(entry.date, [entry]);
    };

    const owners = this.planOwners();
    for (const session of this.sessionsSignal()) {
      const owner = owners.get(session.planId);
      if (!owner || !visible.has(owner.activity.id)) continue;
      const objective = objectives.find(o => o.id === owner.activity.objectiveId);
      const goal = goals.find(g => g.id === objective?.goalId);
      if (!objective || !goal) continue;

      const activityLimit = effectiveActivityDeadline(owner.activity, objective);
      add({
        sessionId: session.id,
        goalTitle: goal.title,
        objectiveTitle: objective.title,
        objectiveDeadline: objective.deadline,
        activityTitle: owner.activity.title,
        date: session.scheduledDate,
        id: owner.id,
        sourceType: owner.sourceType,
        title: owner.title,
        isCompleted: session.status === SessionStatus.DONE || isCoveredByClosure(session, this.closureOfOwner(owner)),
        durationMin: session.plannedMinutes,
        effectiveDeadline: owner.step ? effectiveDeadline(owner.step, activityLimit) : activityLimit,
      });
    }

    for (const day of entries.values()) {
      day.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    }
    return entries;
  });

  /**
   * Constancia por id de tarea, paso, objetivo y meta (RN-70): sesiones realizadas sobre las exigibles,
   * o `null` si todavía no hay ninguna. Los padres usan todas las sesiones de sus descendientes.
   */
  public consistency = computed<ReadonlyMap<string, number | null>>(() => {
    const today = DateUtils.getTodayISO();
    const todayClosed = this.recordsSignal().some(r => r.date === today);
    const sessions = this.sessionsSignal();
    const goals = this.goalsSignal();
    const objectives = this.objectivesSignal();
    const result = new Map<string, number | null>();
    const score = (id: string, entries: ConsistencyEntry[]) => {
      result.set(id, computeConsistency(entries, today, todayClosed));
      return entries;
    };
    const entriesOf = (
      plan: ExecutionPlan | null, pauses: ConsistencyEntry['pauses'], closure: ItemClosure | undefined,
    ): ConsistencyEntry[] =>
      plan ? sessions.filter(s => s.planId === plan.id).map(session => ({ session, pauses, closure })) : [];

    const byObjective = new Map<string, ConsistencyEntry[]>();
    const byGoal = new Map<string, ConsistencyEntry[]>();

    for (const activity of this.activitiesSignal()) {
      const objective = objectives.find(o => o.id === activity.objectiveId);
      const goal = goals.find(g => g.id === objective?.goalId);
      if (!objective || !goal) continue;

      const pauses = [...(goal.pauses ?? []), ...(activity.pauses ?? [])];
      const own = activity.type === ActivityType.SIMPLE
        ? entriesOf(activity.executionPlan, pauses, activity.closure)
        : this.stepsOf(activity.id).flatMap(step => score(step.id, entriesOf(step.executionPlan, pauses, step.closure)));
      score(activity.id, own);

      byObjective.set(objective.id, [...(byObjective.get(objective.id) ?? []), ...own]);
      byGoal.set(goal.id, [...(byGoal.get(goal.id) ?? []), ...own]);
    }

    for (const objective of objectives) score(objective.id, byObjective.get(objective.id) ?? []);
    for (const goal of goals) score(goal.id, byGoal.get(goal.id) ?? []);
    return result;
  });

  /** Tareas simples y pasos donde se puede registrar tiempo (CU-27), con su nombre completo. */
  public executableItems = computed<ExecutableItem[]>(() => {
    const items: ExecutableItem[] = [];
    for (const activity of this.activitiesSignal()) {
      if (activity.type === ActivityType.SIMPLE) {
        items.push({ id: activity.id, sourceType: TaskSourceType.ACTIVITY, label: activity.title });
      }
    }
    for (const step of this.subActivitiesSignal()) {
      const parent = this.activitiesSignal().find(a => a.id === step.activityId);
      items.push({ id: step.id, sourceType: TaskSourceType.SUBACTIVITY, label: `${parent?.title ?? ''} › ${step.title}` });
    }
    return items.sort((a, b) => a.label.localeCompare(b.label, 'es'));
  });

  /** Bloques de tiempo de la fecha elegida, con el nombre del ítem (CU-27, RN-76). */
  public dayWorkLogs = computed<DayWorkLog[]>(() => {
    const labels = new Map(this.executableItems().map(i => [i.id, i.label]));
    return this.workLogsSignal()
      .filter(l => l.date === this.selectedDateSignal())
      .map(log => ({ log, label: labels.get(log.sourceId) ?? '' }));
  });

  // --- METAS ---

  addGoal(goal: Goal) {
    this.goalsSignal.update(g => [...g, goal]);
    this.commit();
  }

  updateGoal(updated: Goal) {
    this.goalsSignal.update(goals => goals.map(g => g.id === updated.id ? updated : g));
    this.commit();
  }

  /** Solo cambia el estado; no toca deadlines, sesiones ni progreso (RN-57). */
  pauseGoal(id: string) {
    this.setGoalStatus(id, GoalStatus.ACTIVE, GoalStatus.PAUSED);
  }

  resumeGoal(id: string) {
    this.setGoalStatus(id, GoalStatus.PAUSED, GoalStatus.ACTIVE);
  }

  deleteGoal(id: string) {
    const objectiveIds = this.objectivesSignal().filter(o => o.goalId === id).map(o => o.id);
    this.removeObjectives(objectiveIds);
    this.goalsSignal.update(goals => goals.filter(g => g.id !== id));
    this.commit();
  }

  // --- OBJETIVOS ---

  addObjective(objective: Objective) {
    this.objectivesSignal.update(o => [...o, objective]);
    this.commit();
  }

  /**
   * Devuelve los conflictos de deadline (RN-49); si hay alguno, no se guarda.
   * Un objetivo cerrado conserva su deadline (RN-80).
   */
  updateObjective(updated: Objective): DeadlineConflict[] {
    const previous = this.objectivesSignal().find(o => o.id === updated.id);
    if (previous && isClosed(previous)) updated = { ...updated, deadline: previous.deadline };

    const conflicts = this.conflictsFor(updated.id, { objective: updated });
    if (conflicts.length > 0) return conflicts;

    this.objectivesSignal.update(obs => obs.map(o => o.id === updated.id ? updated : o));
    this.commit();
    return [];
  }

  /**
   * Cierra a mano el objetivo: sus tareas simples y pasos abiertos quedan completados (RN-77, RN-78).
   * Devuelve si cerró algo.
   */
  closeObjective(id: string): boolean {
    return this.closeItems(this.activitiesSignal().filter(a => a.objectiveId === id).map(a => a.id));
  }

  deleteObjective(id: string) {
    this.removeObjectives([id]);
    this.commit();
  }

  // --- TAREAS ---

  /**
   * `sessions` son las del plan de la tarea (ver `regenerateFutureSessions`).
   * Devuelve los conflictos de deadline (RN-48/49); si hay alguno, no se guarda.
   */
  addActivity(activity: Activity, sessions: ExecutionSession[] = []): DeadlineConflict[] {
    const candidate = this.normalizeActivity(activity, sessions);
    const conflicts = this.conflictsFor(candidate.objectiveId, { activity: candidate, sessions });
    if (conflicts.length > 0) return conflicts;

    this.activitiesSignal.update(a => [...a, candidate]);
    this.replaceSessions(candidate.executionPlan?.id, sessions);
    this.commit();
    return [];
  }

  /**
   * Guarda la tarea. Si `sessions` se indica, reemplaza las sesiones de su plan.
   * Si cambia de tipo (RN-39, RN-40): compuesta → simple elimina sus pasos con sus sesiones y tiempo;
   * simple → compuesta descarta su plan, sesiones y tiempo. La confirmación previa es del llamador (`typeChangeImpact`).
   * Una tarea cerrada conserva su cierre, su tipo, su deadline y su plan (RN-80).
   * Devuelve los conflictos de deadline (RN-48/49); si hay alguno, no se guarda.
   */
  updateActivity(updated: Activity, sessions?: ExecutionSession[]): DeadlineConflict[] {
    const previous = this.activitiesSignal().find(a => a.id === updated.id);
    if (previous) updated = { ...updated, closure: previous.closure };
    if (previous && isClosed(previous)) {
      updated = { ...updated, type: previous.type, deadline: previous.deadline, executionPlan: previous.executionPlan };
      sessions = undefined;
    }
    const keptSessions = sessions ?? this.sessionsOf(updated.executionPlan?.id ?? '');
    const candidate = this.normalizeActivity(updated, keptSessions);
    const keepsSteps = candidate.type === ActivityType.COMPOSITE;

    const conflicts = this.conflictsFor(candidate.objectiveId, {
      activity: candidate,
      sessions: candidate.executionPlan ? keptSessions : [],
      dropStepsOf: keepsSteps ? undefined : candidate.id, // pasar a simple elimina sus pasos
    });
    if (conflicts.length > 0) return conflicts;

    if (!keepsSteps) this.purgeSteps(this.stepsOf(candidate.id).map(s => s.id));
    if (previous?.executionPlan && !candidate.executionPlan) this.purgeItems([previous.id], [previous.executionPlan.id]);

    this.activitiesSignal.update(acts => acts.map(a => a.id === candidate.id ? candidate : a));
    if (candidate.executionPlan && sessions) this.replaceSessions(candidate.executionPlan.id, sessions);
    this.commit();
    return [];
  }

  /** Datos que se perderían al cambiar la tarea a `newType` (RN-39, RN-40). */
  typeChangeImpact(activityId: string, newType: ActivityType): TypeChangeImpact {
    const activity = this.activitiesSignal().find(a => a.id === activityId);
    const none: TypeChangeImpact = {
      stepsToDelete: 0, sessionsToLose: 0, completedSessionsToLose: 0, workLogsToLose: 0, needsConfirmation: false,
    };
    if (!activity || activity.type === newType) return none;

    if (newType === ActivityType.SIMPLE) {
      const steps = this.stepsOf(activityId);
      const stepIds = steps.map(s => s.id);
      const workLogsToLose = this.workLogsSignal().filter(l => stepIds.includes(l.sourceId)).length;
      return { ...none, stepsToDelete: steps.length, workLogsToLose, needsConfirmation: steps.length > 0 };
    }

    const planSessions = activity.executionPlan ? this.sessionsOf(activity.executionPlan.id) : [];
    const sessionsToLose = planSessions.length;
    const completedSessionsToLose = planSessions.filter(s => s.status === SessionStatus.DONE).length;
    const workLogsToLose = this.workLogsSignal().filter(l => l.sourceId === activityId).length;
    return {
      ...none,
      sessionsToLose,
      completedSessionsToLose,
      workLogsToLose,
      needsConfirmation: sessionsToLose > 0 || workLogsToLose > 0,
    };
  }

  /** Solo oculta la tarea de la agenda (RN-59). */
  pauseActivity(id: string) {
    this.setActivityStatus(id, ActivityStatus.PAUSED);
  }

  resumeActivity(id: string) {
    const activity = this.activitiesSignal().find(a => a.id === id);
    if (activity?.status !== ActivityStatus.PAUSED) return;
    // El estado real se deriva del progreso en el recálculo.
    this.setActivityStatus(id, ActivityStatus.PENDING);
  }

  /**
   * Cierra a mano la tarea (RN-77, RN-78): la simple queda completada aunque le falten sesiones (RN-79);
   * la compuesta cierra sus pasos abiertos. Devuelve si cerró algo.
   */
  closeActivity(id: string): boolean {
    return this.closeItems([id]);
  }

  deleteActivity(id: string) {
    this.removeActivities([id]);
    this.commit();
  }

  // --- PASOS ---

  /** Devuelve los conflictos de deadline (RN-48/49); si hay alguno, no se guarda. */
  addSubActivity(sub: SubActivity, sessions: ExecutionSession[] = []): DeadlineConflict[] {
    return this.saveSubActivity(sub, sessions, subs => [...subs, sub]);
  }

  /**
   * `sessions`, si se indica, reemplaza las del plan del paso.
   * Un paso cerrado conserva su cierre, su deadline y su plan (RN-80).
   */
  updateSubActivity(updated: SubActivity, sessions?: ExecutionSession[]): DeadlineConflict[] {
    const previous = this.subActivitiesSignal().find(s => s.id === updated.id);
    if (previous) updated = { ...updated, closure: previous.closure };
    if (previous && isClosed(previous)) {
      updated = { ...updated, deadline: previous.deadline, executionPlan: previous.executionPlan };
      sessions = undefined;
    }
    const step = updated;
    return this.saveSubActivity(step, sessions, subs => subs.map(s => s.id === step.id ? step : s));
  }

  /** Cierra a mano el paso: queda completado aunque le falten sesiones (RN-77, RN-79). Devuelve si cerró algo. */
  closeStep(id: string): boolean {
    return this.closeItems([], [id]);
  }

  deleteSubActivity(id: string) {
    this.purgeSteps([id]);
    this.commit();
  }

  // --- BORRADO: IMPACTO PARA LA CONFIRMACIÓN ESCRITA (RN-62) ---

  deletionImpact(type: DeletableType, id: string): DeletionImpact | null {
    const objectives = this.objectivesSignal();
    const activities = this.activitiesSignal();
    const steps = this.subActivitiesSignal();

    const isDone = (status: string) => status === 'COMPLETED';
    const collect = (objs: Objective[], acts: Activity[], subs: SubActivity[], title: string, own: boolean): DeletionImpact => ({
      title,
      objectives: objs.length,
      activities: acts.length,
      steps: subs.length,
      completed:
        objs.filter(o => isDone(o.status)).length +
        acts.filter(a => isDone(a.status)).length +
        subs.filter(s => isDone(s.status)).length +
        (own ? 1 : 0),
    });

    switch (type) {
      case DeletableType.GOAL: {
        const goal = this.goalsSignal().find(g => g.id === id);
        if (!goal) return null;
        const objs = objectives.filter(o => o.goalId === id);
        const acts = activities.filter(a => objs.some(o => o.id === a.objectiveId));
        const subs = steps.filter(s => acts.some(a => a.id === s.activityId));
        return collect(objs, acts, subs, goal.title, false);
      }
      case DeletableType.OBJECTIVE: {
        const objective = objectives.find(o => o.id === id);
        if (!objective) return null;
        const acts = activities.filter(a => a.objectiveId === id);
        const subs = steps.filter(s => acts.some(a => a.id === s.activityId));
        return collect([], acts, subs, objective.title, isDone(objective.status));
      }
      case DeletableType.ACTIVITY: {
        const activity = activities.find(a => a.id === id);
        if (!activity) return null;
        return collect([], [], steps.filter(s => s.activityId === id), activity.title, isDone(activity.status));
      }
      case DeletableType.STEP: {
        const step = steps.find(s => s.id === id);
        if (!step) return null;
        return collect([], [], [], step.title, isDone(step.status));
      }
    }
  }

  // --- EJECUCIÓN ---

  /**
   * Marca o desmarca la sesión de `date` (la de la agenda por defecto), de hoy o pasada (RN-27).
   * Marcar crea un `WorkLog` vinculado con `minutes` o, si falta, los minutos previstos;
   * desmarcar vuelve la sesión a `PLANNED` y elimina los bloques vinculados.
   * Las fechas futuras, sin sesión, cubiertas por un cierre manual (RN-79) o con minutos no válidos se ignoran.
   * Un día ya cerrado no se actualiza solo: se recalcula al volver a cerrarlo (RN-44).
   */
  toggleTaskExecution(id: string, sourceType: TaskSourceType, minutes?: number, date = this.selectedDateSignal()) {
    const plan = this.planOf(id, sourceType);
    const session = plan && this.sessionsSignal().find(s => s.planId === plan.id && s.scheduledDate === date);
    if (session) this.toggleSession(session.id, minutes);
  }

  /**
   * Marca o desmarca una sesión concreta con las mismas reglas que `toggleTaskExecution`.
   * La agenda la usa porque una sesión movida puede compartir día con otra del mismo ítem (RN-82).
   */
  toggleSession(sessionId: string, minutes?: number) {
    const session = this.sessionsSignal().find(s => s.id === sessionId);
    const owner = session && this.planOwners().get(session.planId);
    if (!session || !owner || isFutureDate(session.scheduledDate, DateUtils.getTodayISO())) return;
    if (minutes !== undefined && !this.isValidMinutes(minutes)) return;
    if (isCoveredByClosure(session, this.closureOfOwner(owner))) return;

    if (session.status === SessionStatus.DONE) {
      this.updateSession(session.id, { status: SessionStatus.PLANNED, completedAt: undefined });
      this.workLogsSignal.update(logs => logs.filter(l => l.sessionId !== session.id));
    } else {
      this.updateSession(session.id, { status: SessionStatus.DONE, completedAt: new Date().toISOString() });
      this.workLogsSignal.update(logs => [...logs, {
        id: crypto.randomUUID(), sourceType: owner.sourceType, sourceId: owner.id, date: session.scheduledDate,
        minutes: minutes ?? session.plannedMinutes, sessionId: session.id,
      }]);
    }
    this.commit();
  }

  /**
   * Mueve una sesión `PLANNED` de hoy o futura a `date`, de hoy hasta el deadline efectivo de su ítem,
   * sin tocar el resto del plan (RN-82). El ítem debe estar abierto. Devuelve si se movió.
   */
  moveSession(sessionId: string, date: string): boolean {
    const today = DateUtils.getTodayISO();
    const session = this.sessionsSignal().find(s => s.id === sessionId);
    const owner = session && this.planOwners().get(session.planId);
    if (!session || !owner || !isValidISODate(date) || !canMoveSession(session, today)) return false;
    if (isClosed(owner.step ?? owner.activity)) return false;

    const deadline = this.deadlineOfOwner(owner);
    if (!deadline || date < today || date > deadline) return false;

    this.sessionsSignal.update(all => all.map(s => s.id === sessionId ? moveSessionTo(s, date) : s));
    this.commit();
    return true;
  }

  /** Registra tiempo trabajado sin sesión, hoy o en una fecha pasada (RN-71). */
  logWork(id: string, sourceType: TaskSourceType, minutes: number, date = DateUtils.getTodayISO()): boolean {
    if (!this.isValidMinutes(minutes) || isFutureDate(date, DateUtils.getTodayISO()) || !isValidISODate(date)) return false;
    if (!this.planOf(id, sourceType)) return false;

    this.workLogsSignal.update(logs => [...logs, { id: crypto.randomUUID(), sourceType, sourceId: id, date, minutes }]);
    this.commit();
    return true;
  }

  /** Corrige los minutos de un bloque (RN-76). */
  updateWorkLog(id: string, minutes: number): boolean {
    if (!this.isValidMinutes(minutes) || !this.workLogsSignal().some(l => l.id === id)) return false;
    this.workLogsSignal.update(logs => logs.map(l => l.id === id ? { ...l, minutes } : l));
    this.commit();
    return true;
  }

  /** Borra un bloque; si era el último de una sesión `DONE`, la devuelve a `PLANNED` (RN-76). */
  deleteWorkLog(id: string) {
    const log = this.workLogsSignal().find(l => l.id === id);
    if (!log) return;

    this.workLogsSignal.update(logs => logs.filter(l => l.id !== id));
    const stillLinked = log.sessionId && this.workLogsSignal().some(l => l.sessionId === log.sessionId);
    if (log.sessionId && !stillLinked) {
      this.updateSession(log.sessionId, { status: SessionStatus.PLANNED, completedAt: undefined });
    }
    this.commit();
  }

  /**
   * Cierra la fecha (la de la agenda por defecto). Un registro por fecha: si ya existe, se reemplaza (RN-43).
   * Devuelve `null` si la fecha es futura (RN-44).
   */
  closeDay(notes: string, date = this.selectedDateSignal()): DailyRecord | null {
    if (isFutureDate(date, DateUtils.getTodayISO())) return null;
    return this.saveRecord(date, notes);
  }

  private saveRecord(date: string, notes: string): DailyRecord {
    const existing = this.recordsSignal().find(r => r.date === date);
    const record = this.buildRecord(date, notes, existing?.id);

    this.recordsSignal.update(records => existing
      ? records.map(r => r.date === date ? record : r)
      : [...records, record]);
    this.dataProvider.saveRecords(this.recordsSignal()).subscribe();
    return record;
  }

  private buildRecord(date: string, notes: string, id: string = crypto.randomUUID()): DailyRecord {
    const metrics = this.metricsOf(this.agendaFor(date), date);
    return {
      id,
      date,
      plannedSessions: metrics.total,
      completedSessions: metrics.completed,
      adherencePercentage: metrics.total === 0 ? null : metrics.percentage,
      plannedMinutes: metrics.plannedTimeMin,
      actualMinutes: metrics.executedTimeMin,
      notes,
      closedAt: new Date().toISOString(),
    };
  }

  /**
   * Cierra solos, sin notas, los días pasados que tuvieron sesiones o tiempo registrado y no tienen cierre (RN-81).
   * Después se pueden volver a cerrar para escribir notas o recalcular (RN-43, RN-44).
   */
  private closePendingDays() {
    const today = DateUtils.getTodayISO();
    const closed = new Set(this.recordsSignal().map(r => r.date));
    const dates = new Set([
      ...this.sessionsSignal().map(s => s.scheduledDate),
      ...this.workLogsSignal().map(l => l.date),
    ]);

    const records = [...dates]
      .filter(date => date < today && !closed.has(date))
      .map(date => this.buildRecord(date, ''))
      .filter(r => r.plannedSessions > 0 || r.actualMinutes > 0);
    if (records.length === 0) return;

    this.recordsSignal.update(all => [...all, ...records]);
    this.dataProvider.saveRecords(this.recordsSignal()).subscribe();
  }

  // --- INTERNOS ---

  private stepsOf(activityId: string): SubActivity[] {
    return this.subActivitiesSignal().filter(s => s.activityId === activityId);
  }

  private setGoalStatus(id: string, from: GoalStatus, to: GoalStatus) {
    const goal = this.goalsSignal().find(g => g.id === id);
    if (goal?.status !== from) return;
    const today = DateUtils.getTodayISO();
    this.goalsSignal.update(goals => goals.map(g => {
      if (g.id !== id) return g;
      const pauses = to === GoalStatus.PAUSED ? startPause(g.pauses, today)
        : from === GoalStatus.PAUSED ? endPause(g.pauses, today) : g.pauses;
      return { ...g, status: to, pauses };
    }));
    this.commit();
  }

  private setActivityStatus(id: string, status: ActivityStatus) {
    const today = DateUtils.getTodayISO();
    this.activitiesSignal.update(acts => acts.map(a => {
      if (a.id !== id) return a;
      const pauses = status === ActivityStatus.PAUSED ? startPause(a.pauses, today)
        : a.status === ActivityStatus.PAUSED ? endPause(a.pauses, today) : a.pauses;
      return { ...a, status, pauses };
    }));
    this.commit();
  }

  /** `recurrence` se calcula del plan (RN-47); una compuesta no tiene plan ni recurrencia. */
  private normalizeActivity(activity: Activity, sessions: readonly ExecutionSession[]): Activity {
    const plan = activity.type === ActivityType.COMPOSITE ? null : activity.executionPlan;
    return { ...activity, executionPlan: plan, recurrence: deriveRecurrence(activity.type, plan, sessions.length) };
  }

  private isValidMinutes(minutes: number): boolean {
    return Number.isInteger(minutes) && minutes > 0;
  }

  private planOf(id: string, sourceType: TaskSourceType): ExecutionPlan | null {
    if (sourceType === TaskSourceType.ACTIVITY) {
      const activity = this.activitiesSignal().find(a => a.id === id);
      return activity?.type === ActivityType.SIMPLE ? activity.executionPlan : null;
    }
    return this.subActivitiesSignal().find(s => s.id === id)?.executionPlan ?? null;
  }

  /** Deadline efectivo del dueño de un plan (RN-48); `null` si no tiene objetivo. */
  private deadlineOfOwner(owner: PlanOwner): string | null {
    const objective = this.objectivesSignal().find(o => o.id === owner.activity.objectiveId);
    if (!objective) return null;
    const activityLimit = effectiveActivityDeadline(owner.activity, objective);
    return owner.step ? effectiveDeadline(owner.step, activityLimit) : activityLimit;
  }

  /**
   * Cierre manual (RN-77): las tareas simples de `activityIds`, los pasos abiertos de sus compuestas
   * y los pasos `stepIds` que sigan abiertos quedan completados desde hoy. Devuelve si cerró algo.
   */
  private closeItems(activityIds: string[], stepIds: string[] = []): boolean {
    const closure: ItemClosure = { type: ClosureType.MANUAL, closedOn: DateUtils.getTodayISO() };
    const activities = this.activitiesSignal().filter(a => activityIds.includes(a.id));
    const simpleIds = activities.filter(a => a.type === ActivityType.SIMPLE && !isClosed(a)).map(a => a.id);
    const compositeIds = activities.filter(a => a.type === ActivityType.COMPOSITE).map(a => a.id);
    const openStepIds = this.subActivitiesSignal()
      .filter(s => !isClosed(s) && (stepIds.includes(s.id) || compositeIds.includes(s.activityId)))
      .map(s => s.id);
    if (simpleIds.length === 0 && openStepIds.length === 0) return false;

    this.activitiesSignal.update(acts => acts.map(a => simpleIds.includes(a.id) ? { ...a, closure } : a));
    this.subActivitiesSignal.update(subs => subs.map(s => openStepIds.includes(s.id) ? { ...s, closure } : s));
    this.commit();
    return true;
  }

  private updateSession(id: string, changes: Partial<ExecutionSession>) {
    this.sessionsSignal.update(sessions => sessions.map(s => s.id === id ? { ...s, ...changes } : s));
  }

  /** Sustituye todas las sesiones de un plan por `sessions`. */
  private replaceSessions(planId: string | undefined, sessions: readonly ExecutionSession[]) {
    if (!planId) return;
    this.sessionsSignal.update(all => [...all.filter(s => s.planId !== planId), ...sessions]);
  }

  /** Elimina tareas simples/pasos con su plan: sus sesiones y su tiempo trabajado (RN-74). */
  private purgeItems(itemIds: string[], planIds: string[]) {
    this.sessionsSignal.update(all => all.filter(s => !planIds.includes(s.planId)));
    this.workLogsSignal.update(all => all.filter(l => !itemIds.includes(l.sourceId)));
  }

  private purgeSteps(stepIds: string[]) {
    const steps = this.subActivitiesSignal().filter(s => stepIds.includes(s.id));
    this.purgeItems(stepIds, steps.map(s => s.executionPlan.id));
    this.subActivitiesSignal.update(subs => subs.filter(s => !stepIds.includes(s.id)));
  }

  /**
   * Valida los deadlines del objetivo con el cambio candidato aplicado (RN-48, RN-49, RN-65).
   * `dropStepsOf`: tarea cuyos pasos se van a eliminar y no deben validarse.
   */
  private conflictsFor(
    objectiveId: string,
    change: {
      objective?: Objective; activity?: Activity; step?: SubActivity; dropStepsOf?: string;
      /** Sesiones candidatas del plan de `activity` o `step`; reemplazan las guardadas. */
      sessions?: readonly ExecutionSession[];
    },
  ): DeadlineConflict[] {
    const objective = change.objective ?? this.objectivesSignal().find(o => o.id === objectiveId);
    if (!objective) return [];

    const activities = this.activitiesSignal()
      .filter(a => a.objectiveId === objectiveId && a.id !== change.activity?.id);
    if (change.activity) activities.push(change.activity);

    const ids = activities.map(a => a.id);
    const steps = this.subActivitiesSignal()
      .filter(s => ids.includes(s.activityId) && s.activityId !== change.dropStepsOf && s.id !== change.step?.id);
    if (change.step) steps.push(change.step);

    const changedPlanId = change.activity?.executionPlan?.id ?? change.step?.executionPlan.id;
    const sessions = [
      ...this.sessionsSignal().filter(s => s.planId !== changedPlanId),
      ...(change.sessions ?? this.sessionsSignal().filter(s => s.planId === changedPlanId)),
    ];

    return validateDeadlines(objective, activities, steps, sessions);
  }

  private saveSubActivity(
    sub: SubActivity,
    sessions: ExecutionSession[] | undefined,
    apply: (subs: SubActivity[]) => SubActivity[],
  ): DeadlineConflict[] {
    const parent = this.activitiesSignal().find(a => a.id === sub.activityId);
    if (!parent) return [];

    const conflicts = this.conflictsFor(parent.objectiveId, { step: sub, sessions });
    if (conflicts.length > 0) return conflicts;

    this.subActivitiesSignal.update(apply);
    if (sessions) this.replaceSessions(sub.executionPlan.id, sessions);
    this.commit();
    return [];
  }

  private removeActivities(ids: string[]) {
    this.purgeSteps(this.subActivitiesSignal().filter(s => ids.includes(s.activityId)).map(s => s.id));
    const planIds = this.activitiesSignal().filter(a => ids.includes(a.id) && a.executionPlan).map(a => a.executionPlan!.id);
    this.purgeItems(ids, planIds);
    this.activitiesSignal.update(acts => acts.filter(a => !ids.includes(a.id)));
  }

  private removeObjectives(ids: string[]) {
    const activityIds = this.activitiesSignal().filter(a => ids.includes(a.objectiveId)).map(a => a.id);
    this.removeActivities(activityIds);
    this.objectivesSignal.update(obs => obs.filter(o => !ids.includes(o.id)));
  }

  /**
   * Recalcula todo el árbol de abajo hacia arriba: paso → tarea → objetivo → meta (RN-30 a RN-36),
   * con el cierre automático de tareas simples y pasos y el cierre en cascada de sus padres (RN-77, RN-78).
   * Es la única función de recálculo: se ejecuta tras cada mutación.
   */
  private cascade() {
    const today = DateUtils.getTodayISO();
    const byPlan = new Map<string, ExecutionSession[]>();
    for (const session of this.sessionsSignal()) {
      byPlan.set(session.planId, [...(byPlan.get(session.planId) ?? []), session]);
    }
    const sessionsOfPlan = (planId: string) => byPlan.get(planId) ?? [];

    const objectivesById = new Map(this.objectivesSignal().map(o => [o.id, o]));
    const activitiesById = new Map(this.activitiesSignal().map(a => [a.id, a]));
    /** Deadline efectivo de una tarea (RN-48); `null` si no tiene objetivo. */
    const limitOf = (activity: Activity | undefined): string | null => {
      const objective = activity && objectivesById.get(activity.objectiveId);
      return activity && objective ? effectiveActivityDeadline(activity, objective) : null;
    };
    /** Cierre y avance de una tarea simple o un paso (RN-30, RN-77). */
    const closeLeaf = (closure: ItemClosure | undefined, sessions: ExecutionSession[], deadline: string | null) => {
      const raw = computeProgress(sessions);
      const current = deadline ? autoClosure(closure, raw, deadline, today) : closure;
      return { closure: current, progress: closedProgress(raw, current) };
    };

    const steps = this.subActivitiesSignal().map(s => {
      const parentLimit = limitOf(activitiesById.get(s.activityId));
      const deadline = parentLimit ? effectiveDeadline(s, parentLimit) : null;
      const { closure, progress } = closeLeaf(s.closure, sessionsOfPlan(s.executionPlan.id), deadline);
      return { ...s, closure, progress, status: deriveSubActivityStatus(progress, !!closure) };
    });

    const activities = this.activitiesSignal().map(a => {
      if (a.type === ActivityType.COMPOSITE) {
        const own = steps.filter(s => s.activityId === a.id);
        const progress = averageProgress(own.map(s => s.progress));
        return {
          ...a,
          progress,
          status: deriveStatus(progress, a.status, own.length > 0 && own.every(isClosed)),
          totalTimeRequiredMin: own.reduce((sum, s) => sum + plannedMinutesOf(sessionsOfPlan(s.executionPlan.id)), 0),
        };
      }
      const ownSessions = a.executionPlan ? sessionsOfPlan(a.executionPlan.id) : [];
      const { closure, progress } = closeLeaf(a.closure, ownSessions, limitOf(a));
      return {
        ...a,
        closure,
        progress,
        status: deriveStatus(progress, a.status, !!closure),
        totalTimeRequiredMin: plannedMinutesOf(ownSessions),
      };
    });

    const objectives = this.objectivesSignal().map(o => {
      const tasks = activities.filter(a => a.objectiveId === o.id);
      const progress = averageProgress(tasks.map(a => a.progress));
      return { ...o, progress, status: deriveObjectiveStatus(o.status, progress, tasks) };
    });

    const goals = this.goalsSignal().map(g => {
      const own = objectives.filter(o => o.goalId === g.id);
      const progress = averageProgress(own.map(o => o.progress));
      // RN-55: la idea pasa a ACTIVE cuando tiene horizonte y ya tiene tareas.
      const hasTasks = activities.some(a => own.some(o => o.id === a.objectiveId));
      const status = g.status === GoalStatus.IDEA && g.horizon && hasTasks ? GoalStatus.ACTIVE : g.status;
      return { ...g, progress, status: deriveGoalStatus(status, own) };
    });

    this.subActivitiesSignal.set(steps);
    this.activitiesSignal.set(activities);
    this.objectivesSignal.set(objectives);
    this.goalsSignal.set(goals);
  }

  /** Recalcula la cascada y guarda. Se llama una vez por mutación. */
  private commit() {
    this.cascade();
    this.dataProvider.saveGoals(this.goalsSignal()).subscribe();
    this.dataProvider.saveObjectives(this.objectivesSignal()).subscribe();
    this.dataProvider.saveActivities(this.activitiesSignal()).subscribe();
    this.dataProvider.saveSubActivities(this.subActivitiesSignal()).subscribe();
    this.dataProvider.saveSessions(this.sessionsSignal()).subscribe();
    this.dataProvider.saveWorkLogs(this.workLogsSignal()).subscribe();
  }
}

import { Injectable, signal, computed, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DataProvider } from '../providers/data.provider';
import { Goal, GoalStatus } from '../models/goal.model';
import { Objective, ObjectiveStatus } from '../models/objective.model';
import {
  Activity,
  ActivityStatus,
  ActivityType,
  ClosureType,
  ExecutionPlan,
  ItemClosure,
  SubActivity,
  SubActivityStatus,
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
  canMoveSession,
  moveSessionTo,
  deadlineClosure,
  effectiveActivityDeadline,
  effectiveDeadline,
  computeProductivity,
  computeProgress,
  deriveRecurrence,
  deriveStatus,
  hasOpenPause,
  isClosed,
  isEffectivelyPaused,
  isHiddenByClosure,
  isFutureDate,
  isValidISODate,
  ConsistencyEntry,
  computeConsistency,
  endPause,
  plannedMinutesOf,
  reopensWithParent,
  sessionsDoneClosure,
  startPause,
  validateDeadlines,
} from '../rules';
import { PausePeriod } from '../models/pause.model';

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

/** Productividad de un elemento (RN-73): minutos reales sobre previstos de todo su plan. */
export interface ProductivitySummary {
  actualMinutes: number;
  plannedMinutes: number;
  percentage: number | null;
}

/**
 * Resultado de reabrir (RN-64): `NEEDS_DEADLINE` si su deadline efectivo ya pasó y falta uno nuevo;
 * `PARENT_EXPIRED` si el de su padre también pasó; `INVALID_DEADLINE` si el nuevo es anterior a hoy o supera el del padre.
 */
export type ReopenResult = 'OK' | 'NOT_CLOSED' | 'NEEDS_DEADLINE' | 'PARENT_EXPIRED' | 'INVALID_DEADLINE';

/** Nivel de la jerarquía, para las acciones comunes a los cuatro: pausar, cerrar y reabrir. */
type Level = 'goal' | 'objective' | 'activity' | 'step';

/** Lo que tienen en común los cuatro niveles para pausar, cerrar y reabrir. */
interface TreeNode {
  id: string;
  status: string;
  progress: number;
  closure?: ItemClosure;
  pauses?: PausePeriod[];
}

/** Estado del último guardado: detecta los eventos que disparan cierres automáticos (RN-77, RN-78). */
interface Snapshot {
  progress: ReadonlyMap<string, number>;
  closed: ReadonlySet<string>;
  children: ReadonlyMap<string, readonly string[]>;
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
      // Lo guardado es el punto de partida: los cierres automáticos solo responden a cambios desde aquí (RN-77).
      this.snapshot = this.takeSnapshot();
      // Al abrir se aplican los cierres por fecha límite y el cierre automático de días (RN-58, RN-81).
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

  /** Historiales de pausa de la meta, el objetivo, la tarea y, si es un paso, el paso dueño de un plan (RN-57). */
  private pauseChainOf(owner: PlanOwner): (PausePeriod[] | undefined)[] {
    const objective = this.objectivesSignal().find(o => o.id === owner.activity.objectiveId);
    const goal = this.goalsSignal().find(g => g.id === objective?.goalId);
    return [goal?.pauses, objective?.pauses, owner.activity.pauses, owner.step?.pauses];
  }

  /**
   * Planes cuyas sesiones se muestran (RN-29, RN-66): excluye los de metas `IDEA` y los que están en pausa efectiva,
   * por una pausa propia o de cualquier padre (RN-57). De lo cerrado solo se ocultan las sesiones no realizadas
   * desde su cierre (RN-79). Única fuente de visibilidad: la usan la agenda y el calendario, para que nunca difieran.
   */
  private visiblePlanIds = computed<Set<string>>(() => {
    const visible = new Set<string>();
    for (const [planId, owner] of this.planOwners()) {
      const objective = this.objectivesSignal().find(o => o.id === owner.activity.objectiveId);
      const goal = this.goalsSignal().find(g => g.id === objective?.goalId);
      if (goal && goal.status !== GoalStatus.IDEA && !isEffectivelyPaused(this.pauseChainOf(owner))) visible.add(planId);
    }
    return visible;
  });

  /** Fecha de la agenda; hoy por defecto (RN-75). */
  private selectedDateSignal = signal<string>(DateUtils.getTodayISO());
  public selectedDate = this.selectedDateSignal.asReadonly();

  /** En fechas futuras no se marcan sesiones ni se registra tiempo (RN-27, RN-71); sí se mueven (RN-82). */
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
    const visible = this.visiblePlanIds();
    const owners = this.planOwners();
    const logs = this.workLogsSignal();
    const items: AgendaItem[] = [];

    for (const session of this.sessionsSignal()) {
      const owner = owners.get(session.planId);
      if (session.scheduledDate !== date || !owner || !visible.has(session.planId)) continue;
      if (isHiddenByClosure(session, this.closureOfOwner(owner))) continue;

      items.push({
        sessionId: session.id,
        canMove: canMoveSession(session, today) && !isClosed(owner.step ?? owner.activity),
        deadline: this.deadlineOfOwner(owner) ?? date,
        id: owner.id,
        title: owner.title,
        sourceType: owner.sourceType,
        parentId: owner.step ? owner.activity.id : null,
        isCompleted: session.status === SessionStatus.DONE,
        estimatedDurationMin: session.plannedMinutes,
        executedMinutes: logs.filter(l => l.sessionId === session.id).reduce((sum, l) => sum + l.minutes, 0),
      });
    }

    return items;
  }

  /** `executedTimeMin` suma todo el `WorkLog` de la fecha, también el trabajo sin sesión (RN-72). */
  private metricsOf(tasks: AgendaItem[], date: string) {
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
    const visible = this.visiblePlanIds();
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
      if (!owner || !visible.has(session.planId)) continue;
      if (isHiddenByClosure(session, this.closureOfOwner(owner))) continue;
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
        isCompleted: session.status === SessionStatus.DONE,
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

      // Pausas de todos sus padres (RN-57): la del paso se suma a las de su tarea, objetivo y meta.
      const pauses = [...(goal.pauses ?? []), ...(objective.pauses ?? []), ...(activity.pauses ?? [])];
      const own = activity.type === ActivityType.SIMPLE
        ? entriesOf(activity.executionPlan, pauses, activity.closure)
        : this.stepsOf(activity.id).flatMap(step =>
          score(step.id, entriesOf(step.executionPlan, [...pauses, ...(step.pauses ?? [])], step.closure)));
      score(activity.id, own);

      byObjective.set(objective.id, [...(byObjective.get(objective.id) ?? []), ...own]);
      byGoal.set(goal.id, [...(byGoal.get(goal.id) ?? []), ...own]);
    }

    for (const objective of objectives) score(objective.id, byObjective.get(objective.id) ?? []);
    for (const goal of goals) score(goal.id, byGoal.get(goal.id) ?? []);
    return result;
  });

  /**
   * Productividad por id de tarea, paso, objetivo y meta (RN-73): minutos de `WorkLog`, también sin sesión,
   * sobre los minutos previstos de todas las sesiones del plan. Los padres suman los de sus ítems ejecutables.
   */
  public productivity = computed<ReadonlyMap<string, ProductivitySummary>>(() => {
    const actualBySource = new Map<string, number>();
    for (const log of this.workLogsSignal()) {
      actualBySource.set(log.sourceId, (actualBySource.get(log.sourceId) ?? 0) + log.minutes);
    }
    const plannedByPlan = new Map<string, number>();
    for (const session of this.sessionsSignal()) {
      plannedByPlan.set(session.planId, (plannedByPlan.get(session.planId) ?? 0) + session.plannedMinutes);
    }

    const result = new Map<string, ProductivitySummary>();
    const totals = new Map<string, { actual: number; planned: number }>();
    const add = (id: string, actual: number, planned: number) => {
      const t = totals.get(id) ?? { actual: 0, planned: 0 };
      totals.set(id, { actual: t.actual + actual, planned: t.planned + planned });
    };
    const leaf = (id: string, planId: string | undefined) => {
      const actual = actualBySource.get(id) ?? 0;
      const planned = planId ? plannedByPlan.get(planId) ?? 0 : 0;
      add(id, actual, planned);
      return { actual, planned };
    };

    for (const activity of this.activitiesSignal()) {
      const objective = this.objectivesSignal().find(o => o.id === activity.objectiveId);
      const parts = activity.type === ActivityType.SIMPLE
        ? [leaf(activity.id, activity.executionPlan?.id)]
        : this.stepsOf(activity.id).map(step => leaf(step.id, step.executionPlan.id));
      for (const { actual, planned } of parts) {
        if (activity.type === ActivityType.COMPOSITE) add(activity.id, actual, planned);
        if (objective) {
          add(objective.id, actual, planned);
          add(objective.goalId, actual, planned);
        }
      }
    }

    const ids = [...this.goalsSignal(), ...this.objectivesSignal(), ...this.activitiesSignal(), ...this.subActivitiesSignal()]
      .map(item => item.id);
    for (const id of ids) {
      const { actual, planned } = totals.get(id) ?? { actual: 0, planned: 0 };
      result.set(id, { actualMinutes: actual, plannedMinutes: planned, percentage: computeProductivity(actual, planned) });
    }
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

  /** El cierre y las pausas no se editan con el formulario: se conservan. */
  updateGoal(updated: Goal) {
    this.goalsSignal.update(goals => goals.map(g => g.id === updated.id ? { ...updated, closure: g.closure, pauses: g.pauses } : g));
    this.commit();
  }

  /** Pausar no toca deadlines, sesiones ni progreso; lo de abajo queda en pausa efectiva (RN-57). Una idea no se pausa. */
  pauseGoal(id: string) {
    if (this.goalsSignal().find(g => g.id === id)?.status === GoalStatus.IDEA) return;
    this.setPause('goal', id, true);
  }

  resumeGoal(id: string) {
    this.setPause('goal', id, false);
  }

  /** Cierra a mano la meta y todo lo que tiene abajo, sin cambiar su avance (RN-77, RN-78). Una idea no se cierra. */
  closeGoal(id: string): boolean {
    if (this.goalsSignal().find(g => g.id === id)?.status === GoalStatus.IDEA) return false;
    return this.closeManually('goal', id);
  }

  /** Reabre la meta y lo de abajo que siga dentro de su deadline (RN-64). */
  reopenGoal(id: string): ReopenResult {
    return this.reopen('goal', id);
  }

  deleteGoal(id: string) {
    const objectiveIds = this.objectivesSignal().filter(o => o.goalId === id).map(o => o.id);
    this.removeObjectives(objectiveIds);
    this.goalsSignal.update(goals => goals.filter(g => g.id !== id));
    this.commit();
  }

  // --- OBJETIVOS ---

  /** Un objetivo nuevo reabre su meta si estaba cerrada (RN-53). */
  addObjective(objective: Objective) {
    this.objectivesSignal.update(o => [...o, objective]);
    this.reopenAncestors('objective', objective.id);
    this.commit();
  }

  /**
   * Devuelve los conflictos de deadline (RN-49); si hay alguno, no se guarda.
   * Conserva el cierre y las pausas; un objetivo cerrado conserva además su deadline (RN-80).
   */
  updateObjective(updated: Objective): DeadlineConflict[] {
    const previous = this.objectivesSignal().find(o => o.id === updated.id);
    if (previous) updated = { ...updated, closure: previous.closure, pauses: previous.pauses };
    if (previous && isClosed(previous)) updated = { ...updated, deadline: previous.deadline };

    const conflicts = this.conflictsFor(updated.id, { objective: updated });
    if (conflicts.length > 0) return conflicts;

    this.objectivesSignal.update(obs => obs.map(o => o.id === updated.id ? updated : o));
    this.commit();
    return [];
  }

  /** Cierra a mano el objetivo y sus tareas y pasos abiertos, sin cambiar su avance (RN-77, RN-78). Devuelve si cerró algo. */
  closeObjective(id: string): boolean {
    return this.closeManually('objective', id);
  }

  /** `deadline`: obligatorio si el suyo ya pasó (RN-64). */
  reopenObjective(id: string, deadline?: string): ReopenResult {
    return this.reopen('objective', id, deadline);
  }

  pauseObjective(id: string) {
    this.setPause('objective', id, true);
  }

  resumeObjective(id: string) {
    this.setPause('objective', id, false);
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
    this.reopenAncestors('activity', candidate.id); // RN-53
    this.commit();
    return [];
  }

  /**
   * Guarda la tarea. Si `sessions` se indica, reemplaza las sesiones de su plan.
   * Si cambia de tipo (RN-39, RN-40): compuesta → simple elimina sus pasos con sus sesiones y tiempo;
   * simple → compuesta descarta su plan, sesiones y tiempo. La confirmación previa es del llamador (`typeChangeImpact`).
   * Conserva el cierre y las pausas; una tarea cerrada conserva además su tipo, su deadline y su plan (RN-80).
   * Devuelve los conflictos de deadline (RN-48/49); si hay alguno, no se guarda.
   */
  updateActivity(updated: Activity, sessions?: ExecutionSession[]): DeadlineConflict[] {
    const previous = this.activitiesSignal().find(a => a.id === updated.id);
    if (previous) updated = { ...updated, closure: previous.closure, pauses: previous.pauses };
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

  /** Solo la oculta de la agenda, con sus pasos (RN-57, RN-59). Una tarea cerrada no se pausa. */
  pauseActivity(id: string) {
    this.setPause('activity', id, true);
  }

  resumeActivity(id: string) {
    this.setPause('activity', id, false);
  }

  /** `deadline`: obligatorio si su deadline efectivo ya pasó (RN-64). */
  reopenActivity(id: string, deadline?: string): ReopenResult {
    return this.reopen('activity', id, deadline);
  }

  /**
   * Cierra a mano la tarea sin cambiar su avance (RN-77, RN-78); la compuesta cierra también sus pasos abiertos.
   * Devuelve si cerró algo.
   */
  closeActivity(id: string): boolean {
    return this.closeManually('activity', id);
  }

  deleteActivity(id: string) {
    this.removeActivities([id]);
    this.commit();
  }

  // --- PASOS ---

  /** Devuelve los conflictos de deadline (RN-48/49); si hay alguno, no se guarda. Reabre sus padres cerrados (RN-53). */
  addSubActivity(sub: SubActivity, sessions: ExecutionSession[] = []): DeadlineConflict[] {
    return this.saveSubActivity(sub, sessions, subs => [...subs, sub], true);
  }

  /**
   * `sessions`, si se indica, reemplaza las del plan del paso.
   * Conserva el cierre y las pausas; un paso cerrado conserva además su deadline y su plan (RN-80).
   */
  updateSubActivity(updated: SubActivity, sessions?: ExecutionSession[]): DeadlineConflict[] {
    const previous = this.subActivitiesSignal().find(s => s.id === updated.id);
    if (previous) updated = { ...updated, closure: previous.closure, pauses: previous.pauses };
    if (previous && isClosed(previous)) {
      updated = { ...updated, deadline: previous.deadline, executionPlan: previous.executionPlan };
      sessions = undefined;
    }
    const step = updated;
    return this.saveSubActivity(step, sessions, subs => subs.map(s => s.id === step.id ? step : s));
  }

  /** Cierra a mano el paso sin cambiar su avance (RN-77). Devuelve si cerró algo. */
  closeStep(id: string): boolean {
    return this.closeManually('step', id);
  }

  /** `deadline`: obligatorio si su deadline efectivo ya pasó (RN-64). */
  reopenStep(id: string, deadline?: string): ReopenResult {
    return this.reopen('step', id, deadline);
  }

  pauseStep(id: string) {
    this.setPause('step', id, true);
  }

  resumeStep(id: string) {
    this.setPause('step', id, false);
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

    const isDone = (status: string) => isClosed({ status });
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
   * Las fechas futuras, sin sesión, ocultas por un cierre (RN-79) o con minutos no válidos se ignoran.
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
    if (isHiddenByClosure(session, this.closureOfOwner(owner))) return;

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

  // --- JERARQUÍA: ACCIONES COMUNES A LOS CUATRO NIVELES ---

  private nodeOf(level: Level, id: string): TreeNode | undefined {
    switch (level) {
      case 'goal': return this.goalsSignal().find(g => g.id === id);
      case 'objective': return this.objectivesSignal().find(o => o.id === id);
      case 'activity': return this.activitiesSignal().find(a => a.id === id);
      case 'step': return this.subActivitiesSignal().find(s => s.id === id);
    }
  }

  /** Hijos directos: meta → objetivos, objetivo → tareas, tarea → pasos. */
  private childrenOf(level: Level, id: string): { level: Level; id: string }[] {
    switch (level) {
      case 'goal': return this.objectivesSignal().filter(o => o.goalId === id).map(o => ({ level: 'objective' as const, id: o.id }));
      case 'objective': return this.activitiesSignal().filter(a => a.objectiveId === id).map(a => ({ level: 'activity' as const, id: a.id }));
      case 'activity': return this.stepsOf(id).map(s => ({ level: 'step' as const, id: s.id }));
      case 'step': return [];
    }
  }

  private parentOf(level: Level, id: string): { level: Level; id: string } | null {
    switch (level) {
      case 'goal': return null;
      case 'objective': {
        const objective = this.objectivesSignal().find(o => o.id === id);
        return objective ? { level: 'goal', id: objective.goalId } : null;
      }
      case 'activity': {
        const activity = this.activitiesSignal().find(a => a.id === id);
        return activity ? { level: 'objective', id: activity.objectiveId } : null;
      }
      case 'step': {
        const step = this.subActivitiesSignal().find(s => s.id === id);
        return step ? { level: 'activity', id: step.activityId } : null;
      }
    }
  }

  /** Deadline efectivo (RN-48); la meta no tiene (RN-56). */
  private effectiveDeadlineOf(level: Level, id: string): string | null {
    switch (level) {
      case 'goal': return null;
      case 'objective': return this.objectivesSignal().find(o => o.id === id)?.deadline ?? null;
      case 'activity': {
        const activity = this.activitiesSignal().find(a => a.id === id);
        const objective = activity && this.objectivesSignal().find(o => o.id === activity.objectiveId);
        return activity && objective ? effectiveActivityDeadline(activity, objective) : null;
      }
      case 'step': {
        const step = this.subActivitiesSignal().find(s => s.id === id);
        const limit = step && this.effectiveDeadlineOf('activity', step.activityId);
        return step && limit ? effectiveDeadline(step, limit) : null;
      }
    }
  }

  /** Cambia el cierre, las pausas o el deadline de un elemento. La meta no tiene deadline. */
  private patchNode(level: Level, id: string, changes: { closure?: ItemClosure; pauses?: PausePeriod[]; deadline?: string }) {
    const apply = <T extends { id: string }>(items: T[]): T[] => items.map(item => item.id === id ? { ...item, ...changes } : item);
    switch (level) {
      case 'goal': this.goalsSignal.update(apply); break;
      case 'objective': this.objectivesSignal.update(apply); break;
      case 'activity': this.activitiesSignal.update(apply); break;
      case 'step': this.subActivitiesSignal.update(apply); break;
    }
  }

  /** Pausar abre un periodo y reanudar lo termina el día anterior (RN-57). Lo cerrado no se pausa. */
  private setPause(level: Level, id: string, pause: boolean) {
    const node = this.nodeOf(level, id);
    if (!node) return;
    const today = DateUtils.getTodayISO();
    if (pause) {
      if (node.closure || hasOpenPause(node.pauses)) return;
      this.patchNode(level, id, { pauses: startPause(node.pauses, today) });
    } else {
      if (!hasOpenPause(node.pauses)) return;
      this.patchNode(level, id, { pauses: endPause(node.pauses, today) });
    }
    this.commit();
  }

  /**
   * Cierre a mano (RN-77, RN-78): el elemento y todos sus descendientes abiertos quedan cerrados desde hoy,
   * sin cambiar su avance. Los ya cerrados conservan su cierre. Devuelve si cerró algo.
   */
  private closeManually(level: Level, id: string): boolean {
    if (!this.nodeOf(level, id) || this.nodeOf(level, id)?.closure) return false;
    const closure: ItemClosure = { type: ClosureType.MANUAL, closedOn: DateUtils.getTodayISO() };
    const close = (l: Level, i: string) => {
      if (!this.nodeOf(l, i)?.closure) this.patchNode(l, i, { closure });
      this.childrenOf(l, i).forEach(child => close(child.level, child.id));
    };
    close(level, id);
    this.commit();
    return true;
  }

  /**
   * Reabrir (RN-64): borra el cierre sin importar cómo se cerró, reabre los descendientes que siguen dentro de su deadline
   * y tienen sesiones pendientes, y reabre sus padres cerrados. Si su deadline efectivo ya pasó, exige `deadline`
   * desde hoy y dentro del de su padre; sus descendientes sin deadline propio lo heredan.
   */
  private reopen(level: Level, id: string, deadline?: string): ReopenResult {
    if (!this.nodeOf(level, id)?.closure) return 'NOT_CLOSED';
    const today = DateUtils.getTodayISO();
    const current = this.effectiveDeadlineOf(level, id);

    if (current !== null && current < today) {
      const parent = this.parentOf(level, id);
      const parentLimit = parent && this.effectiveDeadlineOf(parent.level, parent.id);
      if (parentLimit && parentLimit < today) return 'PARENT_EXPIRED';
      if (!deadline) return 'NEEDS_DEADLINE';
      if (!isValidISODate(deadline) || deadline < today || (parentLimit && deadline > parentLimit)) return 'INVALID_DEADLINE';
      this.patchNode(level, id, { deadline });
    }

    this.patchNode(level, id, { closure: undefined });
    this.reopenDescendants(level, id, today);
    this.reopenAncestors(level, id);
    this.commit();
    return 'OK';
  }

  /** Reabre los descendientes cerrados que siguen dentro de su deadline y tienen sesiones pendientes (RN-64). */
  private reopenDescendants(level: Level, id: string, today: string) {
    for (const child of this.childrenOf(level, id)) {
      const node = this.nodeOf(child.level, child.id);
      const limit = this.effectiveDeadlineOf(child.level, child.id);
      if (node?.closure && limit !== null && reopensWithParent(limit, node.progress, today)) {
        this.patchNode(child.level, child.id, { closure: undefined });
      }
      this.reopenDescendants(child.level, child.id, today);
    }
  }

  /** Reabre los padres cerrados de un elemento, sin tocar a sus otros hijos (RN-53, RN-64). */
  private reopenAncestors(level: Level, id: string) {
    for (let parent = this.parentOf(level, id); parent; parent = this.parentOf(parent.level, parent.id)) {
      if (this.nodeOf(parent.level, parent.id)?.closure) this.patchNode(parent.level, parent.id, { closure: undefined });
    }
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
    reopenParents = false,
  ): DeadlineConflict[] {
    const parent = this.activitiesSignal().find(a => a.id === sub.activityId);
    if (!parent) return [];

    const conflicts = this.conflictsFor(parent.objectiveId, { step: sub, sessions });
    if (conflicts.length > 0) return conflicts;

    this.subActivitiesSignal.update(apply);
    if (sessions) this.replaceSessions(sub.executionPlan.id, sessions);
    if (reopenParents) this.reopenAncestors('step', sub.id); // RN-53
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

  /** Estado del último guardado; `null` hasta cargar los datos. */
  private snapshot: Snapshot | null = null;

  private takeSnapshot(): Snapshot {
    const nodes: TreeNode[] = [
      ...this.goalsSignal(), ...this.objectivesSignal(), ...this.activitiesSignal(), ...this.subActivitiesSignal(),
    ];
    const children = new Map<string, string[]>();
    const link = (parentId: string, childId: string) => children.set(parentId, [...(children.get(parentId) ?? []), childId]);
    this.objectivesSignal().forEach(o => link(o.goalId, o.id));
    this.activitiesSignal().forEach(a => link(a.objectiveId, a.id));
    this.subActivitiesSignal().forEach(s => link(s.activityId, s.id));
    return {
      progress: new Map(nodes.map(n => [n.id, n.progress])),
      closed: new Set(nodes.filter(n => n.closure).map(n => n.id)),
      children,
    };
  }

  /**
   * Recalcula todo el árbol de abajo hacia arriba: paso → tarea → objetivo → meta (RN-30 a RN-36).
   * - Avance: cada padre suma las sesiones de sus ítems ejecutables (RN-35).
   * - Cierres automáticos (RN-58, RN-77, RN-78): por fecha límite al recalcular; por sesiones completas y por hijos
   *   cerrados solo si cambiaron desde el último guardado, para no volver a cerrar lo que el usuario reabrió.
   * - Estado: cerrado, en pausa efectiva por él o por un padre, o abierto (RN-31, RN-57).
   * Es la única función de recálculo: se ejecuta tras cada mutación.
   */
  private cascade() {
    const today = DateUtils.getTodayISO();
    const prev = this.snapshot ?? this.takeSnapshot();
    const byPlan = new Map<string, ExecutionSession[]>();
    for (const session of this.sessionsSignal()) {
      byPlan.set(session.planId, [...(byPlan.get(session.planId) ?? []), session]);
    }
    const sessionsOfPlan = (planId: string | undefined) => (planId && byPlan.get(planId)) || [];

    const goalsById = new Map(this.goalsSignal().map(g => [g.id, g]));
    const objectivesById = new Map(this.objectivesSignal().map(o => [o.id, o]));
    const activitiesById = new Map(this.activitiesSignal().map(a => [a.id, a]));
    /** Deadline efectivo de una tarea (RN-48); `null` si no tiene objetivo. */
    const limitOf = (activity: Activity | undefined): string | null => {
      const objective = activity && objectivesById.get(activity.objectiveId);
      return activity && objective ? effectiveActivityDeadline(activity, objective) : null;
    };
    const closeByDeadline = (closure: ItemClosure | undefined, deadline: string | null) =>
      deadline ? deadlineClosure(closure, deadline, today) : closure;
    /** Cierres de los padres de una tarea: el de su objetivo y el de su meta. */
    const closuresAbove = (activity: Activity | undefined) => {
      const objective = activity && objectivesById.get(activity.objectiveId);
      return [objective?.closure, objective && goalsById.get(objective.goalId)?.closure];
    };

    /**
     * Tarea simple o paso: por sesiones completas al cambiar su avance y luego por fecha límite (RN-77).
     * Bajar de 100 % no lo reabre si un padre sigue cerrado a mano o por fecha límite.
     */
    const leafClosure = (
      id: string, closure: ItemClosure | undefined, progress: number, deadline: string | null,
      above: (ItemClosure | undefined)[],
    ) => {
      let next = sessionsDoneClosure(closure, prev.progress.get(id) ?? progress, progress, today);
      if (!next && closure && above.some(c => c && c.type !== ClosureType.CHILDREN_CLOSED)) next = closure;
      return closeByDeadline(next, deadline);
    };

    /**
     * Padre (RN-78): se cierra cuando se cierra o se borra su último hijo abierto; un cierre por hijos cerrados
     * se deshace en cuanto vuelve a tener un hijo abierto (RN-77).
     */
    const parentClosure = (id: string, closure: ItemClosure | undefined, kids: { id: string; closure?: ItemClosure }[]) => {
      const anyOpen = kids.some(k => !k.closure);
      if (closure) return closure.type === ClosureType.CHILDREN_CLOSED && anyOpen ? undefined : closure;
      if (kids.length === 0 || anyOpen) return undefined;
      const ids = new Set(kids.map(k => k.id));
      const childJustClosed = kids.some(k => !prev.closed.has(k.id));
      const openChildRemoved = (prev.children.get(id) ?? []).some(k => !ids.has(k) && !prev.closed.has(k));
      return childJustClosed || openChildRemoved ? { type: ClosureType.CHILDREN_CLOSED, closedOn: today } : undefined;
    };

    const steps = this.subActivitiesSignal().map(s => {
      const activity = activitiesById.get(s.activityId);
      const parentLimit = limitOf(activity);
      const progress = computeProgress(sessionsOfPlan(s.executionPlan.id));
      const closure = leafClosure(s.id, s.closure, progress, parentLimit ? effectiveDeadline(s, parentLimit) : null,
        [activity?.closure, ...closuresAbove(activity)]);
      return { ...s, closure, progress };
    });

    /** Sesiones de los ítems ejecutables de una tarea: las de su plan o las de sus pasos. */
    const sessionsOfActivity = (a: Activity) => a.type === ActivityType.COMPOSITE
      ? steps.filter(s => s.activityId === a.id).flatMap(s => sessionsOfPlan(s.executionPlan.id))
      : sessionsOfPlan(a.executionPlan?.id);

    const activities = this.activitiesSignal().map(a => {
      const own = sessionsOfActivity(a);
      const progress = computeProgress(own);
      const closure = a.type === ActivityType.COMPOSITE
        ? parentClosure(a.id, closeByDeadline(a.closure, limitOf(a)), steps.filter(s => s.activityId === a.id))
        : leafClosure(a.id, a.closure, progress, limitOf(a), closuresAbove(a));
      return { ...a, closure, progress, totalTimeRequiredMin: plannedMinutesOf(own) };
    });

    const sessionsOfObjective = (id: string) => activities.filter(a => a.objectiveId === id).flatMap(sessionsOfActivity);

    const objectives = this.objectivesSignal().map(o => ({
      ...o,
      closure: parentClosure(o.id, closeByDeadline(o.closure, o.deadline), activities.filter(a => a.objectiveId === o.id)),
      progress: computeProgress(sessionsOfObjective(o.id)),
    }));

    const goals = this.goalsSignal().map(g => {
      const own = objectives.filter(o => o.goalId === g.id);
      // RN-55: la idea pasa a OPEN cuando tiene horizonte y ya tiene tareas. Una idea no se cierra.
      const hasTasks = activities.some(a => own.some(o => o.id === a.objectiveId));
      const isIdea = g.status === GoalStatus.IDEA && !(g.horizon && hasTasks);
      const closure = isIdea ? undefined : parentClosure(g.id, g.closure, own);
      const status = isIdea ? GoalStatus.IDEA : deriveStatus(closure, hasOpenPause(g.pauses), GoalStatus);
      return { ...g, closure, status, progress: computeProgress(own.flatMap(o => sessionsOfObjective(o.id))) };
    });

    // Estado con la pausa efectiva: la propia o la de cualquier padre (RN-31, RN-57).
    const pausesOf = new Map<string, (PausePeriod[] | undefined)[]>();
    for (const g of goals) pausesOf.set(g.id, [g.pauses]);
    for (const o of objectives) pausesOf.set(o.id, [...(pausesOf.get(o.goalId) ?? []), o.pauses]);
    for (const a of activities) pausesOf.set(a.id, [...(pausesOf.get(a.objectiveId) ?? []), a.pauses]);
    for (const s of steps) pausesOf.set(s.id, [...(pausesOf.get(s.activityId) ?? []), s.pauses]);
    const paused = (id: string) => isEffectivelyPaused(pausesOf.get(id) ?? []);

    this.subActivitiesSignal.set(steps.map(s => ({ ...s, status: deriveStatus(s.closure, paused(s.id), SubActivityStatus) })));
    this.activitiesSignal.set(activities.map(a => ({ ...a, status: deriveStatus(a.closure, paused(a.id), ActivityStatus) })));
    this.objectivesSignal.set(objectives.map(o => ({ ...o, status: deriveStatus(o.closure, paused(o.id), ObjectiveStatus) })));
    this.goalsSignal.set(goals);
  }

  /** Recalcula la cascada, guarda la instantánea de este estado y persiste. Se llama una vez por mutación. */
  private commit() {
    this.cascade();
    this.snapshot = this.takeSnapshot();
    this.dataProvider.saveGoals(this.goalsSignal()).subscribe();
    this.dataProvider.saveObjectives(this.objectivesSignal()).subscribe();
    this.dataProvider.saveActivities(this.activitiesSignal()).subscribe();
    this.dataProvider.saveSubActivities(this.subActivitiesSignal()).subscribe();
    this.dataProvider.saveSessions(this.sessionsSignal()).subscribe();
    this.dataProvider.saveWorkLogs(this.workLogsSignal()).subscribe();
  }
}

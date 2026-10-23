import { Injectable, signal, computed, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DataProvider } from '../providers/data.provider';
import { Goal, GoalStatus } from '../models/goal.model';
import { Objective, ObjectiveStatus } from '../models/objective.model';
import {
  Activity,
  ActivityStatus,
  ActivityType,
  ExecutionPlan,
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
  averageProgress,
  canCloseObjective,
  effectiveActivityDeadline,
  effectiveDeadline,
  computeProgress,
  deriveRecurrence,
  deriveStatus,
  deriveSubActivityStatus,
  isFutureDate,
  isValidISODate,
  plannedMinutesOf,
  reopenIfBelowComplete,
  validateDeadlines,
} from '../rules';

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

  /**
   * Tareas cuyas sesiones se muestran (RN-29, RN-66): excluye las de metas PAUSED/IDEA y las tareas PAUSED.
   * Única fuente de visibilidad: la usan la agenda de hoy y el calendario, para que nunca difieran.
   */
  private visibleActivityIds = computed<Set<string>>(() => {
    const goals = this.goalsSignal();
    const objectives = this.objectivesSignal();

    return new Set(this.activitiesSignal().filter(activity => {
      if (activity.status === ActivityStatus.PAUSED) return false;
      const objective = objectives.find(o => o.id === activity.objectiveId);
      const goal = goals.find(g => g.id === objective?.goalId);
      return !!goal && goal.status === GoalStatus.ACTIVE;
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
    const visible = this.visibleActivityIds();
    const owners = this.planOwners();
    const logs = this.workLogsSignal();
    const items: AgendaItem[] = [];

    for (const session of this.sessionsSignal()) {
      const owner = owners.get(session.planId);
      if (session.scheduledDate !== date || !owner || !visible.has(owner.activity.id)) continue;

      const isCompleted = session.status === SessionStatus.DONE;
      items.push({
        id: owner.id,
        title: owner.title,
        sourceType: owner.sourceType,
        parentId: owner.step ? owner.activity.id : null,
        isCompleted,
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

  /** Devuelve los conflictos de deadline (RN-49); si hay alguno, no se guarda. */
  updateObjective(updated: Objective): DeadlineConflict[] {
    const conflicts = this.conflictsFor(updated.id, { objective: updated });
    if (conflicts.length > 0) return conflicts;

    this.objectivesSignal.update(obs => obs.map(o => o.id === updated.id ? updated : o));
    this.commit();
    return [];
  }

  /** Cierra el objetivo solo si está activo y al 100% (RN-63). Devuelve si se cerró. */
  closeObjective(id: string): boolean {
    const objective = this.objectivesSignal().find(o => o.id === id);
    if (!objective || !canCloseObjective(objective)) return false;

    this.objectivesSignal.update(obs =>
      obs.map(o => o.id === id ? { ...o, status: ObjectiveStatus.COMPLETED } : o));
    this.commit();
    return true;
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
   * Devuelve los conflictos de deadline (RN-48/49); si hay alguno, no se guarda.
   */
  updateActivity(updated: Activity, sessions?: ExecutionSession[]): DeadlineConflict[] {
    const previous = this.activitiesSignal().find(a => a.id === updated.id);
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

  deleteActivity(id: string) {
    this.removeActivities([id]);
    this.commit();
  }

  // --- PASOS ---

  /** Devuelve los conflictos de deadline (RN-48/49); si hay alguno, no se guarda. */
  addSubActivity(sub: SubActivity, sessions: ExecutionSession[] = []): DeadlineConflict[] {
    return this.saveSubActivity(sub, sessions, subs => [...subs, sub]);
  }

  /** `sessions`, si se indica, reemplaza las del plan del paso. */
  updateSubActivity(updated: SubActivity, sessions?: ExecutionSession[]): DeadlineConflict[] {
    return this.saveSubActivity(updated, sessions, subs => subs.map(s => s.id === updated.id ? updated : s));
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
   * Las fechas futuras, sin sesión o con minutos no válidos se ignoran.
   * Un día ya cerrado no se actualiza solo: se recalcula al volver a cerrarlo (RN-44).
   */
  toggleTaskExecution(id: string, sourceType: TaskSourceType, minutes?: number, date = this.selectedDateSignal()) {
    if (isFutureDate(date, DateUtils.getTodayISO())) return;
    if (minutes !== undefined && !this.isValidMinutes(minutes)) return;

    const plan = this.planOf(id, sourceType);
    const session = plan && this.sessionsSignal().find(s => s.planId === plan.id && s.scheduledDate === date);
    if (!session) return;

    if (session.status === SessionStatus.DONE) {
      this.updateSession(session.id, { status: SessionStatus.PLANNED, completedAt: undefined });
      this.workLogsSignal.update(logs => logs.filter(l => l.sessionId !== session.id));
    } else {
      this.updateSession(session.id, { status: SessionStatus.DONE, completedAt: new Date().toISOString() });
      this.workLogsSignal.update(logs => [...logs, {
        id: crypto.randomUUID(), sourceType, sourceId: id, date, minutes: minutes ?? session.plannedMinutes, sessionId: session.id,
      }]);
    }
    this.commit();
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
    const metrics = this.metricsOf(this.agendaFor(date), date);
    const existing = this.recordsSignal().find(r => r.date === date);

    const record: DailyRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      date,
      plannedItems: metrics.total,
      completedItems: metrics.completed,
      executionPercentage: metrics.percentage,
      plannedTimeMin: metrics.plannedTimeMin,
      executedTimeMin: metrics.executedTimeMin,
      notes,
      createdAt: new Date(),
    };

    this.recordsSignal.update(records => existing
      ? records.map(r => r.date === date ? record : r)
      : [...records, record]);
    this.dataProvider.saveRecords(this.recordsSignal()).subscribe();
    return record;
  }

  // --- INTERNOS ---

  private stepsOf(activityId: string): SubActivity[] {
    return this.subActivitiesSignal().filter(s => s.activityId === activityId);
  }

  private setGoalStatus(id: string, from: GoalStatus, to: GoalStatus) {
    const goal = this.goalsSignal().find(g => g.id === id);
    if (goal?.status !== from) return;
    this.goalsSignal.update(goals => goals.map(g => g.id === id ? { ...g, status: to } : g));
    this.commit();
  }

  private setActivityStatus(id: string, status: ActivityStatus) {
    this.activitiesSignal.update(acts => acts.map(a => a.id === id ? { ...a, status } : a));
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
   * Recalcula todo el árbol de abajo hacia arriba: paso → tarea → objetivo → meta (RN-30 a RN-36).
   * Es la única función de recálculo: se ejecuta tras cada mutación.
   */
  private cascade() {
    const byPlan = new Map<string, ExecutionSession[]>();
    for (const session of this.sessionsSignal()) {
      byPlan.set(session.planId, [...(byPlan.get(session.planId) ?? []), session]);
    }
    const sessionsOfPlan = (planId: string) => byPlan.get(planId) ?? [];

    const steps = this.subActivitiesSignal().map(s => {
      const progress = computeProgress(sessionsOfPlan(s.executionPlan.id));
      return { ...s, progress, status: deriveSubActivityStatus(progress) };
    });

    const activities = this.activitiesSignal().map(a => {
      if (a.type === ActivityType.COMPOSITE) {
        const own = steps.filter(s => s.activityId === a.id);
        const progress = averageProgress(own.map(s => s.progress));
        return {
          ...a,
          progress,
          status: deriveStatus(progress, a.status),
          totalTimeRequiredMin: own.reduce((sum, s) => sum + plannedMinutesOf(sessionsOfPlan(s.executionPlan.id)), 0),
        };
      }
      const ownSessions = a.executionPlan ? sessionsOfPlan(a.executionPlan.id) : [];
      const progress = computeProgress(ownSessions);
      return {
        ...a,
        progress,
        status: deriveStatus(progress, a.status),
        totalTimeRequiredMin: plannedMinutesOf(ownSessions),
      };
    });

    const objectives = this.objectivesSignal().map(o => {
      const progress = averageProgress(activities.filter(a => a.objectiveId === o.id).map(a => a.progress));
      return { ...o, progress, status: reopenIfBelowComplete({ status: o.status, progress }) };
    });

    const goals = this.goalsSignal().map(g => {
      const progress = averageProgress(objectives.filter(o => o.goalId === g.id).map(o => o.progress));
      // RN-55: la idea pasa a ACTIVE cuando tiene horizonte y ya tiene tareas.
      const hasTasks = activities.some(a => objectives.some(o => o.id === a.objectiveId && o.goalId === g.id));
      const status = g.status === GoalStatus.IDEA && g.horizon && hasTasks ? GoalStatus.ACTIVE : g.status;
      return { ...g, progress, status };
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

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
import { AgendaItem } from '../models/agenda-item.model';
import { DeletableType, DeletionImpact, TypeChangeImpact } from '../models/deletion-impact.model';
import { DateUtils } from '../utils/date.utils';
import {
  DeadlineConflict,
  averageProgress,
  canCloseObjective,
  computeProgress,
  deriveRecurrence,
  deriveStatus,
  deriveSubActivityStatus,
  reopenIfBelowComplete,
  validateDeadlines,
} from '../rules';

const totalTimeMin = (plan: ExecutionPlan | null): number =>
  plan ? (plan.dates?.length ?? 0) * plan.durationPerExecutionMin : 0;

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
      records: this.dataProvider.getRecords(),
    }).subscribe(data => {
      this.goalsSignal.set(data.goals);
      this.objectivesSignal.set(data.objectives);
      this.activitiesSignal.set(data.activities);
      this.subActivitiesSignal.set(data.subActivities);
      this.recordsSignal.set(data.records);
    });
  }

  // --- SELECTORES PÚBLICOS ---
  public goals = this.goalsSignal.asReadonly();
  public objectives = this.objectivesSignal.asReadonly();
  public activities = this.activitiesSignal.asReadonly();
  public subActivities = this.subActivitiesSignal.asReadonly();
  public records = this.recordsSignal.asReadonly();

  /** Agenda de hoy (RN-25 a RN-29): excluye metas PAUSED/IDEA y tareas PAUSED. */
  public todaysTasks = computed<AgendaItem[]>(() => {
    const today = DateUtils.getTodayISO();
    const goals = this.goalsSignal();
    const objectives = this.objectivesSignal();
    const activities = this.activitiesSignal();

    const isVisible = (activity: Activity): boolean => {
      if (activity.status === ActivityStatus.PAUSED) return false;
      const objective = objectives.find(o => o.id === activity.objectiveId);
      const goal = goals.find(g => g.id === objective?.goalId);
      return !!goal && goal.status === GoalStatus.ACTIVE;
    };

    const items: AgendaItem[] = [];

    for (const act of activities) {
      const plan = act.executionPlan;
      if (act.type === ActivityType.SIMPLE && plan?.dates?.includes(today) && isVisible(act)) {
        items.push({
          id: act.id,
          title: act.title,
          estimatedDurationMin: plan.durationPerExecutionMin,
          isCompleted: plan.completedDates.includes(today),
          sourceType: TaskSourceType.ACTIVITY,
          parentId: null,
        });
      }
    }

    for (const sub of this.subActivitiesSignal()) {
      const parent = activities.find(a => a.id === sub.activityId);
      if (parent && sub.executionPlan.dates?.includes(today) && isVisible(parent)) {
        items.push({
          id: sub.id,
          title: sub.title,
          estimatedDurationMin: sub.executionPlan.durationPerExecutionMin,
          isCompleted: sub.executionPlan.completedDates.includes(today),
          sourceType: TaskSourceType.SUBACTIVITY,
          parentId: sub.activityId,
        });
      }
    }

    return items;
  });

  public todaysMetrics = computed(() => {
    const tasks = this.todaysTasks();
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    const plannedTimeMin = tasks.reduce((acc, t) => acc + t.estimatedDurationMin, 0);
    const executedTimeMin = tasks.filter(t => t.isCompleted).reduce((acc, t) => acc + t.estimatedDurationMin, 0);
    return { total, completed, percentage, remaining: total - completed, plannedTimeMin, executedTimeMin };
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

  /** Devuelve los conflictos de deadline (RN-48/49); si hay alguno, no se guarda. */
  addActivity(activity: Activity): DeadlineConflict[] {
    const candidate = this.normalizeActivity(activity);
    const conflicts = this.conflictsFor(candidate.objectiveId, { activity: candidate });
    if (conflicts.length > 0) return conflicts;

    this.activitiesSignal.update(a => [...a, candidate]);
    this.commit();
    return [];
  }

  /**
   * Guarda la tarea. Si cambia de tipo (RN-39, RN-40): compuesta → simple elimina sus pasos;
   * simple → compuesta descarta su plan. La confirmación previa es del llamador (`typeChangeImpact`).
   * Devuelve los conflictos de deadline (RN-48/49); si hay alguno, no se guarda.
   */
  updateActivity(updated: Activity): DeadlineConflict[] {
    const candidate = this.normalizeActivity(updated);
    const keepsSteps = candidate.type === ActivityType.COMPOSITE;

    const conflicts = this.conflictsFor(candidate.objectiveId, {
      activity: candidate,
      dropStepsOf: keepsSteps ? undefined : candidate.id, // pasar a simple elimina sus pasos
    });
    if (conflicts.length > 0) return conflicts;

    if (!keepsSteps) {
      this.subActivitiesSignal.update(subs => subs.filter(s => s.activityId !== candidate.id));
    }
    this.activitiesSignal.update(acts => acts.map(a => a.id === candidate.id ? candidate : a));
    this.commit();
    return [];
  }

  /** Datos que se perderían al cambiar la tarea a `newType` (RN-39, RN-40). */
  typeChangeImpact(activityId: string, newType: ActivityType): TypeChangeImpact {
    const activity = this.activitiesSignal().find(a => a.id === activityId);
    const none: TypeChangeImpact = {
      stepsToDelete: 0, sessionsToLose: 0, completedSessionsToLose: 0, needsConfirmation: false,
    };
    if (!activity || activity.type === newType) return none;

    if (newType === ActivityType.SIMPLE) {
      const stepsToDelete = this.stepsOf(activityId).length;
      return { ...none, stepsToDelete, needsConfirmation: stepsToDelete > 0 };
    }

    const sessionsToLose = activity.executionPlan?.dates?.length ?? 0;
    const completedSessionsToLose = activity.executionPlan?.completedDates.length ?? 0;
    return {
      ...none,
      sessionsToLose,
      completedSessionsToLose,
      needsConfirmation: sessionsToLose > 0 || completedSessionsToLose > 0,
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
  addSubActivity(sub: SubActivity): DeadlineConflict[] {
    return this.saveSubActivity(sub, subs => [...subs, sub]);
  }

  updateSubActivity(updated: SubActivity): DeadlineConflict[] {
    return this.saveSubActivity(updated, subs => subs.map(s => s.id === updated.id ? updated : s));
  }

  deleteSubActivity(id: string) {
    this.subActivitiesSignal.update(subs => subs.filter(s => s.id !== id));
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

  /** Marca o desmarca la sesión de HOY (RN-27). */
  toggleTaskExecution(id: string, sourceType: TaskSourceType) {
    const today = DateUtils.getTodayISO();
    const toggle = (plan: ExecutionPlan): ExecutionPlan => {
      const done = plan.completedDates.includes(today);
      return {
        ...plan,
        completedDates: done ? plan.completedDates.filter(d => d !== today) : [...plan.completedDates, today],
      };
    };

    if (sourceType === TaskSourceType.ACTIVITY) {
      this.activitiesSignal.update(acts => acts.map(a =>
        a.id === id && a.executionPlan ? { ...a, executionPlan: toggle(a.executionPlan) } : a));
    } else {
      this.subActivitiesSignal.update(subs => subs.map(s =>
        s.id === id ? { ...s, executionPlan: toggle(s.executionPlan) } : s));
    }
    this.commit();
  }

  /** Cierra el día. Un registro por fecha: si ya existe, se reemplaza (RN-43). */
  closeDay(notes: string): DailyRecord {
    const metrics = this.todaysMetrics();
    const date = DateUtils.getTodayISO();
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
  private normalizeActivity(activity: Activity): Activity {
    const plan = activity.type === ActivityType.COMPOSITE ? null : activity.executionPlan;
    return { ...activity, executionPlan: plan, recurrence: deriveRecurrence(activity.type, plan) };
  }

  /**
   * Valida los deadlines del objetivo con el cambio candidato aplicado (RN-48, RN-49, RN-65).
   * `dropStepsOf`: tarea cuyos pasos se van a eliminar y no deben validarse.
   */
  private conflictsFor(
    objectiveId: string,
    change: { objective?: Objective; activity?: Activity; step?: SubActivity; dropStepsOf?: string },
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

    return validateDeadlines(objective, activities, steps);
  }

  private saveSubActivity(sub: SubActivity, apply: (subs: SubActivity[]) => SubActivity[]): DeadlineConflict[] {
    const parent = this.activitiesSignal().find(a => a.id === sub.activityId);
    if (!parent) return [];

    const conflicts = this.conflictsFor(parent.objectiveId, { step: sub });
    if (conflicts.length > 0) return conflicts;

    this.subActivitiesSignal.update(apply);
    this.commit();
    return [];
  }

  private removeActivities(ids: string[]) {
    this.subActivitiesSignal.update(subs => subs.filter(s => !ids.includes(s.activityId)));
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
    const steps = this.subActivitiesSignal().map(s => {
      const progress = computeProgress(s.executionPlan);
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
          totalTimeRequiredMin: own.reduce((sum, s) => sum + totalTimeMin(s.executionPlan), 0),
        };
      }
      const progress = computeProgress(a.executionPlan);
      return {
        ...a,
        progress,
        status: deriveStatus(progress, a.status),
        totalTimeRequiredMin: totalTimeMin(a.executionPlan),
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
  }
}

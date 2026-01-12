import { Injectable, signal, computed, inject } from '@angular/core';
import { DataProvider } from '../providers/data.provider';
import { Goal } from '../models/goal.model';
import { Objective } from '../models/objective.model';
import { Activity, SubActivity } from '../models/activity.model';
import { DailyRecord } from '../models/daily-record.model';
import { DateUtils } from '../utils/date.utils';

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
    this.dataProvider.getGoals().subscribe(goals => {
      this.goalsSignal.set(goals);
      
      this.dataProvider.getObjectives().subscribe(objectives => {
        this.objectivesSignal.set(objectives);
        
        this.dataProvider.getActivities().subscribe(activities => {
          this.activitiesSignal.set(activities);
          
          this.dataProvider.getSubActivities().subscribe(subs => {
            this.subActivitiesSignal.set(subs);
            
            this.dataProvider.getRecords().subscribe(records => {
              this.recordsSignal.set(records);
              
              // EJECUTAR MIGRACIÓN V1 -> V2 si es necesario
              this.checkAndMigrate();
            });
          });
        });
      });
    });
  }

  /**
   * Migración V1 -> V2
   * 1. Si hay actividades sin objectiveId, crear objetivo "General" por Meta y reasignarlas.
   * 2. Mapear niveles legacy a Priority/Criticality.
   */
  private checkAndMigrate() {
    let changed = false;
    const goals = this.goalsSignal();
    const currentObjectives = [...this.objectivesSignal()];
    const currentActivities = [...this.activitiesSignal()];

    // 1. Crear objetivos generales para metas que no tengan objetivos
    goals.forEach(goal => {
      const hasObjectives = currentObjectives.some(o => o.goalId === goal.id);
      if (!hasObjectives) {
        const defaultObjective: Objective = {
          id: crypto.randomUUID(),
          goalId: goal.id,
          title: 'General',
          nature: 'otro',
          progress: 0,
          status: 'activa',
          createdAt: new Date()
        };
        currentObjectives.push(defaultObjective);
        changed = true;

        // Reasignar actividades que antes colgaban de la meta directamente (V1)
        currentActivities.forEach((act, index) => {
          if ((act as any).goalId === goal.id) {
            currentActivities[index] = {
              ...act,
              objectiveId: defaultObjective.id,
              // Mapeo de niveles legacy a V2
              priority: this.mapLegacyPriority((act as any).level),
              criticality: this.mapLegacyCriticality((act as any).level),
              complexity: (act as any).complexity || 'media',
              recurrence: this.mapLegacyRecurrence((act as any).executionPlan?.type)
            } as Activity;
            delete (currentActivities[index] as any).goalId;
            delete (currentActivities[index] as any).level;
          }
        });
      }
    });

    if (changed) {
      this.objectivesSignal.set(currentObjectives);
      this.activitiesSignal.set(currentActivities);
      this.saveAll();
      // Recalcular todo el árbol de progreso después de migrar
      this.recalculateAllHierarchy();
    }
  }

  private mapLegacyPriority(level: string): any {
    if (level === 'urgente_directo' || level === 'urgente_sistemico') return 'alta';
    if (level === 'sistema' || level === 'progreso') return 'media';
    return 'baja';
  }

  private mapLegacyCriticality(level: string): any {
    if (level === 'urgente_directo') return 'vital';
    if (level === 'urgente_sistemico' || level === 'sistema') return 'esencial_recurrente';
    return 'flexible';
  }

  private mapLegacyRecurrence(planType: string): any {
    if (planType === 'patron_repetitivo') return 'patron_semanal';
    if (planType === 'fechas_especificas') return 'fechas_especificas';
    return 'unica';
  }

  private recalculateAllHierarchy() {
    // 1. SubActivities a Activities
    const activities = this.activitiesSignal().map(act => {
      if (act.type === 'compuesta') {
        const subs = this.subActivitiesSignal().filter(s => s.activityId === act.id);
        const progress = subs.length > 0 ? Math.round(subs.reduce((acc, s) => acc + s.progress, 0) / subs.length) : 0;
        return { ...act, progress, status: (progress >= 100 ? 'completada' : 'en_progreso') as any };
      }
      return act;
    });
    this.activitiesSignal.set(activities);

    // 2. Activities a Objectives
    const objectives = this.objectivesSignal().map(obj => {
      const acts = activities.filter(a => a.objectiveId === obj.id);
      const progress = acts.length > 0 ? Math.round(acts.reduce((acc, a) => acc + a.progress, 0) / acts.length) : 0;
      return { ...obj, progress };
    });
    this.objectivesSignal.set(objectives);

    // 3. Objectives a Goals
    const goals = this.goalsSignal().map(goal => {
      const objs = objectives.filter(o => o.goalId === goal.id);
      const progress = objs.length > 0 ? Math.round(objs.reduce((acc, o) => acc + o.progress, 0) / objs.length) : 0;
      return { ...goal, progress };
    });
    this.goalsSignal.set(goals);
    
    this.saveAll();
  }

  // --- SELECTORES PÚBLICOS ---
  public goals = this.goalsSignal.asReadonly();
  public objectives = this.objectivesSignal.asReadonly();
  public activities = this.activitiesSignal.asReadonly();
  public subActivities = this.subActivitiesSignal.asReadonly();

  public todaysTasks = computed(() => {
    const today = DateUtils.getTodayISO();
    const allActs = this.activitiesSignal();
    const allSubs = this.subActivitiesSignal();
    const tasksForToday: any[] = [];

    // Tareas simples
    allActs.forEach(act => {
      if (act.type === 'simple' && act.executionPlan?.dates?.includes(today)) {
        tasksForToday.push({
          id: act.id,
          title: act.title,
          estimatedDurationMin: act.executionPlan.durationPerExecutionMin,
          isCompleted: act.executionPlan.completedDates.includes(today),
          sourceType: 'activity',
          parentId: null
        });
      }
    });

    // Pasos (Subactivities)
    allSubs.forEach(sub => {
      if (sub.executionPlan.dates?.includes(today)) {
        tasksForToday.push({
          id: sub.id,
          title: sub.title,
          estimatedDurationMin: sub.executionPlan.durationPerExecutionMin,
          isCompleted: sub.executionPlan.completedDates.includes(today),
          sourceType: 'subactivity',
          parentId: sub.activityId
        });
      }
    });

    return tasksForToday;
  });

  public todaysMetrics = computed(() => {
    const tasks = this.todaysTasks();
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percentage, remaining: total - completed };
  });

  // --- CRUD ACTIONS ---

  addGoal(goal: Goal) {
    this.goalsSignal.update(g => [...g, goal]);
    this.saveAll();
  }

  updateGoal(updated: Goal) {
    this.goalsSignal.update(goals => goals.map(g => g.id === updated.id ? updated : g));
    this.saveAll();
  }

  deleteGoal(id: string) {
    const objectivesToDelete = this.objectivesSignal().filter(o => o.goalId === id);
    objectivesToDelete.forEach(obj => this.deleteObjective(obj.id));
    this.goalsSignal.update(goals => goals.filter(g => g.id !== id));
    this.saveAll();
  }

  addObjective(objective: Objective) {
    this.objectivesSignal.update(o => [...o, objective]);
    this.updateGoalProgress(objective.goalId);
    this.saveAll();
  }

  updateObjective(updated: Objective) {
    this.objectivesSignal.update(obs => obs.map(o => o.id === updated.id ? updated : o));
    this.updateGoalProgress(updated.goalId);
    this.saveAll();
  }

  deleteObjective(id: string) {
    const objective = this.objectivesSignal().find(o => o.id === id);
    if (!objective) return;

    this.activitiesSignal().filter(a => a.objectiveId === id).forEach(act => this.deleteActivity(act.id));
    this.objectivesSignal.update(obs => obs.filter(o => o.id !== id));
    this.updateGoalProgress(objective.goalId);
    this.saveAll();
  }

  addActivity(activity: Activity) {
    this.activitiesSignal.update(a => [...a, activity]);
    this.updateObjectiveProgress(activity.objectiveId);
    this.saveAll();
  }

  updateActivity(updated: Activity) {
    this.activitiesSignal.update(acts => acts.map(a => a.id === updated.id ? updated : a));
    this.updateObjectiveProgress(updated.objectiveId);
    this.saveAll();
  }

  /**
   * Elimina todos los pasos asociados a una tarea.
   * Útil cuando una tarea compuesta se convierte en simple.
   */
  deleteSubActivitiesByActivityId(activityId: string) {
    this.subActivitiesSignal.update(s => s.filter(sub => sub.activityId !== activityId));
    this.saveAll();
  }

  deleteActivity(id: string) {
    const activity = this.activitiesSignal().find(a => a.id === id);
    if (!activity) return;

    this.subActivitiesSignal.update(subs => subs.filter(s => s.activityId !== id));
    this.activitiesSignal.update(acts => acts.filter(a => a.id !== id));
    this.updateObjectiveProgress(activity.objectiveId);
    this.saveAll();
  }

  addSubActivity(sub: SubActivity) {
    this.subActivitiesSignal.update(s => [...s, sub]);
    this.updateActivityProgress(sub.activityId);
    this.saveAll();
  }

  updateSubActivity(updated: SubActivity) {
    this.subActivitiesSignal.update(subs => subs.map(s => s.id === updated.id ? updated : s));
    this.updateActivityProgress(updated.activityId);
    this.saveAll();
  }

  deleteSubActivity(id: string) {
    const sub = this.subActivitiesSignal().find(s => s.id === id);
    if (!sub) return;

    this.subActivitiesSignal.update(subs => subs.filter(s => s.id !== id));
    this.updateActivityProgress(sub.activityId);
    this.saveAll();
  }

  // --- PROGRESS CALCULATIONS ---

  toggleTaskExecution(id: string, sourceType: 'activity' | 'subactivity') {
    const today = DateUtils.getTodayISO();

    if (sourceType === 'activity') {
      this.activitiesSignal.update(acts => acts.map(a => {
        if (a.id === id && a.executionPlan) {
          const dates = a.executionPlan.completedDates;
          const isDone = dates.includes(today);
          const newDates = isDone ? dates.filter(d => d !== today) : [...dates, today];
          const totalExecutions = a.executionPlan.dates?.length || 0;
          const progress = DateUtils.calculateProgress(totalExecutions, newDates.length);
          const status = (progress >= 100 ? 'completada' : 'en_progreso') as any;
          
          setTimeout(() => this.updateObjectiveProgress(a.objectiveId), 0);
          
          return { ...a, progress, status, executionPlan: { ...a.executionPlan, completedDates: newDates } };
        }
        return a;
      }));
    } else {
      this.subActivitiesSignal.update(subs => subs.map(s => {
        if (s.id === id) {
          const dates = s.executionPlan.completedDates;
          const isDone = dates.includes(today);
          const newDates = isDone ? dates.filter(d => d !== today) : [...dates, today];
          const totalExecutions = s.executionPlan.dates?.length || 0;
          const progress = DateUtils.calculateProgress(totalExecutions, newDates.length);
          const status = (progress >= 100 ? 'completada' : 'en_progreso') as any;

          setTimeout(() => this.updateActivityProgress(s.activityId), 0);

          return { ...s, progress, status, executionPlan: { ...s.executionPlan, completedDates: newDates } };
        }
        return subs.find(sub => sub.id === s.id) || s; // dummy
      }));
    }
    this.saveAll();
  }

  private updateActivityProgress(activityId: string) {
    const activity = this.activitiesSignal().find(a => a.id === activityId);
    if (!activity) return;

    const subs = this.subActivitiesSignal().filter(s => s.activityId === activityId);
    const progress = subs.length > 0 ? Math.round(subs.reduce((acc, s) => acc + s.progress, 0) / subs.length) : 0;
    const status = (progress >= 100 ? 'completada' : 'en_progreso') as any;

    this.activitiesSignal.update(acts => acts.map(a => a.id === activityId ? { ...a, progress, status } : a));
    this.updateObjectiveProgress(activity.objectiveId);
    this.saveAll();
  }

  private updateObjectiveProgress(objectiveId: string) {
    const objective = this.objectivesSignal().find(o => o.id === objectiveId);
    if (!objective) return;

    const acts = this.activitiesSignal().filter(a => a.objectiveId === objectiveId);
    const progress = acts.length > 0 ? Math.round(acts.reduce((acc, a) => acc + a.progress, 0) / acts.length) : 0;
    
    this.objectivesSignal.update(obs => obs.map(o => o.id === objectiveId ? { ...o, progress } : o));
    this.updateGoalProgress(objective.goalId);
    this.saveAll();
  }

  private updateGoalProgress(goalId: string) {
    const objs = this.objectivesSignal().filter(o => o.goalId === goalId);
    const progress = objs.length > 0 ? Math.round(objs.reduce((acc, o) => acc + o.progress, 0) / objs.length) : 0;
    
    this.goalsSignal.update(goals => goals.map(g => g.id === goalId ? { ...g, progress } : g));
    this.saveAll();
  }

  private saveAll() {
    this.dataProvider.saveGoals(this.goalsSignal()).subscribe();
    this.dataProvider.saveObjectives(this.objectivesSignal()).subscribe();
    this.dataProvider.saveActivities(this.activitiesSignal()).subscribe();
    this.dataProvider.saveSubActivities(this.subActivitiesSignal()).subscribe();
  }

  closeDay(notes: string) {
    const metrics = this.todaysMetrics();
    const tasks = this.todaysTasks();
    const executedTime = tasks.filter(t => t.isCompleted).reduce((acc, t) => acc + t.estimatedDurationMin, 0);

    const newRecord: DailyRecord = {
      id: crypto.randomUUID(),
      date: DateUtils.getTodayISO(),
      plannedItems: metrics.total,
      completedItems: metrics.completed,
      executionPercentage: metrics.percentage,
      plannedTimeMin: tasks.reduce((acc, t) => acc + t.estimatedDurationMin, 0),
      executedTimeMin: executedTime,
      notes: notes,
      createdAt: new Date()
    };

    this.recordsSignal.update(records => [...records, newRecord]);
    this.dataProvider.saveRecords(this.recordsSignal()).subscribe();
    return newRecord;
  }
}
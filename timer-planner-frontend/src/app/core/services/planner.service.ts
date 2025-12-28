import { Injectable, signal, computed, inject } from '@angular/core';
import { DataProvider } from '../providers/data.provider';
import { Goal } from '../models/goal.model';
import { Activity, SubActivity, ExecutionPlan } from '../models/activity.model';
import { DailyRecord } from '../models/daily-record.model';
import { DateUtils } from '../utils/date.utils';

@Injectable({
  providedIn: 'root'
})
export class PlannerService {
  private dataProvider = inject(DataProvider);

  // --- SIGNALS ---
  private goalsSignal = signal<Goal[]>([]);
  private activitiesSignal = signal<Activity[]>([]);
  private subActivitiesSignal = signal<SubActivity[]>([]);
  private recordsSignal = signal<DailyRecord[]>([]);

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    this.dataProvider.getGoals().subscribe(data => this.goalsSignal.set(data));
    this.dataProvider.getActivities().subscribe(data => this.activitiesSignal.set(data));
    this.dataProvider.getSubActivities().subscribe(data => this.subActivitiesSignal.set(data));
    this.dataProvider.getRecords().subscribe(data => this.recordsSignal.set(data));
  }

  // --- SELECTORES PÚBLICOS ---
  public goals = this.goalsSignal.asReadonly();
  public activities = this.activitiesSignal.asReadonly(); // Base
  public subActivities = this.subActivitiesSignal.asReadonly();

  // 1. ACTIVIDADES EXTENDIDAS (Visualización de totales calculados)
  // Nota: Este computed es para VISTA. El progreso real se actualiza en la BD en toggleTaskExecution.
  public extendedActivities = computed(() => {
    const acts = this.activitiesSignal();
    const subs = this.subActivitiesSignal();

    return acts.map(activity => {
      // Si es Compuesta, calculamos tiempo total sumando hijos
      if (activity.type === 'compuesta') {
        const children = subs.filter(s => s.activityId === activity.id);
        
        const totalTime = children.reduce((acc, child) => {
          const reps = child.executionPlan.dates?.length || 0;
          return acc + (child.executionPlan.durationPerExecutionMin * reps);
        }, 0);

        // Retornamos con el tiempo calculado (el progreso ya viene actualizado de la BD)
        return { ...activity, totalTimeRequiredMin: totalTime };
      }
      
      // Si es simple, calculamos tiempo total
      if (activity.type === 'simple' && activity.executionPlan) {
         const totalDates = activity.executionPlan.dates?.length || 0;
         const totalTime = (activity.executionPlan.durationPerExecutionMin || 0) * totalDates;
         return { ...activity, totalTimeRequiredMin: totalTime };
      }

      return activity;
    });
  });

  // 2. TAREAS DE HOY (Filtro Maestro)
  public todaysTasks = computed(() => {
    const today = DateUtils.getTodayISO();
    const allActs = this.activitiesSignal();
    const allSubs = this.subActivitiesSignal();

    const tasksForToday: any[] = [];

    // A. Actividades Simples
    allActs.forEach(act => {
      if (act.type === 'simple' && act.executionPlan?.dates?.includes(today)) {
        const isCompleted = act.executionPlan.completedDates.includes(today);
        tasksForToday.push({
          id: act.id,
          title: act.title,
          duration: act.executionPlan.durationPerExecutionMin,
          isCompleted: isCompleted,
          sourceType: 'activity',
          parentId: null
        });
      }
    });

    // B. Subactividades
    allSubs.forEach(sub => {
      if (sub.executionPlan.dates?.includes(today)) {
        const isCompleted = sub.executionPlan.completedDates.includes(today);
        tasksForToday.push({
          id: sub.id,
          title: sub.title,
          duration: sub.executionPlan.durationPerExecutionMin,
          isCompleted: isCompleted,
          sourceType: 'subactivity',
          parentId: sub.activityId
        });
      }
    });

    return tasksForToday;
  });

  // 3. MÉTRICAS
  public todaysMetrics = computed(() => {
    const tasks = this.todaysTasks();
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percentage, remaining: total - completed };
  });

  // --- ACCIONES CRUD ---

  addGoal(goal: Goal) {
    this.goalsSignal.update(g => [...g, goal]);
    this.saveAll();
  }

  addActivity(activity: Activity) {
    this.activitiesSignal.update(a => [...a, activity]);
    this.updateGoalProgress(activity.goalId); // Recalcular meta al añadir actividad
    this.saveAll();
  }

  addSubActivity(sub: SubActivity) {
    this.subActivitiesSignal.update(s => [...s, sub]);
    this.updateCompositeActivityProgress(sub.activityId); // Recalcular actividad al añadir paso
    this.saveAll();
  }

  // ==========================================
  // LÓGICA DE RECÁLCULO EN CADENA (BUBBLE UP)
  // ==========================================

  toggleTaskExecution(id: string, sourceType: 'activity' | 'subactivity') {
    const today = DateUtils.getTodayISO();

    // CASO 1: Es una Actividad SIMPLE
    if (sourceType === 'activity') {
      let goalIdToUpdate: string | null = null;

      this.activitiesSignal.update(acts => acts.map(a => {
        if (a.id === id && a.executionPlan) {
          goalIdToUpdate = a.goalId; // Guardamos ID para actualizar Meta luego

          // 1. Actualizar fechas completadas
          const dates = a.executionPlan.completedDates;
          const isDone = dates.includes(today);
          const newDates = isDone ? dates.filter(d => d !== today) : [...dates, today];

          // 2. Calcular Nuevo Progreso Matemático
          const totalExecutions = a.executionPlan.dates?.length || 0;
          const newProgress = DateUtils.calculateProgress(totalExecutions, newDates.length);
          
          const newStatus = newProgress >= 100 ? 'completada' : 'en_progreso';

          return { 
            ...a, 
            progress: newProgress,
            status: newStatus as any,
            executionPlan: { ...a.executionPlan, completedDates: newDates } 
          };
        }
        return a;
      }));

      // 3. Burbuja hacia arriba: Actualizar Meta
      if (goalIdToUpdate) this.updateGoalProgress(goalIdToUpdate);
    } 
    
    // CASO 2: Es una SUBACTIVIDAD
    else if (sourceType === 'subactivity') {
      let activityIdToUpdate: string | null = null;

      this.subActivitiesSignal.update(subs => subs.map(s => {
        if (s.id === id) {
          activityIdToUpdate = s.activityId; // Guardamos ID para actualizar Padre luego

          // 1. Actualizar fechas
          const dates = s.executionPlan.completedDates;
          const isDone = dates.includes(today);
          const newDates = isDone ? dates.filter(d => d !== today) : [...dates, today];

          // 2. Calcular Nuevo Progreso Propio
          const totalExecutions = s.executionPlan.dates?.length || 0;
          const newProgress = DateUtils.calculateProgress(totalExecutions, newDates.length);
          const newStatus = newProgress >= 100 ? 'completada' : 'en_progreso';

          return { 
            ...s, 
            progress: newProgress,
            status: newStatus as any,
            executionPlan: { ...s.executionPlan, completedDates: newDates } 
          };
        }
        return s;
      }));

      // 3. Burbuja hacia arriba: Subactividad -> Actividad -> Meta
      if (activityIdToUpdate) {
        this.updateCompositeActivityProgress(activityIdToUpdate);
      }
    }

    this.saveAll();
  }

  // --- HELPER: Actualizar progreso de Actividad Compuesta ---
  private updateCompositeActivityProgress(activityId: string) {
    const allSubs = this.subActivitiesSignal();
    const mySubs = allSubs.filter(s => s.activityId === activityId);
    let goalIdToUpdate: string | null = null;

    // Calcular promedio ponderado (simplificado: promedio simple de progresos)
    let totalProgress = 0;
    if (mySubs.length > 0) {
      const sum = mySubs.reduce((acc, sub) => acc + sub.progress, 0);
      totalProgress = Math.round(sum / mySubs.length);
    }

    this.activitiesSignal.update(acts => acts.map(a => {
      if (a.id === activityId) {
        goalIdToUpdate = a.goalId;
        const newStatus = totalProgress >= 100 ? 'completada' : 'en_progreso';
        return { ...a, progress: totalProgress, status: newStatus as any };
      }
      return a;
    }));

    // Siguiente nivel de burbuja: Actualizar Meta
    if (goalIdToUpdate) {
      this.updateGoalProgress(goalIdToUpdate);
    }
  }

  // --- HELPER: Actualizar progreso de Meta ---
  private updateGoalProgress(goalId: string) {
    const allActs = this.activitiesSignal();
    const myActs = allActs.filter(a => a.goalId === goalId);

    // Calcular promedio de actividades
    let goalProgress = 0;
    if (myActs.length > 0) {
      const sum = myActs.reduce((acc, act) => acc + act.progress, 0);
      goalProgress = Math.round(sum / myActs.length);
    }

    this.goalsSignal.update(goals => goals.map(g => {
      if (g.id === goalId) {
        return { ...g, progress: goalProgress };
      }
      return g;
    }));
  }

  // --- PERSISTENCIA ---
  private saveAll() {
    this.dataProvider.saveGoals(this.goalsSignal()).subscribe();
    this.dataProvider.saveActivities(this.activitiesSignal()).subscribe();
    this.dataProvider.saveSubActivities(this.subActivitiesSignal()).subscribe();
  }

  // Cierre del día (Simplificado)
  closeDay(notes: string) {
    const metrics = this.todaysMetrics();
    const tasks = this.todaysTasks();
    const executedTime = tasks.filter(t => t.isCompleted).reduce((acc, t) => acc + t.duration, 0);

    const newRecord: DailyRecord = {
      id: crypto.randomUUID(),
      date: DateUtils.getTodayISO(),
      plannedItems: metrics.total,
      completedItems: metrics.completed,
      executionPercentage: metrics.percentage,
      plannedTimeMin: tasks.reduce((acc, t) => acc + t.duration, 0),
      executedTimeMin: executedTime,
      notes: notes,
      createdAt: new Date()
    };

    this.recordsSignal.update(records => [...records, newRecord]);
    this.dataProvider.saveRecords(this.recordsSignal()).subscribe();
    return newRecord;
  }
}
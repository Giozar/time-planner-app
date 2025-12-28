import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { DataProvider } from '../providers/data.provider'; // Importamos la abstracción, no la implementación
import { Goal } from '../models/goal.model';
import { Activity, SubActivity } from '../models/activity.model';
import { DailyRecord } from '../models/daily-record.model';

@Injectable({
  providedIn: 'root'
})
export class PlannerService {
  // Inyectamos el contrato abstracto
  private dataProvider = inject(DataProvider);

  // --- ESTADO (Signals inicializados vacíos) ---
  private goalsSignal = signal<Goal[]>([]);
  private activitiesSignal = signal<Activity[]>([]);
  private subActivitiesSignal = signal<SubActivity[]>([]);
  private recordsSignal = signal<DailyRecord[]>([]);

  constructor() {
    this.loadInitialData();
  }

  // --- Carga Inicial ---
  private loadInitialData() {
    // Como usamos LocalStorage (síncrono disfrazado de observable), esto es instantáneo.
    // Con una API real, aquí manejaríamos estados de "loading".
    this.dataProvider.getGoals().subscribe(data => this.goalsSignal.set(data));
    this.dataProvider.getActivities().subscribe(data => this.activitiesSignal.set(data));
    this.dataProvider.getSubActivities().subscribe(data => this.subActivitiesSignal.set(data));
    this.dataProvider.getRecords().subscribe(data => this.recordsSignal.set(data));
  }

  // --- SELECTORES (Públicos) ---
  public goals = this.goalsSignal.asReadonly();
  public activities = this.activitiesSignal.asReadonly();
  
  public todaysTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.subActivitiesSignal().filter(s => s.scheduledDate === today);
  });

  public todaysMetrics = computed(() => {
    const tasks = this.todaysTasks();
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completada').length; // Ojo: valor en español
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    return { total, completed, percentage, remaining: total - completed };
  });

  // --- ACCIONES (CRUD) ---

  // 1. METAS
  addGoal(newGoal: Goal) {
    // Actualizamos estado local (UI instantánea)
    this.goalsSignal.update(goals => [...goals, newGoal]);
    // Persistimos
    this.dataProvider.saveGoals(this.goalsSignal()).subscribe();
  }

  // 2. ACTIVIDADES
  addActivity(newActivity: Activity) {
    this.activitiesSignal.update(acts => [...acts, newActivity]);
    this.dataProvider.saveActivities(this.activitiesSignal()).subscribe();
  }

  // 3. SUBACTIVIDADES (Tareas del día)
  addSubActivity(newSub: SubActivity) {
    this.subActivitiesSignal.update(subs => [...subs, newSub]);
    this.dataProvider.saveSubActivities(this.subActivitiesSignal()).subscribe();
  }

  toggleTask(id: string) {
    this.subActivitiesSignal.update(tasks => 
      tasks.map(t => {
        if (t.id === id) {
          const newStatus = t.status === 'completada' ? 'pendiente' : 'completada';
          return { ...t, status: newStatus };
        }
        return t;
      })
    );
    // Guardar cambios de estado
    this.dataProvider.saveSubActivities(this.subActivitiesSignal()).subscribe();
  }

  // 4. CIERRE DEL DÍA
  closeDay(notes: string) {
    const metrics = this.todaysMetrics();
    const tasks = this.todaysTasks();
    
    const plannedTime = tasks.reduce((acc, t) => acc + t.estimatedDurationMin, 0);
    const completedTasksList = tasks.filter(t => t.status === 'completada');
    const executedTime = completedTasksList.reduce((acc, t) => acc + t.estimatedDurationMin, 0);

    const newRecord: DailyRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      plannedItems: metrics.total,
      completedItems: metrics.completed,
      executionPercentage: metrics.percentage,
      plannedTimeMin: plannedTime,
      executedTimeMin: executedTime,
      notes: notes,
      createdAt: new Date()
    };

    this.recordsSignal.update(records => [...records, newRecord]);
    this.dataProvider.saveRecords(this.recordsSignal()).subscribe();
    
    return newRecord;
  }
}
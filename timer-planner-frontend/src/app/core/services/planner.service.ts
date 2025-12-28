import { Injectable, signal, computed } from '@angular/core';
import { Goal } from '../models/goal.model';
import { Activity, SubActivity } from '../models/activity.model';
import { DailyRecord } from '../models/daily-record.model';

@Injectable({
  providedIn: 'root'
})
export class PlannerService {

  // --- ESTADO (Signals) ---
  
  private goalsSignal = signal<Goal[]>([
    {
      id: 'g1',
      title: 'Dominar Angular Avanzado',
      type: 'trabajo',
      horizon: 'mediano',
      progress: 35,
      status: 'activa',
      createdAt: new Date()
    },
    {
      id: 'g2',
      title: 'Salud Física',
      type: 'sistema_vital',
      horizon: 'largo',
      progress: 60,
      status: 'activa',
      createdAt: new Date()
    }
  ]);

  private activitiesSignal = signal<Activity[]>([
    {
      id: 'a1',
      goalId: 'g1',
      title: 'Curso Server Side Rendering',
      level: 'progreso',
      type: 'compuesta',
      totalTimeRequiredMin: 300,
      allowedDays: 'L,M,X,J,V',
      status: 'en_progreso'
    },
    {
      id: 'a2',
      goalId: 'g2',
      title: 'Ejercicio Diario',
      level: 'sistema',
      type: 'simple',
      totalTimeRequiredMin: 45,
      allowedDays: 'L,M,X,J,V,S,D',
      status: 'pendiente'
    }
  ]);

  private subActivitiesSignal = signal<SubActivity[]>([
    {
      id: 's1',
      activityId: 'a1',
      title: 'Configurar entorno SSR',
      estimatedDurationMin: 60,
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'completada'
    },
    {
      id: 's2',
      activityId: 'a1',
      title: 'Crear servicio de Signals',
      estimatedDurationMin: 45,
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'pendiente'
    },
    {
      id: 's3',
      activityId: 'a2',
      title: 'Rutina de pesas',
      estimatedDurationMin: 45,
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'pendiente'
    }
  ]);

  private recordsSignal = signal<DailyRecord[]>([]);

  // --- SELECTORES (Computed) ---
  
  public goals = this.goalsSignal.asReadonly();
  public activities = this.activitiesSignal.asReadonly();
  
  public todaysTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.subActivitiesSignal().filter(s => s.scheduledDate === today);
  });

  public todaysMetrics = computed(() => {
    const tasks = this.todaysTasks();
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completada').length;
    
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      completed,
      percentage,
      remaining: total - completed
    };
  });

  // --- ACCIONES (Methods) ---

  addGoal(newGoal: Goal) {
    this.goalsSignal.update(goals => [...goals, newGoal]);
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
  }

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
    
    console.log('Day closed successfully:', newRecord);
    return newRecord;
  }

  // --- Método para agregar metas (lo usaremos pronto) ---
  addMeta(newGoal: Goal) {
    this.goalsSignal.update(goals => [...goals, newGoal]);
  }
}





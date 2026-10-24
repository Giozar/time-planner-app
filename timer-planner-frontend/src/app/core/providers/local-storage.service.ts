import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { DataProvider } from './data.provider';
import { Goal } from '../models/goal.model';
import { Objective } from '../models/objective.model';
import { Activity, SubActivity } from '../models/activity.model';
import { DailyRecord } from '../models/daily-record.model';
import { ExecutionSession, WorkLog } from '../models/session.model';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService extends DataProvider {

  private readonly KEYS = {
    GOALS: 'time_planner_goals',
    OBJECTIVES: 'time_planner_objectives',
    ACTIVITIES: 'time_planner_activities',
    SUB_ACTIVITIES: 'time_planner_sub_activities',
    SESSIONS: 'time_planner_sessions',
    WORK_LOGS: 'time_planner_work_logs',
    RECORDS: 'time_planner_records'
  };

  /** Cambia cuando el formato de los datos deja de ser compatible; los datos anteriores se descartan. */
  private readonly SCHEMA_KEY = 'time_planner_schema';
  private readonly SCHEMA_VERSION = '3'; // 3: estados abierto, pausado y cerrado (RN-31)

  // Inyectamos el ID de la plataforma para saber si estamos en Server o Browser
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    super();
    if (isPlatformBrowser(this.platformId)) {
      for (const key of Object.keys(localStorage)) {
        if (/^planner(?:_v\d+)?_(?:goals|objectives|activities|sub_activities|records)$/.test(key)) {
          localStorage.removeItem(key);
        }
      }
      if (localStorage.getItem(this.SCHEMA_KEY) !== this.SCHEMA_VERSION) {
        Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
        localStorage.setItem(this.SCHEMA_KEY, this.SCHEMA_VERSION);
      }
    }
  }

  // --- Helpers privados protegidos con SSR ---

  private load<T>(key: string): T[] {
    // Verificamos si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    }
    // Si estamos en el servidor (SSR), retornamos vacío para no romper la app
    return [];
  }

  private save<T>(key: string, data: T[]): void {
    // Solo guardamos si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  // --- Implementación del Contrato ---

  // Metas
  getGoals(): Observable<Goal[]> {
    return of(this.load<Goal>(this.KEYS.GOALS));
  }
  
  saveGoals(goals: Goal[]): Observable<void> {
    this.save(this.KEYS.GOALS, goals);
    return of(void 0);
  }

  // Objetivos
  getObjectives(): Observable<Objective[]> {
    return of(this.load<Objective>(this.KEYS.OBJECTIVES));
  }

  saveObjectives(objectives: Objective[]): Observable<void> {
    this.save(this.KEYS.OBJECTIVES, objectives);
    return of(void 0);
  }

  // Actividades
  getActivities(): Observable<Activity[]> {
    return of(this.load<Activity>(this.KEYS.ACTIVITIES));
  }

  saveActivities(activities: Activity[]): Observable<void> {
    this.save(this.KEYS.ACTIVITIES, activities);
    return of(void 0);
  }

  // Subactividades
  getSubActivities(): Observable<SubActivity[]> {
    return of(this.load<SubActivity>(this.KEYS.SUB_ACTIVITIES));
  }

  saveSubActivities(subActivities: SubActivity[]): Observable<void> {
    this.save(this.KEYS.SUB_ACTIVITIES, subActivities);
    return of(void 0);
  }

  // Sesiones programadas
  getSessions(): Observable<ExecutionSession[]> {
    return of(this.load<ExecutionSession>(this.KEYS.SESSIONS));
  }

  saveSessions(sessions: ExecutionSession[]): Observable<void> {
    this.save(this.KEYS.SESSIONS, sessions);
    return of(void 0);
  }

  // Registros de trabajo
  getWorkLogs(): Observable<WorkLog[]> {
    return of(this.load<WorkLog>(this.KEYS.WORK_LOGS));
  }

  saveWorkLogs(workLogs: WorkLog[]): Observable<void> {
    this.save(this.KEYS.WORK_LOGS, workLogs);
    return of(void 0);
  }

  // Registros Historicos
  getRecords(): Observable<DailyRecord[]> {
    return of(this.load<DailyRecord>(this.KEYS.RECORDS));
  }

  saveRecords(records: DailyRecord[]): Observable<void> {
    this.save(this.KEYS.RECORDS, records);
    return of(void 0);
  }
}

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { DataProvider } from './data.provider';
import { Goal } from '../models/goal.model';
import { Activity, SubActivity } from '../models/activity.model';
import { DailyRecord } from '../models/daily-record.model';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService extends DataProvider {

  private readonly KEYS = {
    GOALS: 'planner_goals',
    ACTIVITIES: 'planner_activities',
    SUB_ACTIVITIES: 'planner_sub_activities',
    RECORDS: 'planner_records'
  };

  // Inyectamos el ID de la plataforma para saber si estamos en Server o Browser
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    super();
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

  // --- Implementación del Contrato (Igual que antes) ---

  // Metas
  getGoals(): Observable<Goal[]> {
    return of(this.load<Goal>(this.KEYS.GOALS));
  }
  
  saveGoals(goals: Goal[]): Observable<void> {
    this.save(this.KEYS.GOALS, goals);
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

  // Registros Historicos
  getRecords(): Observable<DailyRecord[]> {
    return of(this.load<DailyRecord>(this.KEYS.RECORDS));
  }

  saveRecords(records: DailyRecord[]): Observable<void> {
    this.save(this.KEYS.RECORDS, records);
    return of(void 0);
  }
}
import { Observable } from 'rxjs';
import { Goal } from '../models/goal.model';
import { Activity, SubActivity } from '../models/activity.model';
import { DailyRecord } from '../models/daily-record.model';

export abstract class DataProvider {
  // Metas
  abstract getGoals(): Observable<Goal[]>;
  abstract saveGoals(goals: Goal[]): Observable<void>;

  // Actividades
  abstract getActivities(): Observable<Activity[]>;
  abstract saveActivities(activities: Activity[]): Observable<void>;

  // Subactividades
  abstract getSubActivities(): Observable<SubActivity[]>;
  abstract saveSubActivities(subActivities: SubActivity[]): Observable<void>;

  // Registros
  abstract getRecords(): Observable<DailyRecord[]>;
  abstract saveRecords(records: DailyRecord[]): Observable<void>;
}
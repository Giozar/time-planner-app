import { Observable, of } from 'rxjs';
import { DataProvider } from '../core/providers/data.provider';
import { Goal } from '../core/models/goal.model';
import { Objective } from '../core/models/objective.model';
import { Activity, SubActivity } from '../core/models/activity.model';
import { DailyRecord } from '../core/models/daily-record.model';
import { ExecutionSession } from '../core/models/session.model';

/** Proveedor en memoria para pruebas: guarda lo que recibe y lo devuelve al leer. */
export class InMemoryDataProvider extends DataProvider {
  goals: Goal[] = [];
  objectives: Objective[] = [];
  activities: Activity[] = [];
  subActivities: SubActivity[] = [];
  sessions: ExecutionSession[] = [];
  records: DailyRecord[] = [];
  saveCount = 0;

  getGoals(): Observable<Goal[]> { return of(this.goals); }
  saveGoals(goals: Goal[]): Observable<void> { this.goals = goals; this.saveCount++; return of(void 0); }
  getObjectives(): Observable<Objective[]> { return of(this.objectives); }
  saveObjectives(objectives: Objective[]): Observable<void> { this.objectives = objectives; return of(void 0); }
  getActivities(): Observable<Activity[]> { return of(this.activities); }
  saveActivities(activities: Activity[]): Observable<void> { this.activities = activities; return of(void 0); }
  getSubActivities(): Observable<SubActivity[]> { return of(this.subActivities); }
  saveSubActivities(subActivities: SubActivity[]): Observable<void> { this.subActivities = subActivities; return of(void 0); }
  getSessions(): Observable<ExecutionSession[]> { return of(this.sessions); }
  saveSessions(sessions: ExecutionSession[]): Observable<void> { this.sessions = sessions; return of(void 0); }
  getRecords(): Observable<DailyRecord[]> { return of(this.records); }
  saveRecords(records: DailyRecord[]): Observable<void> { this.records = records; return of(void 0); }
}

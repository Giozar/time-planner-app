import { Routes } from '@angular/router';
import { GoalsListComponent } from './features/goals/goals-list/goals-list.component';
import { GoalsFormComponent } from './features/goals/goals-form/goals-form.component';
import { GoalDetailComponent } from './features/goals/goal-detail/goal-detail.component';
import { ActivityFormComponent } from './features/activities/activity-form/activity-form.component';
import { DailyDashboardComponent } from './features/daily/daily-dashboard/daily-dashboard.component';
import { DailySummaryComponent } from './features/daily/daily-summary/daily-summary.component';

export const routes: Routes = [
  // Flujo Diario
  { path: 'daily', component: DailyDashboardComponent },
  { path: 'daily/summary', component: DailySummaryComponent },
  
  // Flujo Metas
  { path: 'goals', component: GoalsListComponent },
  { path: 'goals/new', component: GoalsFormComponent },
  
  // Detalle de Meta (ID dinámico)
  { path: 'goals/:id', component: GoalDetailComponent },
  
  // Crear Actividad (Anidada bajo la meta para tener contexto)
  { path: 'goals/:id/activities/new', component: ActivityFormComponent },

  { path: '', redirectTo: 'daily', pathMatch: 'full' }
];
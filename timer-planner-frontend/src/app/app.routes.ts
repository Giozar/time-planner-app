import { Routes } from '@angular/router';
import { GoalsListComponent } from './features/goals/goals-list/goals-list.component';
import { DailyDashboardComponent } from './features/daily/daily-dashboard/daily-dashboard.component';
import { DailySummaryComponent } from './features/daily/daily-summary/daily-summary.component';
import { GoalsFormComponent } from './features/goals/goals-form/goals-form.component';

export const routes: Routes = [
  {
    path: 'daily',
    component: DailyDashboardComponent,
  },
  { path: 'daily/summary', component: DailySummaryComponent },
  {
    path: 'goals',
    component: GoalsListComponent,
  },
  { path: 'goals/new', component: GoalsFormComponent },
  {
    path: '',
    redirectTo: 'daily', // Ahora la home es el dashboard diario
    pathMatch: 'full',
  },
];

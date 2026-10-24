import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // RUTAS DEL DÍA
      { path: 'daily', loadComponent: () => import('./features/daily/daily-dashboard/daily-dashboard.component').then(m => m.DailyDashboardComponent) },
      { path: 'daily/summary', loadComponent: () => import('./features/daily/daily-summary/daily-summary.component').then(m => m.DailySummaryComponent) },

      // CALENDARIO
      { path: 'calendar', loadComponent: () => import('./features/calendar/calendar-view/calendar-view.component').then(m => m.CalendarViewComponent) },
      
      // HISTORIAL
      { path: 'history', loadComponent: () => import('./features/history/history-list/history-list.component').then(m => m.HistoryListComponent) },

      // RUTAS DE METAS (GOALS)
      { path: 'goals', loadComponent: () => import('./features/goals/goals-list/goals-list.component').then(m => m.GoalsListComponent) },
      { path: 'goals/new', loadComponent: () => import('./features/goals/goals-form/goals-form.component').then(m => m.GoalsFormComponent) },
      { path: 'goals/:id', loadComponent: () => import('./features/goals/goal-detail/goal-detail.component').then(m => m.GoalDetailComponent) },
      { path: 'goals/:id/edit', loadComponent: () => import('./features/goals/goals-form/goals-form.component').then(m => m.GoalsFormComponent) },
      
      // RUTAS DE OBJETIVOS
      { path: 'goals/:goalId/objectives/new', loadComponent: () => import('./features/objectives/objective-form/objective-form.component').then(m => m.ObjectiveFormComponent) },
      { path: 'goals/:goalId/objectives/:id/edit', loadComponent: () => import('./features/objectives/objective-form/objective-form.component').then(m => m.ObjectiveFormComponent) },
      { path: 'objectives/:id', loadComponent: () => import('./features/objectives/objective-detail/objective-detail.component').then(m => m.ObjectiveDetailComponent) },

      // RUTAS DE TAREAS (ACTIVITIES)
      { path: 'objectives/:objectiveId/activities/new', loadComponent: () => import('./features/activities/activity-form/activity-form.component').then(m => m.ActivityFormComponent) },
      { path: 'objectives/:objectiveId/activities/:activityId/edit', loadComponent: () => import('./features/activities/activity-form/activity-form.component').then(m => m.ActivityFormComponent) },
      
      // RUTAS DE PASOS (SUB-ACTIVITIES / STEPS)
      { path: 'objectives/:objectiveId/activities/:activityId/add-step', loadComponent: () => import('./features/activities/structure-form/structure-form.component').then(m => m.StructureFormComponent) },
      { path: 'objectives/:objectiveId/activities/:activityId/steps/:stepId/edit', loadComponent: () => import('./features/activities/structure-form/structure-form.component').then(m => m.StructureFormComponent) },
      
      // Redirección por defecto al Dashboard
      { path: '', redirectTo: 'daily', pathMatch: 'full' }
    ]
  },
  
  // Rutas fuera del layout
  { path: '**', redirectTo: 'daily' }
];
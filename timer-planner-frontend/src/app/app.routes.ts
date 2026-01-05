import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout.component';

// Importaciones de tus Features
import { GoalsListComponent } from './features/goals/goals-list/goals-list.component';
import { GoalsFormComponent } from './features/goals/goals-form/goals-form.component';
import { GoalDetailComponent } from './features/goals/goal-detail/goal-detail.component';
import { ActivityFormComponent } from './features/activities/activity-form/activity-form.component';
// import { SubactivityFormComponent } from './features/activities/subactivity-form/subactivity-form.component';
import { StructureFormComponent } from './features/activities/structure-form/structure-form.component';
import { DailyDashboardComponent } from './features/daily/daily-dashboard/daily-dashboard.component';
import { DailySummaryComponent } from './features/daily/daily-summary/daily-summary.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent, // <--- El Layout envuelve todo
    children: [
      // RUTAS DEL DÍA
      { path: 'daily', component: DailyDashboardComponent },
      { path: 'daily/summary', component: DailySummaryComponent },
      
      // ...
      // RUTAS DE METAS
      { path: 'goals', component: GoalsListComponent },
      { path: 'goals/new', component: GoalsFormComponent },
      { path: 'goals/:id', component: GoalDetailComponent },
      
      // NUEVA RUTA DE EDICIÓN (Reutiliza el mismo componente)
      { path: 'goals/:id/edit', component: GoalsFormComponent },
      
      // RUTAS DE ACTIVIDADES
      { path: 'goals/:id/activities/new', component: ActivityFormComponent },

      { path: 'goals/:goalId/activities/:activityId/edit', component: ActivityFormComponent },
      
      { path: 'goals/:goalId/activities/:activityId/add-step', component: StructureFormComponent },

      // Redirección por defecto al Dashboard
      { path: '', redirectTo: 'daily', pathMatch: 'full' }
    ]
  },
  
  // (Opcional) Rutas fuera del layout (ej: Login, 404) irían aquí fuera
  { path: '**', redirectTo: 'daily' }
];
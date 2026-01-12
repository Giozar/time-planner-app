import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout.component';

// Importaciones de Features
import { GoalsListComponent } from './features/goals/goals-list/goals-list.component';
import { GoalsFormComponent } from './features/goals/goals-form/goals-form.component';
import { GoalDetailComponent } from './features/goals/goal-detail/goal-detail.component';
import { ObjectiveDetailComponent } from './features/objectives/objective-detail/objective-detail.component';
import { ObjectiveFormComponent } from './features/objectives/objective-form/objective-form.component';
import { ActivityFormComponent } from './features/activities/activity-form/activity-form.component';
import { StructureFormComponent } from './features/activities/structure-form/structure-form.component';
import { DailyDashboardComponent } from './features/daily/daily-dashboard/daily-dashboard.component';
import { DailySummaryComponent } from './features/daily/daily-summary/daily-summary.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // RUTAS DEL DÍA
      { path: 'daily', component: DailyDashboardComponent },
      { path: 'daily/summary', component: DailySummaryComponent },
      
      // RUTAS DE METAS (GOALS)
      { path: 'goals', component: GoalsListComponent },
      { path: 'goals/new', component: GoalsFormComponent },
      { path: 'goals/:id', component: GoalDetailComponent },
      { path: 'goals/:id/edit', component: GoalsFormComponent },
      
      // RUTAS DE OBJETIVOS
      { path: 'goals/:goalId/objectives/new', component: ObjectiveFormComponent },
      { path: 'goals/:goalId/objectives/:id/edit', component: ObjectiveFormComponent },
      { path: 'objectives/:id', component: ObjectiveDetailComponent },

      // RUTAS DE TAREAS (ACTIVITIES)
      { path: 'objectives/:objectiveId/activities/new', component: ActivityFormComponent },
      { path: 'objectives/:objectiveId/activities/:activityId/edit', component: ActivityFormComponent },
      
      // RUTAS DE PASOS (SUB-ACTIVITIES / STEPS)
      { path: 'objectives/:objectiveId/activities/:activityId/add-step', component: StructureFormComponent },
      { path: 'objectives/:objectiveId/activities/:activityId/steps/:stepId/edit', component: StructureFormComponent },
      
      // Redirección por defecto al Dashboard
      { path: '', redirectTo: 'daily', pathMatch: 'full' }
    ]
  },
  
  // Rutas fuera del layout
  { path: '**', redirectTo: 'daily' }
];
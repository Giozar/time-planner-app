import { Routes } from '@angular/router';
import { GoalsListComponent } from './features/goals/goals-list/goals-list.component';

export const routes: Routes = [
  {
    path: 'goals',
    component: GoalsListComponent
  },
  {
    path: '',
    redirectTo: 'goals',
    pathMatch: 'full'
  }
];
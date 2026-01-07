import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerService } from '../../../core/services/planner.service';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Goal } from '../../../core/models/goal.model';

@Component({
  selector: 'app-goals-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './goals-list.component.html',
  styleUrl: './goals-list.component.css'
})
export class GoalsListComponent {
  private plannerService = inject(PlannerService);
  private dialogService = inject(NativeDialogService);
  
  // Señal de lectura del servicio
  goals = this.plannerService.goals;

  async onDeleteGoal(event: Event, goal: Goal) {
    event.stopPropagation(); // Evitar navegar al detalle
    
    const confirmed = await this.dialogService.confirm(
      '¿Eliminar Meta?',
      `Estás a punto de eliminar "${goal.title}". Esta acción eliminará TAMBIÉN todas sus actividades y pasos asociados. ¿Estás seguro?`,
      { confirmText: 'Eliminar', isDanger: true }
    );

    if (confirmed) {
      this.plannerService.deleteGoal(goal.id);
    }
  }
}
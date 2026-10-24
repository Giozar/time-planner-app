import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerService } from '../../../core/services/planner.service';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Goal, GoalStatus } from '../../../core/models/goal.model';
import { DeletableType } from '../../../core/models/deletion-impact.model';
import { GOAL_HORIZON_LABELS, GOAL_STATUS_LABELS } from '../../../core/i18n/labels';
import { ConsistencyPipe } from '../../../shared/pipes/consistency.pipe';
import { LabelPipe } from '../../../shared/pipes/label.pipe';

@Component({
  selector: 'app-goals-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LabelPipe, ConsistencyPipe],
  templateUrl: './goals-list.component.html',
  styleUrl: './goals-list.component.css'
})
export class GoalsListComponent {
  private plannerService = inject(PlannerService);
  private dialogService = inject(NativeDialogService);
  
  // Señal de lectura del servicio
  goals = this.plannerService.goals;

  readonly horizonLabels = GOAL_HORIZON_LABELS;
  readonly statusLabels = GOAL_STATUS_LABELS;
  readonly GoalStatus = GoalStatus;

  async onDeleteGoal(event: Event, goal: Goal) {
    event.stopPropagation(); // Evitar navegar al detalle

    const impact = this.plannerService.deletionImpact(DeletableType.GOAL, goal.id);
    if (!impact) return;

    if (await this.dialogService.confirmDelete(DeletableType.GOAL, impact)) {
      this.plannerService.deleteGoal(goal.id);
    }
  }

  onTogglePause(event: Event, goal: Goal) {
    event.stopPropagation();
    if (goal.status === GoalStatus.PAUSED) {
      this.plannerService.resumeGoal(goal.id);
    } else {
      this.plannerService.pauseGoal(goal.id);
    }
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerService } from '../../../core/services/planner.service';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Goal, GoalStatus } from '../../../core/models/goal.model';
import { DeletableType } from '../../../core/models/deletion-impact.model';
import { CLOSURE_TYPE_LABELS, GOAL_HORIZON_LABELS, GOAL_STATUS_LABELS } from '../../../core/i18n/labels';
import { LifecycleActionsService } from '../../../core/services/lifecycle-actions.service';
import { hasOpenPause } from '../../../core/rules';
import { ProductivityPipe } from '../../../shared/pipes/productivity.pipe';
import { ConsistencyPipe } from '../../../shared/pipes/consistency.pipe';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { ResultPipe } from '../../../shared/pipes/result.pipe';

@Component({
  selector: 'app-goals-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LabelPipe, ConsistencyPipe, ProductivityPipe, ResultPipe],
  templateUrl: './goals-list.component.html',
  styleUrl: './goals-list.component.css'
})
export class GoalsListComponent {
  private plannerService = inject(PlannerService);
  private dialogService = inject(NativeDialogService);
  private lifecycle = inject(LifecycleActionsService);
  
  // Señal de lectura del servicio
  goals = this.plannerService.goals;

  readonly horizonLabels = GOAL_HORIZON_LABELS;
  readonly statusLabels = GOAL_STATUS_LABELS;
  readonly closureLabels = CLOSURE_TYPE_LABELS;
  readonly GoalStatus = GoalStatus;

  async onDeleteGoal(event: Event, goal: Goal) {
    event.stopPropagation(); // Evitar navegar al detalle

    const impact = this.plannerService.deletionImpact(DeletableType.GOAL, goal.id);
    if (!impact) return;

    if (await this.dialogService.confirmDelete(DeletableType.GOAL, impact)) {
      this.plannerService.deleteGoal(goal.id);
    }
  }

  /** Tiene una pausa propia abierta; la heredada de un padre no se reanuda desde aquí (RN-57). */
  ownPaused(goal: Goal): boolean {
    return hasOpenPause(goal.pauses);
  }

  onTogglePause(event: Event, goal: Goal) {
    event.stopPropagation();
    this.lifecycle.togglePause('goal', goal.id, this.ownPaused(goal));
  }

  onClose(event: Event, goal: Goal) {
    event.stopPropagation();
    this.lifecycle.close('goal', goal.id, goal.title);
  }

  onReopen(event: Event, goal: Goal) {
    event.stopPropagation();
    this.lifecycle.reopen('goal', goal.id, goal.title);
  }
}

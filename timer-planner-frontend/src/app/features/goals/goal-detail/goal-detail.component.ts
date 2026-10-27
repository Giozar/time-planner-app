import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Objective } from '../../../core/models/objective.model';
import { GoalStatus } from '../../../core/models/goal.model';
import { DeletableType } from '../../../core/models/deletion-impact.model';
import {
  CLOSURE_TYPE_LABELS, GOAL_HORIZON_LABELS, GOAL_STATUS_LABELS, OBJECTIVE_NATURE_LABELS, OBJECTIVE_STATUS_LABELS,
} from '../../../core/i18n/labels';
import { LifecycleActionsService } from '../../../core/services/lifecycle-actions.service';
import { hasOpenPause } from '../../../core/rules';
import { Goal } from '../../../core/models/goal.model';
import { ProductivityPipe } from '../../../shared/pipes/productivity.pipe';
import { ConsistencyPipe } from '../../../shared/pipes/consistency.pipe';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { ResultPipe } from '../../../shared/pipes/result.pipe';

@Component({
  selector: 'app-goal-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LabelPipe, ConsistencyPipe, ProductivityPipe, ResultPipe],
  templateUrl: './goal-detail.component.html',
  styleUrl: './goal-detail.component.css',
})
export class GoalDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private plannerService = inject(PlannerService);
  private dialogService = inject(NativeDialogService);
  private lifecycle = inject(LifecycleActionsService);

  goalId = this.route.snapshot.paramMap.get('id');

  readonly horizonLabels = GOAL_HORIZON_LABELS;
  readonly statusLabels = GOAL_STATUS_LABELS;
  readonly closureLabels = CLOSURE_TYPE_LABELS;
  readonly natureLabels = OBJECTIVE_NATURE_LABELS;
  readonly objectiveStatusLabels = OBJECTIVE_STATUS_LABELS;
  readonly GoalStatus = GoalStatus;

  goal = computed(() => this.plannerService.goals().find((g) => g.id === this.goalId));

  // En V2, la Meta (Goal) tiene Objetivos
  objectives = computed(() =>
    this.plannerService.objectives().filter((o) => o.goalId === this.goalId)
  );

  ngOnInit() {
    if (!this.goal()) {
      this.router.navigate(['/goals']);
    }
  }

  async onDeleteObjective(objective: Objective) {
    const impact = this.plannerService.deletionImpact(DeletableType.OBJECTIVE, objective.id);
    if (!impact) return;

    if (await this.dialogService.confirmDelete(DeletableType.OBJECTIVE, impact)) {
      this.plannerService.deleteObjective(objective.id);
    }
  }

  /** Tiene una pausa propia abierta (RN-57). */
  ownPaused(goal: Goal): boolean {
    return hasOpenPause(goal.pauses);
  }

  onTogglePause(goal: Goal) {
    this.lifecycle.togglePause('goal', goal.id, this.ownPaused(goal));
  }

  onClose(goal: Goal) {
    this.lifecycle.close('goal', goal.id, goal.title);
  }

  onReopen(goal: Goal) {
    this.lifecycle.reopen('goal', goal.id, goal.title);
  }
}

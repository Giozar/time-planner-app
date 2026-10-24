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
  GOAL_HORIZON_LABELS, GOAL_STATUS_LABELS, OBJECTIVE_NATURE_LABELS, OBJECTIVE_STATUS_LABELS,
} from '../../../core/i18n/labels';
import { ConsistencyPipe } from '../../../shared/pipes/consistency.pipe';
import { LabelPipe } from '../../../shared/pipes/label.pipe';

@Component({
  selector: 'app-goal-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LabelPipe, ConsistencyPipe],
  templateUrl: './goal-detail.component.html',
  styleUrl: './goal-detail.component.css',
})
export class GoalDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private plannerService = inject(PlannerService);
  private dialogService = inject(NativeDialogService);

  goalId = this.route.snapshot.paramMap.get('id');

  readonly horizonLabels = GOAL_HORIZON_LABELS;
  readonly statusLabels = GOAL_STATUS_LABELS;
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

  onTogglePause(goalId: string, status: GoalStatus) {
    if (status === GoalStatus.PAUSED) {
      this.plannerService.resumeGoal(goalId);
    } else {
      this.plannerService.pauseGoal(goalId);
    }
  }
}

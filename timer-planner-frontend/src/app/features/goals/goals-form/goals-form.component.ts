import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { Goal, GoalHorizon, GoalStatus } from '../../../core/models/goal.model';
import { GOAL_HORIZON_LABELS } from '../../../core/i18n/labels';
import { LabelPipe } from '../../../shared/pipes/label.pipe';

@Component({
  selector: 'app-goals-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LabelPipe],
  templateUrl: './goals-form.component.html',
  styleUrl: './goals-form.component.css'
})
export class GoalsFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly horizons = Object.values(GoalHorizon);
  readonly horizonLabels = GOAL_HORIZON_LABELS;

  isEditMode = false;
  goalId: string | null = null;

  private originalCreatedAt: Date = new Date();
  private originalProgress: number = 0;
  private originalStatus: GoalStatus = GoalStatus.OPEN;

  // Sin horizonte la meta es una idea (RN-55). La meta no tiene fecha límite (RN-56).
  goalForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    horizon: [null as GoalHorizon | null]
  });

  ngOnInit() {
    this.goalId = this.route.snapshot.paramMap.get('id');

    if (this.goalId) {
      this.isEditMode = true;
      this.loadGoalData(this.goalId);
    }
  }

  private loadGoalData(id: string) {
    const goal = this.plannerService.goals().find(g => g.id === id);

    if (goal) {
      this.goalForm.patchValue({
        title: goal.title,
        horizon: goal.horizon
      });

      this.originalCreatedAt = goal.createdAt;
      this.originalProgress = goal.progress;
      this.originalStatus = goal.status;
    } else {
      this.router.navigate(['/goals']);
    }
  }

  onSubmit() {
    if (!this.goalForm.valid) return;

    const formValue = this.goalForm.value;
    const horizon = formValue.horizon || null;

    if (this.isEditMode && this.goalId) {
      const updatedGoal: Goal = {
        id: this.goalId,
        title: formValue.title!,
        horizon,
        progress: this.originalProgress,
        status: this.originalStatus,
        createdAt: this.originalCreatedAt
      };

      this.plannerService.updateGoal(updatedGoal);
      this.router.navigate(['/goals', this.goalId]);
    } else {
      const newGoal: Goal = {
        id: crypto.randomUUID(),
        title: formValue.title!,
        horizon,
        progress: 0,
        status: horizon ? GoalStatus.OPEN : GoalStatus.IDEA,
        createdAt: new Date()
      };

      this.plannerService.addGoal(newGoal);
      this.router.navigate(['/goals']);
    }
  }

  cancel() {
    if (this.isEditMode) {
      this.router.navigate(['/goals', this.goalId]);
    } else {
      this.router.navigate(['/goals']);
    }
  }
}

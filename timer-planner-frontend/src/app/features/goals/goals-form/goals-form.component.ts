import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { DateUtils } from '../../../core/utils/date.utils';
import { Goal, GoalHorizon, GoalStatus } from '../../../core/models/goal.model';
import { GOAL_HORIZON_LABELS } from '../../../core/i18n/labels';
import { isClosed } from '../../../core/rules';
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
  private dialog = inject(NativeDialogService);

  readonly horizons = Object.values(GoalHorizon);
  readonly horizonLabels = GOAL_HORIZON_LABELS;
  minDate = DateUtils.getTodayISO();

  isEditMode = false;
  /** Cerrada: su fecha límite ya no se edita (RN-80). */
  closed = false;
  goalId: string | null = null;

  private originalCreatedAt: Date = new Date();
  private originalProgress: number = 0;
  private originalStatus: GoalStatus = GoalStatus.OPEN;
  private originalDeadline: string | undefined;

  // Sin horizonte la meta es una idea, sin fecha límite (RN-55); con horizonte la fecha es obligatoria (RN-56).
  goalForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    horizon: [null as GoalHorizon | null],
    deadline: ['']
  });

  get hasHorizon(): boolean { return !!this.goalForm.get('horizon')?.value; }

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
        horizon: goal.horizon,
        deadline: goal.deadline ?? ''
      });

      this.originalCreatedAt = goal.createdAt;
      this.originalProgress = goal.progress;
      this.originalStatus = goal.status;
      this.originalDeadline = goal.deadline;
      this.closed = isClosed(goal);
      if (this.closed) this.goalForm.get('deadline')?.disable();
    } else {
      this.router.navigate(['/goals']);
    }
  }

  onSubmit() {
    if (!this.goalForm.valid) return;

    const formValue = this.goalForm.getRawValue();
    const horizon = formValue.horizon || null;
    const deadline = horizon ? formValue.deadline || undefined : undefined;

    if (horizon && !deadline) {
      this.dialog.alert('Atención', 'Una meta con horizonte necesita fecha límite.');
      return;
    }
    // RN-14: un deadline nuevo o modificado no puede ser anterior a hoy.
    if (deadline && deadline < this.minDate && (!this.isEditMode || deadline !== this.originalDeadline)) {
      this.dialog.alert('Atención', 'La fecha límite no puede ser anterior a hoy.');
      return;
    }

    if (this.isEditMode && this.goalId) {
      const updatedGoal: Goal = {
        id: this.goalId,
        title: formValue.title!,
        horizon,
        deadline,
        progress: this.originalProgress,
        status: this.originalStatus,
        createdAt: this.originalCreatedAt
      };

      // RN-49: si el nuevo límite deja objetivos fuera, se rechaza y se listan las fechas.
      const conflicts = this.plannerService.updateGoal(updatedGoal);
      if (conflicts.length > 0) {
        this.dialog.alertDeadlineConflicts(conflicts);
        return;
      }
      this.router.navigate(['/goals', this.goalId]);
    } else {
      const newGoal: Goal = {
        id: crypto.randomUUID(),
        title: formValue.title!,
        horizon,
        deadline,
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

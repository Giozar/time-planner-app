import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { DateUtils } from '../../../core/utils/date.utils';
import { PlannerService } from '../../../core/services/planner.service';
import { Objective, ObjectiveNature, ObjectiveStatus } from '../../../core/models/objective.model';
import { OBJECTIVE_NATURE_LABELS } from '../../../core/i18n/labels';
import { isClosed } from '../../../core/rules';
import { LabelPipe } from '../../../shared/pipes/label.pipe';

@Component({
  selector: 'app-objective-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LabelPipe],
  templateUrl: './objective-form.component.html',
  styleUrl: './objective-form.component.css'
})
export class ObjectiveFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(NativeDialogService);

  minDate = DateUtils.getTodayISO();
  private originalDeadline = '';

  /** Tope de la fecha del objetivo: la de su meta, si la tiene (RN-48). */
  get goalDeadline(): string {
    return this.plannerService.goals().find(g => g.id === this.goalId)?.deadline ?? '';
  }

  readonly natures = Object.values(ObjectiveNature);
  readonly natureLabels = OBJECTIVE_NATURE_LABELS;

  isEditMode = false;
  /** Cerrado: su deadline ya no se edita (RN-80). */
  closed = false;
  objectiveId: string | null = null;
  goalId: string | null = null;

  private originalCreatedAt: Date = new Date();
  private originalProgress: number = 0;
  private originalStatus: ObjectiveStatus = ObjectiveStatus.OPEN;

  objectiveForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    nature: [ObjectiveNature.OTHER, Validators.required],
    deadline: ['', Validators.required] // RN-65: obligatorio, tope de sus tareas y pasos
  });

  ngOnInit() {
    this.goalId = this.route.snapshot.paramMap.get('goalId');
    this.objectiveId = this.route.snapshot.paramMap.get('id');

    if (this.objectiveId) {
      this.isEditMode = true;
      this.loadObjectiveData(this.objectiveId);
    }
  }

  private loadObjectiveData(id: string) {
    const objective = this.plannerService.objectives().find(o => o.id === id);
    if (objective) {
      this.objectiveForm.patchValue({
        title: objective.title,
        nature: objective.nature,
        deadline: objective.deadline
      });
      this.goalId = objective.goalId;
      this.originalCreatedAt = objective.createdAt;
      this.originalProgress = objective.progress;
      this.originalStatus = objective.status;
      this.originalDeadline = objective.deadline;
      this.closed = isClosed(objective);
      if (this.closed) this.objectiveForm.get('deadline')?.disable();
    } else {
      this.router.navigate(['/goals']);
    }
  }

  onSubmit() {
    if (this.objectiveForm.valid && this.goalId) {
      const formValue = this.objectiveForm.getRawValue();
      const deadline = formValue.deadline!;

      // RN-14: un deadline nuevo o modificado no puede ser anterior a hoy.
      if (deadline < this.minDate && (!this.isEditMode || deadline !== this.originalDeadline)) {
        this.dialog.alert('Atención', 'El deadline no puede ser anterior a hoy.');
        return;
      }

      if (this.isEditMode && this.objectiveId) {
        const updated: Objective = {
          id: this.objectiveId,
          goalId: this.goalId,
          title: formValue.title!,
          nature: formValue.nature!,
          progress: this.originalProgress,
          status: this.originalStatus,
          deadline,
          createdAt: this.originalCreatedAt
        };

        // RN-49: si el nuevo límite deja hijos fuera, se rechaza y se listan las fechas.
        const conflicts = this.plannerService.updateObjective(updated);
        if (conflicts.length > 0) {
          this.dialog.alertDeadlineConflicts(conflicts);
          return;
        }
        this.router.navigate(['/goals', this.goalId]);
      } else {
        const newObjective: Objective = {
          id: crypto.randomUUID(),
          goalId: this.goalId,
          title: formValue.title!,
          nature: formValue.nature!,
          progress: 0,
          status: ObjectiveStatus.OPEN,
          deadline,
          createdAt: new Date()
        };
        // RN-48: no puede superar la fecha límite de su meta.
        const conflicts = this.plannerService.addObjective(newObjective);
        if (conflicts.length > 0) {
          this.dialog.alertDeadlineConflicts(conflicts);
          return;
        }
        this.router.navigate(['/goals', this.goalId]);
      }
    }
  }

  cancel() {
    if (this.goalId) {
      this.router.navigate(['/goals', this.goalId]);
    } else {
      this.router.navigate(['/goals']);
    }
  }
}

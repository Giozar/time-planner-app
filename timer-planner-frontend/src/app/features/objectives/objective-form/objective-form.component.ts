import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { Objective, OBJECTIVE_NATURE_OPTIONS } from '../../../core/models/objective.model';

@Component({
  selector: 'app-objective-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './objective-form.component.html',
  styleUrl: './objective-form.component.css'
})
export class ObjectiveFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly natureOptions = OBJECTIVE_NATURE_OPTIONS;

  isEditMode = false;
  objectiveId: string | null = null;
  goalId: string | null = null;

  private originalCreatedAt: Date = new Date();
  private originalProgress: number = 0;
  private originalStatus: any = 'activa';

  objectiveForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    nature: ['otro', Validators.required]
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
        nature: objective.nature as any
      });
      this.goalId = objective.goalId;
      this.originalCreatedAt = objective.createdAt;
      this.originalProgress = objective.progress;
      this.originalStatus = objective.status;
    } else {
      this.router.navigate(['/goals']);
    }
  }

  onSubmit() {
    if (this.objectiveForm.valid && this.goalId) {
      const formValue = this.objectiveForm.value;

      if (this.isEditMode && this.objectiveId) {
        const updated: Objective = {
          id: this.objectiveId,
          goalId: this.goalId,
          title: formValue.title!,
          nature: formValue.nature as any,
          progress: this.originalProgress,
          status: this.originalStatus,
          createdAt: this.originalCreatedAt
        };
        this.plannerService.updateObjective(updated);
        this.router.navigate(['/goals', this.goalId]);
      } else {
        const newObjective: Objective = {
          id: crypto.randomUUID(),
          goalId: this.goalId,
          title: formValue.title!,
          nature: formValue.nature as any,
          progress: 0,
          status: 'activa',
          createdAt: new Date()
        };
        this.plannerService.addObjective(newObjective);
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

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { Goal, GOAL_HORIZON_OPTIONS } from '../../../core/models/goal.model';

@Component({
  selector: 'app-goals-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './goals-form.component.html',
  styleUrl: './goals-form.component.css'
})
export class GoalsFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly horizonOptions = GOAL_HORIZON_OPTIONS;

  isEditMode = false;
  goalId: string | null = null;
  
  private originalCreatedAt: Date = new Date();
  private originalProgress: number = 0;
  private originalStatus: any = 'activa';
  private legacyType?: string;

  goalForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    horizon: ['mediano', Validators.required]
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
        horizon: goal.horizon as any
      });

      this.originalCreatedAt = goal.createdAt;
      this.originalProgress = goal.progress;
      this.originalStatus = goal.status;
      this.legacyType = goal.type;
    } else {
      this.router.navigate(['/goals']);
    }
  }

  onSubmit() {
    if (this.goalForm.valid) {
      const formValue = this.goalForm.value;

      if (this.isEditMode && this.goalId) {
        const updatedGoal: Goal = {
          id: this.goalId,
          title: formValue.title!,
          horizon: formValue.horizon as any,
          progress: this.originalProgress,
          status: this.originalStatus,
          createdAt: this.originalCreatedAt,
          type: this.legacyType
        };
        
        this.plannerService.updateGoal(updatedGoal);
        this.router.navigate(['/goals', this.goalId]);

      } else {
        const newGoal: Goal = {
          id: crypto.randomUUID(),
          title: formValue.title!,
          horizon: formValue.horizon as any,
          progress: 0,
          status: 'activa',
          createdAt: new Date()
        };

        this.plannerService.addGoal(newGoal);
        this.router.navigate(['/goals']);
      }
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
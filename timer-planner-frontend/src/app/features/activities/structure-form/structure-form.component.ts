import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { SubActivity } from '../../../core/models/activity.model';

@Component({
  selector: 'app-structure-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './structure-form.component.html',
  styleUrl: './structure-form.component.css'
})
export class StructureFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  goalId: string | null = null;
  activityId: string | null = null;

  form = this.fb.group({
    title: ['', Validators.required],
    duration: [45, [Validators.required, Validators.min(5)]]
  });

  ngOnInit() {
    this.goalId = this.route.snapshot.paramMap.get('goalId');
    this.activityId = this.route.snapshot.paramMap.get('activityId');
  }

  onSubmit() {
    if (this.form.valid && this.activityId) {
      const formValue = this.form.value;

      const newStep: SubActivity = {
        id: crypto.randomUUID(),
        activityId: this.activityId,
        title: formValue.title!,
        estimatedDurationMin: formValue.duration!,
        // scheduledDate: undefined  <-- AL NO PONER FECHA, ES ESTRUCTURAL (BACKLOG)
        status: 'pendiente'
      };

      this.plannerService.addSubActivity(newStep);
      
      // Volvemos a la meta para ver cómo se suma el tiempo
      this.router.navigate(['/goals', this.goalId]);
    }
  }

  cancel() {
    this.router.navigate(['/goals', this.goalId]);
  }
}
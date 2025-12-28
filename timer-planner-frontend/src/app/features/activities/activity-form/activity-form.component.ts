import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { Activity } from '../../../core/models/activity.model';

@Component({
  selector: 'app-activity-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './activity-form.component.html',
  styleUrl: './activity-form.component.css'
})
export class ActivityFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  goalId: string | null = null;

  activityForm = this.fb.group({
    title: ['', [Validators.required]],
    type: ['simple', Validators.required],
    level: ['urgente_directo', Validators.required],
    timeRequired: [30, [Validators.required, Validators.min(1)]],
    days: ['L,M,X,J,V', Validators.required] // Por defecto lun-vie
  });

  ngOnInit() {
    // Obtenemos el ID de la meta desde la URL padre
    this.goalId = this.route.snapshot.paramMap.get('id');
    if (!this.goalId) {
      this.router.navigate(['/goals']);
    }
  }

  onSubmit() {
    if (this.activityForm.valid && this.goalId) {
      const formValue = this.activityForm.value;

      const newActivity: Activity = {
        id: crypto.randomUUID(),
        goalId: this.goalId, // ¡Vinculación Clave!
        title: formValue.title!,
        type: formValue.type as any,
        level: formValue.level as any,
        totalTimeRequiredMin: formValue.timeRequired!,
        allowedDays: formValue.days!,
        status: 'pendiente'
      };

      this.plannerService.addActivity(newActivity);
      
      // Regresar al detalle de la meta
      this.router.navigate(['/goals', this.goalId]);
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
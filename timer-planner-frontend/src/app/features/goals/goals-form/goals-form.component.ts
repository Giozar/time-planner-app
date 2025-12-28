import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { Goal } from '../../../core/models/goal.model';

@Component({
  selector: 'app-goals-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './goals-form.component.html',
  styleUrl: './goals-form.component.css'
})
export class GoalsFormComponent {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private router = inject(Router);

  // Definición del formulario con validaciones
  goalForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    type: ['trabajo', Validators.required],
    horizon: ['mediano', Validators.required]
  });

  onSubmit() {
    if (this.goalForm.valid) {
      const formValue = this.goalForm.value;

      // Construimos el objeto Goal completo
      const newGoal: Goal = {
        id: crypto.randomUUID(),
        title: formValue.title!, // El ! asegura que no es nulo (validado por el form)
        type: formValue.type as any, // Casteo al tipo específico
        horizon: formValue.horizon as any,
        progress: 0,         // Empieza en 0%
        status: 'activa',    // Empieza activa
        createdAt: new Date()
      };

      // Guardamos y redirigimos
      this.plannerService.addGoal(newGoal);
      this.router.navigate(['/goals']);
    }
  }

  cancel() {
    this.router.navigate(['/goals']);
  }
}
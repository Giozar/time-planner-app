import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { Activity } from '../../../core/models/activity.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-activity-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './activity-form.component.html',
  styleUrl: './activity-form.component.css'
})
export class ActivityFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  private typeSub?: Subscription;

  goalId: string | null = null;
  
  // Fecha mínima para el input date (hoy)
  minDate = new Date().toISOString().split('T')[0];

  activityForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    type: ['simple', Validators.required],
    level: ['urgente_directo', Validators.required],
    // Validamos el Deadline obligatorio
    deadline: ['', Validators.required], 
    // Tiempo inicia requerido porque el tipo por defecto es 'simple'
    timeRequired: [30, [Validators.required, Validators.min(1)]],
    days: ['L,M,X,J,V', Validators.required]
  });

  // Getter para usar en el HTML fácilmente
  get isComposite() {
    return this.activityForm.get('type')?.value === 'compuesta';
  }

  ngOnInit() {
    this.goalId = this.route.snapshot.paramMap.get('id');
    if (!this.goalId) {
      this.router.navigate(['/goals']);
      return;
    }

    // --- LÓGICA CONDICIONAL ---
    // Escuchamos cambios en el tipo de actividad
    this.typeSub = this.activityForm.get('type')?.valueChanges.subscribe(value => {
      const timeControl = this.activityForm.get('timeRequired');
      
      if (value === 'compuesta') {
        // Si es compuesta, el tiempo no aplica
        timeControl?.disable();
        timeControl?.clearValidators();
        timeControl?.setValue(null); // Opcional: limpiar valor
      } else {
        // Si es simple, el tiempo es obligatorio
        timeControl?.enable();
        timeControl?.setValidators([Validators.required, Validators.min(1)]);
        timeControl?.setValue(30); // Restaurar un valor por defecto
      }
      
      // Actualizar estado del formulario
      timeControl?.updateValueAndValidity();
    });
  }

  ngOnDestroy() {
    // Buena práctica: desuscribirse para evitar memory leaks
    this.typeSub?.unsubscribe();
  }

  onSubmit() {
    if (this.activityForm.valid && this.goalId) {
      const formValue = this.activityForm.value;

      const newActivity: Activity = {
        id: crypto.randomUUID(),
        goalId: this.goalId,
        title: formValue.title!,
        type: formValue.type as any,
        level: formValue.level as any,
        deadline: formValue.deadline!, // Ahora es obligatorio
        // Si está deshabilitado (compuesta), timeRequired será undefined, lo cual es correcto
        totalTimeRequiredMin: formValue.timeRequired || 0, 
        allowedDays: formValue.days!,
        status: 'pendiente'
      };

      this.plannerService.addActivity(newActivity);
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
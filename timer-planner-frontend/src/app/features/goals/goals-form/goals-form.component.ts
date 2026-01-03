import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router'; // Importar ActivatedRoute
import { PlannerService } from '../../../core/services/planner.service';
import { Goal } from '../../../core/models/goal.model';

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
  private route = inject(ActivatedRoute); // Inyectar ruta activa

  isEditMode = false;
  goalId: string | null = null;
  
  // Guardamos la fecha de creación original para no perderla al editar
  private originalCreatedAt: Date = new Date();
  private originalProgress: number = 0;
  private originalStatus: any = 'activa';

  goalForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    type: ['trabajo', Validators.required],
    horizon: ['mediano', Validators.required]
  });

  ngOnInit() {
    // Verificar si hay un ID en la URL
    this.goalId = this.route.snapshot.paramMap.get('id');
    
    if (this.goalId) {
      this.isEditMode = true;
      this.loadGoalData(this.goalId);
    }
  }

  private loadGoalData(id: string) {
    // Buscamos la meta en el servicio
    const goal = this.plannerService.goals().find(g => g.id === id);
    
    if (goal) {
      // Rellenamos el formulario
      this.goalForm.patchValue({
        title: goal.title,
        type: goal.type as any, // Cast necesario por el select
        horizon: goal.horizon as any
      });

      // Guardamos datos que no están en el form pero debemos preservar
      this.originalCreatedAt = goal.createdAt;
      this.originalProgress = goal.progress;
      this.originalStatus = goal.status;
    } else {
      // Si el ID no existe, volver a la lista
      this.router.navigate(['/goals']);
    }
  }

  onSubmit() {
    if (this.goalForm.valid) {
      const formValue = this.goalForm.value;

      if (this.isEditMode && this.goalId) {
        // --- MODO EDICIÓN ---
        const updatedGoal: Goal = {
          id: this.goalId, // Mismo ID
          title: formValue.title!,
          type: formValue.type as any,
          horizon: formValue.horizon as any,
          progress: this.originalProgress, // Mantenemos progreso
          status: this.originalStatus,     // Mantenemos estado
          createdAt: this.originalCreatedAt // Mantenemos fecha
        };
        
        this.plannerService.updateGoal(updatedGoal);
        // Volvemos al detalle de esa meta
        this.router.navigate(['/goals', this.goalId]);

      } else {
        // --- MODO CREAR (Lo que ya tenías) ---
        const newGoal: Goal = {
          id: crypto.randomUUID(),
          title: formValue.title!,
          type: formValue.type as any,
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
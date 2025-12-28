import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';

@Component({
  selector: 'app-goal-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './goal-detail.component.html',
  styleUrl: './goal-detail.component.css'
})
export class GoalDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private plannerService = inject(PlannerService);

  // 1. Obtener el ID de la URL
  goalId = this.route.snapshot.paramMap.get('id');

  // 2. Buscar la meta específica usando Signals
  goal = computed(() => 
    this.plannerService.goals().find(g => g.id === this.goalId)
  );

  // 3. Filtrar las actividades que pertenecen a esta meta
  activities = computed(() => 
    this.plannerService.activities().filter(a => a.goalId === this.goalId)
  );

  // Si no encuentra la meta (ej: url manual errónea), volvemos
  ngOnInit() {
    if (!this.goal()) {
      this.router.navigate(['/goals']);
    }
  }
}
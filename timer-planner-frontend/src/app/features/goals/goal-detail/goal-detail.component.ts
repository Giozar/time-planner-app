import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-goal-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './goal-detail.component.html',
  styleUrl: './goal-detail.component.css',
})
export class GoalDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private plannerService = inject(PlannerService);

  goalId = this.route.snapshot.paramMap.get('id');

  goal = computed(() => this.plannerService.goals().find((g) => g.id === this.goalId));

  // Usamos las actividades "extendidas" (con tiempos calculados)
  activities = computed(() =>
    this.plannerService.extendedActivities().filter((a) => a.goalId === this.goalId)
  );

  // Obtenemos TODAS las subactividades para pintarlas dentro de sus padres
  allSubActivities = this.plannerService.subActivities;

  // Helper para filtrar subactividades en el HTML
  getSubtasks(activityId: string) {
    return this.allSubActivities().filter((s) => s.activityId === activityId);
  }

  ngOnInit() {
    if (!this.goal()) {
      this.router.navigate(['/goals']);
    }
  }
}

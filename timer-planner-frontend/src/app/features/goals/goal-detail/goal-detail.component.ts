import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Activity, SubActivity } from '../../../core/models/activity.model';

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
  private dialogService = inject(NativeDialogService);

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

  async onDeleteActivity(activity: Activity) {
    const subCount = this.plannerService.getSubActivitiesCount(activity.id);
    let message = `¿Estás seguro de que quieres eliminar la actividad "${activity.title}"?`;
    
    if (subCount > 0) {
      message += `\n\nADVERTENCIA: Esta actividad tiene ${subCount} paso(s) que también serán eliminados.`;
    }

    const confirmed = await this.dialogService.confirm(
      '¿Eliminar Actividad?',
      message,
      { confirmText: 'Eliminar', isDanger: true }
    );

    if (confirmed) {
      this.plannerService.deleteActivity(activity.id);
    }
  }

  async onDeleteSubActivity(sub: SubActivity) {
    const confirmed = await this.dialogService.confirm(
      '¿Eliminar Paso?',
      `¿Estás seguro de que quieres eliminar el paso "${sub.title}"?`,
      { confirmText: 'Eliminar', isDanger: true }
    );

    if (confirmed) {
      this.plannerService.deleteSubActivity(sub.id);
    }
  }
}

import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Activity, SubActivity } from '../../../core/models/activity.model';

@Component({
  selector: 'app-objective-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './objective-detail.component.html',
  styleUrl: './objective-detail.component.css'
})
export class ObjectiveDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private plannerService = inject(PlannerService);
  private dialogService = inject(NativeDialogService);

  objectiveId = this.route.snapshot.paramMap.get('id');

  objective = computed(() => this.plannerService.objectives().find((o) => o.id === this.objectiveId));
  
  goal = computed(() => {
    const obj = this.objective();
    return obj ? this.plannerService.goals().find(g => g.id === obj.goalId) : null;
  });

  activities = computed(() =>
    this.plannerService.activities().filter((a) => a.objectiveId === this.objectiveId)
  );

  allSubActivities = this.plannerService.subActivities;

  getSubtasks(activityId: string) {
    return this.allSubActivities().filter((s) => s.activityId === activityId);
  }

  ngOnInit() {
    if (!this.objective()) {
      this.router.navigate(['/goals']);
    }
  }

  async onDeleteActivity(activity: Activity) {
    const confirmed = await this.dialogService.confirm(
      '¿Eliminar Tarea?',
      `¿Estás seguro de que quieres eliminar la tarea "${activity.title}"?`,
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

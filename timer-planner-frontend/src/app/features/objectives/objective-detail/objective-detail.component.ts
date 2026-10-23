import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Activity, ActivityStatus, ActivityType, SubActivity } from '../../../core/models/activity.model';
import { DeletableType } from '../../../core/models/deletion-impact.model';
import { canCloseObjective, effectiveActivityDeadline, isOverdue } from '../../../core/rules';
import { DateUtils } from '../../../core/utils/date.utils';
import {
  ACTIVITY_COMPLEXITY_LABELS, ACTIVITY_CRITICALITY_LABELS, ACTIVITY_PRIORITY_LABELS,
  ACTIVITY_RECURRENCE_LABELS, ACTIVITY_STATUS_LABELS, OBJECTIVE_NATURE_LABELS, OBJECTIVE_STATUS_LABELS,
} from '../../../core/i18n/labels';
import { LabelPipe } from '../../../shared/pipes/label.pipe';

@Component({
  selector: 'app-objective-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LabelPipe],
  templateUrl: './objective-detail.component.html',
  styleUrl: './objective-detail.component.css'
})
export class ObjectiveDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private plannerService = inject(PlannerService);
  private dialogService = inject(NativeDialogService);

  objectiveId = this.route.snapshot.paramMap.get('id');

  readonly natureLabels = OBJECTIVE_NATURE_LABELS;
  readonly objectiveStatusLabels = OBJECTIVE_STATUS_LABELS;
  readonly priorityLabels = ACTIVITY_PRIORITY_LABELS;
  readonly criticalityLabels = ACTIVITY_CRITICALITY_LABELS;
  readonly complexityLabels = ACTIVITY_COMPLEXITY_LABELS;
  readonly recurrenceLabels = ACTIVITY_RECURRENCE_LABELS;
  readonly statusLabels = ACTIVITY_STATUS_LABELS;
  readonly ActivityType = ActivityType;
  readonly ActivityStatus = ActivityStatus;

  today = DateUtils.getTodayISO();

  /** Sesiones realizadas y totales de un plan, para «x / y». */
  sessionCount(planId: string) {
    return this.plannerService.sessionCounts().get(planId) ?? { done: 0, total: 0 };
  }

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

  canClose = computed(() => {
    const obj = this.objective();
    return !!obj && canCloseObjective(obj);
  });

  /** Estado a mostrar: `OVERDUE` es derivado, nunca se almacena (RN-58). */
  displayStatus(activity: Activity): ActivityStatus {
    return isOverdue(activity, this.deadlineOf(activity), this.today) ? ActivityStatus.OVERDUE : activity.status;
  }

  /** Deadline efectivo de la tarea: el propio o el del objetivo (RN-14). */
  deadlineOf(activity: Activity): string {
    const obj = this.objective();
    return obj ? effectiveActivityDeadline(activity, obj) : (activity.deadline ?? '');
  }

  closeObjective() {
    if (this.objectiveId) this.plannerService.closeObjective(this.objectiveId);
  }

  togglePause(activity: Activity) {
    if (activity.status === ActivityStatus.PAUSED) {
      this.plannerService.resumeActivity(activity.id);
    } else {
      this.plannerService.pauseActivity(activity.id);
    }
  }

  ngOnInit() {
    if (!this.objective()) {
      this.router.navigate(['/goals']);
    }
  }

  async onDeleteActivity(activity: Activity) {
    const impact = this.plannerService.deletionImpact(DeletableType.ACTIVITY, activity.id);
    if (impact && await this.dialogService.confirmDelete(DeletableType.ACTIVITY, impact)) {
      this.plannerService.deleteActivity(activity.id);
    }
  }

  async onDeleteSubActivity(sub: SubActivity) {
    const impact = this.plannerService.deletionImpact(DeletableType.STEP, sub.id);
    if (impact && await this.dialogService.confirmDelete(DeletableType.STEP, impact)) {
      this.plannerService.deleteSubActivity(sub.id);
    }
  }
}

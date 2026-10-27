import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Activity, ActivityStatus, ActivityType, SubActivity, SubActivityStatus } from '../../../core/models/activity.model';
import { DeletableType } from '../../../core/models/deletion-impact.model';
import { effectiveActivityDeadline, hasOpenPause, isClosed } from '../../../core/rules';
import { DateUtils } from '../../../core/utils/date.utils';
import {
  ACTIVITY_COMPLEXITY_LABELS,
  ACTIVITY_RECURRENCE_LABELS, ACTIVITY_STATUS_LABELS, CLOSURE_TYPE_LABELS, OBJECTIVE_NATURE_LABELS,
  OBJECTIVE_STATUS_LABELS, SUBACTIVITY_STATUS_LABELS,
} from '../../../core/i18n/labels';
import { LifecycleActionsService } from '../../../core/services/lifecycle-actions.service';
import { ProductivityPipe } from '../../../shared/pipes/productivity.pipe';
import { ConsistencyPipe } from '../../../shared/pipes/consistency.pipe';
import { TaskTagsComponent } from '../../../shared/components/task-tags/task-tags.component';
import { ProgressBarComponent } from '../../../shared/components/progress-bar/progress-bar.component';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { ResultPipe } from '../../../shared/pipes/result.pipe';

@Component({
  selector: 'app-objective-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LabelPipe, ConsistencyPipe, ProductivityPipe, ResultPipe, TaskTagsComponent, ProgressBarComponent],
  templateUrl: './objective-detail.component.html',
  styleUrl: './objective-detail.component.css'
})
export class ObjectiveDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private plannerService = inject(PlannerService);
  private dialogService = inject(NativeDialogService);
  private lifecycle = inject(LifecycleActionsService);

  objectiveId = this.route.snapshot.paramMap.get('id');

  readonly natureLabels = OBJECTIVE_NATURE_LABELS;
  readonly objectiveStatusLabels = OBJECTIVE_STATUS_LABELS;
  readonly complexityLabels = ACTIVITY_COMPLEXITY_LABELS;
  readonly recurrenceLabels = ACTIVITY_RECURRENCE_LABELS;
  readonly statusLabels = ACTIVITY_STATUS_LABELS;
  readonly stepStatusLabels = SUBACTIVITY_STATUS_LABELS;
  readonly ActivityType = ActivityType;
  readonly closureLabels = CLOSURE_TYPE_LABELS;
  readonly SubActivityStatus = SubActivityStatus;
  readonly isClosed = isClosed;
  readonly hasOpenPause = hasOpenPause;

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

  /** Se puede cerrar en cualquier momento mientras siga abierto (RN-77). */
  canClose = computed(() => {
    const obj = this.objective();
    return !!obj && !isClosed(obj);
  });

  /** Deadline efectivo de la tarea: el propio o el del objetivo (RN-14). */
  deadlineOf(activity: Activity): string {
    const obj = this.objective();
    return obj ? effectiveActivityDeadline(activity, obj) : (activity.deadline ?? '');
  }

  /** Con la productividad al 100 % y sesiones pendientes se sugiere cerrar; no se cierra solo (RN-77). */
  suggestsClose(item: { id: string; progress: number; closure?: unknown }): boolean {
    const productivity = this.plannerService.productivity().get(item.id)?.percentage;
    return !item.closure && item.progress < 100 && productivity !== null && productivity !== undefined && productivity >= 100;
  }

  closeObjective() {
    const obj = this.objective();
    if (obj) this.lifecycle.close('objective', obj.id, obj.title);
  }

  reopenObjective() {
    const obj = this.objective();
    if (obj) this.lifecycle.reopen('objective', obj.id, obj.title);
  }

  togglePauseObjective() {
    const obj = this.objective();
    if (obj) this.lifecycle.togglePause('objective', obj.id, hasOpenPause(obj.pauses));
  }

  closeActivity(activity: Activity) {
    this.lifecycle.close('activity', activity.id, activity.title);
  }

  reopenActivity(activity: Activity) {
    this.lifecycle.reopen('activity', activity.id, activity.title);
  }

  togglePause(activity: Activity) {
    this.lifecycle.togglePause('activity', activity.id, hasOpenPause(activity.pauses));
  }

  closeStep(sub: SubActivity) {
    this.lifecycle.close('step', sub.id, sub.title);
  }

  reopenStep(sub: SubActivity) {
    this.lifecycle.reopen('step', sub.id, sub.title);
  }

  togglePauseStep(sub: SubActivity) {
    this.lifecycle.togglePause('step', sub.id, hasOpenPause(sub.pauses));
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

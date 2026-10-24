import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Activity, ActivityStatus, ActivityType, SubActivity } from '../../../core/models/activity.model';
import { DeletableType } from '../../../core/models/deletion-impact.model';
import { effectiveActivityDeadline, isClosed } from '../../../core/rules';
import { DateUtils } from '../../../core/utils/date.utils';
import {
  ACTIVITY_COMPLEXITY_LABELS, ACTIVITY_CRITICALITY_LABELS, ACTIVITY_PRIORITY_LABELS,
  ACTIVITY_RECURRENCE_LABELS, ACTIVITY_STATUS_LABELS, OBJECTIVE_NATURE_LABELS, OBJECTIVE_STATUS_LABELS,
  SUBACTIVITY_STATUS_LABELS,
} from '../../../core/i18n/labels';
import { ConsistencyPipe } from '../../../shared/pipes/consistency.pipe';
import { LabelPipe } from '../../../shared/pipes/label.pipe';

@Component({
  selector: 'app-objective-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LabelPipe, ConsistencyPipe],
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
  readonly stepStatusLabels = SUBACTIVITY_STATUS_LABELS;
  readonly ActivityType = ActivityType;
  readonly ActivityStatus = ActivityStatus;
  readonly isClosed = isClosed;

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

  /** Se puede cerrar en cualquier momento mientras siga abierto y tenga tareas (RN-77). */
  canClose = computed(() => {
    const obj = this.objective();
    return !!obj && !isClosed(obj) && this.activities().length > 0;
  });

  /** Estado a mostrar (RN-31). */
  displayStatus(activity: Activity): ActivityStatus {
    return activity.status;
  }

  /** Deadline efectivo de la tarea: el propio o el del objetivo (RN-14). */
  deadlineOf(activity: Activity): string {
    const obj = this.objective();
    return obj ? effectiveActivityDeadline(activity, obj) : (activity.deadline ?? '');
  }

  /** Cierre manual (RN-77 a RN-79): lo abierto queda completado y las sesiones que faltan dejan de contar. */
  async closeObjective() {
    const obj = this.objective();
    if (obj && await this.confirmClose('Cerrar objetivo', `"${obj.title}" y todas sus tareas y pasos abiertos`)) {
      this.plannerService.closeObjective(obj.id);
    }
  }

  async closeActivity(activity: Activity) {
    const what = activity.type === ActivityType.COMPOSITE ? `"${activity.title}" y sus pasos abiertos` : `"${activity.title}"`;
    if (await this.confirmClose('Cerrar tarea', what)) this.plannerService.closeActivity(activity.id);
  }

  async closeStep(sub: SubActivity) {
    if (await this.confirmClose('Cerrar paso', `"${sub.title}"`)) this.plannerService.closeStep(sub.id);
  }

  private confirmClose(title: string, what: string): Promise<boolean> {
    return this.dialogService.confirm(title,
      `Se cerrará ${what}: lo que siga abierto quedará completado aunque falten sesiones.\n` +
      'Las sesiones que faltan se mostrarán completas y no contarán para la constancia.\n' +
      'Después ya no podrás cambiar su fecha límite ni su plan.',
      { confirmText: 'Cerrar' });
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

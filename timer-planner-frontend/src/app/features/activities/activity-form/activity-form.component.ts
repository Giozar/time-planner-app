import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import {
  Activity, ActivityComplexity, ActivityCriticality, ActivityPriority, ActivityStatus, ActivityType,
  ExecutionPlan, ExecutionPlanType, WeekDay, WEEK_DAYS_ORDER
} from '../../../core/models/activity.model';
import { ExecutionSession, SessionStatus } from '../../../core/models/session.model';
import { DateUtils } from '../../../core/utils/date.utils';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { effectiveDeadline, isClosed, regenerateFutureSessions } from '../../../core/rules';
import {
  ACTIVITY_COMPLEXITY_LABELS, ACTIVITY_CRITICALITY_LABELS, ACTIVITY_PRIORITY_LABELS,
  ACTIVITY_TYPE_LABELS, EXECUTION_PLAN_TYPE_LABELS, WEEK_DAY_LABELS
} from '../../../core/i18n/labels';
import { LabelPipe } from '../../../shared/pipes/label.pipe';

@Component({
  selector: 'app-activity-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LabelPipe],
  templateUrl: './activity-form.component.html',
  styleUrl: './activity-form.component.css'
})
export class ActivityFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(NativeDialogService);

  objectiveId: string | null = null;
  activityId: string | null = null;
  isEditMode = false;
  /** Cerrada: su tipo, deadline y plan ya no se editan (RN-80). */
  closed = false;
  minDate = DateUtils.getTodayISO();

  // Datos originales para no perder el progreso al editar
  private originalPlan: ExecutionPlan | null = null;
  private originalProgress = 0;
  private originalStatus: ActivityStatus = ActivityStatus.OPEN;
  private originalDeadline: string | undefined;

  readonly types = Object.values(ActivityType);
  readonly priorities = Object.values(ActivityPriority);
  readonly criticalities = Object.values(ActivityCriticality);
  readonly complexities = Object.values(ActivityComplexity);
  readonly planTypes = Object.values(ExecutionPlanType);
  readonly weekDays = WEEK_DAYS_ORDER;

  readonly typeLabels = ACTIVITY_TYPE_LABELS;
  readonly priorityLabels = ACTIVITY_PRIORITY_LABELS;
  readonly criticalityLabels = ACTIVITY_CRITICALITY_LABELS;
  readonly complexityLabels = ACTIVITY_COMPLEXITY_LABELS;
  readonly planTypeLabels = EXECUTION_PLAN_TYPE_LABELS;
  readonly weekDayLabels = WEEK_DAY_LABELS;

  // La recurrencia no se elige: se calcula del plan (RN-47).
  activityForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    priority: [ActivityPriority.MEDIUM, Validators.required],
    criticality: [ActivityCriticality.FLEXIBLE, Validators.required],
    complexity: [ActivityComplexity.MEDIUM, Validators.required],
    type: [ActivityType.SIMPLE, Validators.required],
    deadline: [''], // opcional: si se omite hereda el del objetivo (RN-14)

    planType: [ExecutionPlanType.WEEKLY_PATTERN],
    duration: [60, [Validators.required, Validators.min(5)]], // RN-15

    patternDays: this.fb.array([]),
    specificDates: this.fb.array([])
  });

  get isSimple() { return this.activityForm.get('type')?.value === ActivityType.SIMPLE; }
  get isPattern() { return this.activityForm.get('planType')?.value === ExecutionPlanType.WEEKLY_PATTERN; }
  get objectiveDeadline(): string {
    return this.plannerService.objectives().find(o => o.id === this.objectiveId)?.deadline ?? '';
  }
  /** Tope de las fechas: el deadline propio o, si falta, el del objetivo (RN-48). */
  get deadlineValue(): string { return this.activityForm.get('deadline')?.value || this.objectiveDeadline; }
  get specificDatesArray() { return this.activityForm.get('specificDates') as FormArray; }
  get patternDaysArray() { return this.activityForm.get('patternDays') as FormArray; }

  ngOnInit() {
    this.objectiveId = this.route.snapshot.paramMap.get('objectiveId');
    this.activityId = this.route.snapshot.paramMap.get('activityId');

    if (!this.objectiveId && !this.activityId) {
      this.router.navigate(['/goals']);
      return;
    }

    if (this.activityId) {
      this.isEditMode = true;
      this.loadActivityData(this.activityId);
    }
  }

  private loadActivityData(id: string) {
    const activity = this.plannerService.activities().find(a => a.id === id);

    if (!activity) {
      this.router.navigate(['/goals']);
      return;
    }
    this.objectiveId = activity.objectiveId;

    this.originalProgress = activity.progress;
    this.originalStatus = activity.status;
    this.originalDeadline = activity.deadline;
    this.originalPlan = activity.executionPlan;

    this.activityForm.patchValue({
      title: activity.title,
      priority: activity.priority,
      criticality: activity.criticality,
      complexity: activity.complexity,
      type: activity.type,
      deadline: activity.deadline ?? '',
      planType: activity.executionPlan?.type ?? ExecutionPlanType.WEEKLY_PATTERN,
      duration: activity.executionPlan?.durationPerExecutionMin ?? 60
    });

    this.closed = isClosed(activity);
    if (this.closed) {
      ['type', 'deadline', 'planType', 'duration'].forEach(name => this.activityForm.get(name)?.disable());
    }

    const plan = activity.executionPlan;
    if (activity.type === ActivityType.SIMPLE && plan) {
      if (plan.type === ExecutionPlanType.WEEKLY_PATTERN && plan.patternDays) {
        plan.patternDays.forEach(day => this.patternDaysArray.push(new FormControl(day)));
      }

      // Las sesiones pasadas, realizadas y movidas se conservan solas (RN-51, RN-82): el formulario solo edita las pendientes.
      if (plan.type === ExecutionPlanType.SPECIFIC_DATES) {
        this.plannerService.sessionsOf(plan.id)
          .filter(s => s.scheduledDate >= this.minDate && s.status === SessionStatus.PLANNED && !s.rescheduledFrom)
          .forEach(s => this.specificDatesArray.push(new FormControl(s.scheduledDate)));
      }
    }
  }

  isDayChecked(day: WeekDay): boolean {
    return this.patternDaysArray.value.includes(day);
  }

  onDayChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.checked) {
      this.patternDaysArray.push(new FormControl(input.value));
    } else {
      const index = this.patternDaysArray.value.indexOf(input.value);
      if (index >= 0) this.patternDaysArray.removeAt(index);
    }
  }

  addSpecificDate(dateInput: HTMLInputElement) {
    const date = dateInput.value;
    if (!date || this.specificDatesArray.value.includes(date)) return;

    if (date < this.minDate) {
      this.dialog.alert('Atención', 'La fecha no puede ser anterior a hoy.');
      return;
    }
    if (this.deadlineValue && date > this.deadlineValue) {
      this.dialog.alert('Atención', 'La fecha no puede ser posterior al deadline de la tarea.');
      return;
    }

    this.specificDatesArray.push(new FormControl(date));
    dateInput.value = '';
  }

  removeSpecificDate(index: number) {
    this.specificDatesArray.removeAt(index);
  }

  onSubmit() {
    this.saveActivity();
  }

  async saveActivity() {
    if (this.activityForm.invalid || !this.objectiveId) return;

    // RN-80: de una tarea cerrada solo se editan los textos y la clasificación.
    if (this.closed) {
      const original = this.plannerService.activities().find(a => a.id === this.activityId);
      if (!original) return;
      const raw = this.activityForm.getRawValue();
      this.plannerService.updateActivity({
        ...original, title: raw.title!, priority: raw.priority!, criticality: raw.criticality!, complexity: raw.complexity!,
      });
      this.router.navigate(['/objectives', this.objectiveId]);
      return;
    }

    const val = this.activityForm.value;
    const newType = val.type!;
    const ownDeadline = val.deadline || undefined;
    const deadline = effectiveDeadline({ deadline: ownDeadline }, this.objectiveDeadline);

    // RN-14: ningún deadline nuevo o modificado puede ser anterior a hoy.
    if (ownDeadline && ownDeadline < this.minDate && (!this.isEditMode || ownDeadline !== this.originalDeadline)) {
      this.dialog.alert('Atención', 'El deadline no puede ser anterior a hoy.');
      return;
    }

    let executionPlan: ExecutionPlan | null = null;
    let sessions: ExecutionSession[] | undefined;

    if (newType === ActivityType.SIMPLE) {
      const isPattern = val.planType === ExecutionPlanType.WEEKLY_PATTERN;
      const patternDays = (val.patternDays ?? []) as WeekDay[];
      const specificDates = [...((val.specificDates ?? []) as string[])].sort();

      if (isPattern && patternDays.length === 0) {
        this.dialog.alert('Atención', 'Selecciona al menos un día.');
        return;
      }
      if (!isPattern && specificDates.length === 0) {
        this.dialog.alert('Atención', 'Añade fechas específicas.');
        return;
      }

      const planId = this.originalPlan?.id ?? crypto.randomUUID();
      executionPlan = {
        id: planId,
        type: val.planType!,
        patternDays: isPattern ? patternDays : undefined,
        durationPerExecutionMin: val.duration!,
      };

      // RN-51: conserva las sesiones pasadas y realizadas y regenera las de hoy y futuras.
      sessions = regenerateFutureSessions(
        this.plannerService.sessionsOf(planId),
        { ...executionPlan, dates: isPattern ? undefined : specificDates },
        this.minDate,
        deadline,
        planId
      );

      // RN-20: el plan debe generar al menos una sesión desde hoy.
      if (!sessions.some(s => s.scheduledDate >= this.minDate)) {
        this.dialog.alert('Atención', 'El plan no genera ninguna fecha de ejecución válida antes del deadline.');
        return;
      }
    }

    // RN-39 / RN-40: confirmar el cambio de tipo solo si hay datos que perder.
    if (this.isEditMode && this.activityId) {
      const impact = this.plannerService.typeChangeImpact(this.activityId, newType);
      if (impact.needsConfirmation) {
        const message = newType === ActivityType.SIMPLE
          ? `Esta tarea tiene ${impact.stepsToDelete} paso(s).\nAl convertirla en simple, estos pasos se eliminarán.\n\n¿Confirmas que deseas continuar?`
          : `Esta tarea tiene ${impact.sessionsToLose} sesión(es) programada(s), ${impact.completedSessionsToLose} realizada(s).\nAl convertirla en compuesta, el plan y sus sesiones, con su tiempo realizado, se perderán.\n\n¿Confirmas que deseas continuar?`;

        const confirmed = await this.dialog.confirm('Cambio de Tipo Detectado', message, {
          confirmText: 'Convertir',
          isDanger: true
        });
        if (!confirmed) return;
      }
    }

    const activityData: Activity = {
      id: this.activityId || crypto.randomUUID(),
      objectiveId: this.objectiveId,
      title: val.title!,
      priority: val.priority!,
      criticality: val.criticality!,
      complexity: val.complexity!,
      type: newType,
      recurrence: null, // lo calcula el servicio (RN-47)
      deadline: ownDeadline,
      status: this.isEditMode ? this.originalStatus : ActivityStatus.OPEN,
      progress: this.isEditMode ? this.originalProgress : 0,
      executionPlan
    };

    const conflicts = this.isEditMode
      ? this.plannerService.updateActivity(activityData, sessions)
      : this.plannerService.addActivity(activityData, sessions);

    // RN-49: el guardado se rechaza y se muestran las fechas en conflicto.
    if (conflicts.length > 0) {
      this.dialog.alertDeadlineConflicts(conflicts);
      return;
    }

    this.router.navigate(['/objectives', this.objectiveId]);
  }

  cancel() {
    if (this.objectiveId) {
      this.router.navigate(['/objectives', this.objectiveId]);
    } else {
      this.router.navigate(['/goals']);
    }
  }
}

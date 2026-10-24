import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import {
  ActivityComplexity, ExecutionPlan, ExecutionPlanType, SubActivity, SubActivityStatus, WeekDay, WEEK_DAYS_ORDER
} from '../../../core/models/activity.model';
import { regenerateFutureSessions, effectiveActivityDeadline, effectiveDeadline, isClosed } from '../../../core/rules';
import { ACTIVITY_COMPLEXITY_LABELS, EXECUTION_PLAN_TYPE_LABELS, WEEK_DAY_LABELS } from '../../../core/i18n/labels';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { SessionStatus } from '../../../core/models/session.model';
import { DateUtils } from '../../../core/utils/date.utils';
import { NativeDialogService } from '../../../core/services/native-dialog.service';

@Component({
  selector: 'app-structure-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LabelPipe],
  templateUrl: './structure-form.component.html',
  styleUrl: './structure-form.component.css'
})
export class StructureFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(NativeDialogService);

  objectiveId: string | null = null;
  activityId: string | null = null;
  subActivityId: string | null = null;
  isEditMode = false;
  /** Cerrado: su deadline y su plan ya no se editan (RN-80). */
  closed = false;

  minDate = DateUtils.getTodayISO();

  // Guardar estado original
  private originalPlan: ExecutionPlan | null = null;
  private originalProgress = 0;
  private originalStatus: SubActivityStatus = SubActivityStatus.PENDING;

  readonly planTypes = Object.values(ExecutionPlanType);
  readonly complexities = Object.values(ActivityComplexity);
  readonly weekDays = WEEK_DAYS_ORDER;

  readonly planTypeLabels = EXECUTION_PLAN_TYPE_LABELS;
  readonly complexityLabels = ACTIVITY_COMPLEXITY_LABELS;
  readonly weekDayLabels = WEEK_DAY_LABELS;

  // El deadline es opcional: si se omite, hereda el efectivo de la tarea (RN-14, RN-48).
  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]], // RN-13
    complexity: [ActivityComplexity.MEDIUM, Validators.required],
    deadline: [''],
    planType: [ExecutionPlanType.WEEKLY_PATTERN],
    duration: [45, [Validators.required, Validators.min(5)]],
    patternDays: this.fb.array([]),
    specificDates: this.fb.array([])
  });

  get isPattern() { return this.form.get('planType')?.value === ExecutionPlanType.WEEKLY_PATTERN; }
  get specificDatesArray() { return this.form.get('specificDates') as FormArray; }
  get patternDaysArray() { return this.form.get('patternDays') as FormArray; }

  /** Tope de fechas: el deadline propio o, si falta, el de la tarea (RN-48). */
  get parentDeadline(): string {
    const activity = this.plannerService.activities().find(a => a.id === this.activityId);
    const objective = this.plannerService.objectives().find(o => o.id === activity?.objectiveId);
    return activity && objective ? effectiveActivityDeadline(activity, objective) : '';
  }
  get limitDate(): string {
    return this.form.get('deadline')?.value || this.parentDeadline;
  }

  ngOnInit() {
    this.objectiveId = this.route.snapshot.paramMap.get('objectiveId');
    this.activityId = this.route.snapshot.paramMap.get('activityId');
    this.subActivityId = this.route.snapshot.paramMap.get('stepId');

    if (!this.activityId || !this.objectiveId) {
      this.router.navigate(['/goals']);
      return;
    }

    if (this.subActivityId) {
      this.isEditMode = true;
      this.loadStepData(this.subActivityId);
    }
  }

  private loadStepData(id: string) {
    const sub = this.plannerService.subActivities().find(s => s.id === id);
    if (!sub) {
      this.cancel();
      return;
    }

    this.originalProgress = sub.progress;
    this.originalStatus = sub.status;
    this.originalPlan = sub.executionPlan;

    this.form.patchValue({
      title: sub.title,
      complexity: sub.complexity,
      deadline: sub.deadline ?? '',
      planType: sub.executionPlan.type,
      duration: sub.executionPlan.durationPerExecutionMin
    });

    this.closed = isClosed(sub);
    if (this.closed) {
      ['deadline', 'planType', 'duration'].forEach(name => this.form.get(name)?.disable());
    }

    if (sub.executionPlan.type === ExecutionPlanType.WEEKLY_PATTERN && sub.executionPlan.patternDays) {
      sub.executionPlan.patternDays.forEach(day => this.patternDaysArray.push(new FormControl(day)));
    } else if (sub.executionPlan.type === ExecutionPlanType.SPECIFIC_DATES) {
      // Las sesiones pasadas, realizadas y movidas se conservan solas (RN-51, RN-82): el formulario solo edita las pendientes.
      this.plannerService.sessionsOf(sub.executionPlan.id)
        .filter(s => s.scheduledDate >= this.minDate && s.status === SessionStatus.PLANNED && !s.rescheduledFrom)
        .forEach(s => this.specificDatesArray.push(new FormControl(s.scheduledDate)));
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
    if (this.limitDate && date > this.limitDate) {
      this.dialog.alert('Atención', 'La fecha no puede ser posterior al deadline del paso.');
      return;
    }

    this.specificDatesArray.push(new FormControl(date));
    dateInput.value = '';
  }

  removeSpecificDate(index: number) {
    this.specificDatesArray.removeAt(index);
  }

  onSubmit() {
    if (this.form.invalid || !this.activityId) return;

    // RN-80: de un paso cerrado solo se editan el título y la complejidad.
    if (this.closed) {
      const original = this.plannerService.subActivities().find(s => s.id === this.subActivityId);
      if (!original) return;
      const raw = this.form.getRawValue();
      this.plannerService.updateSubActivity({ ...original, title: raw.title!, complexity: raw.complexity! });
      this.router.navigate(['/objectives', this.objectiveId]);
      return;
    }

    const val = this.form.value;
    const ownDeadline = val.deadline || undefined;
    const parent = this.plannerService.activities().find(a => a.id === this.activityId);
    if (!parent) return;

    // RN-14: un deadline propio no puede ser anterior a hoy.
    if (ownDeadline && ownDeadline < this.minDate) {
      this.dialog.alert('Atención', 'El deadline no puede ser anterior a hoy.');
      return;
    }

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
    const executionPlan: ExecutionPlan = {
      id: planId,
      type: val.planType!,
      patternDays: isPattern ? patternDays : undefined,
      durationPerExecutionMin: val.duration!,
    };

    // RN-51: conserva las sesiones pasadas y realizadas y regenera las de hoy y futuras hasta el deadline efectivo.
    const sessions = regenerateFutureSessions(
      this.plannerService.sessionsOf(planId),
      { ...executionPlan, dates: isPattern ? undefined : specificDates },
      this.minDate,
      effectiveDeadline({ deadline: ownDeadline }, this.parentDeadline),
      planId
    );

    if (!sessions.some(s => s.scheduledDate >= this.minDate)) {
      this.dialog.alert('Atención', 'El plan no genera ninguna fecha de ejecución válida antes del deadline.');
      return;
    }

    const subData: SubActivity = {
      id: this.subActivityId || crypto.randomUUID(),
      activityId: this.activityId,
      title: val.title!,
      complexity: val.complexity!,
      deadline: ownDeadline,
      executionPlan,
      status: this.isEditMode ? this.originalStatus : SubActivityStatus.PENDING,
      progress: this.isEditMode ? this.originalProgress : 0
    };

    const conflicts = this.isEditMode
      ? this.plannerService.updateSubActivity(subData, sessions)
      : this.plannerService.addSubActivity(subData, sessions);

    // RN-48 / RN-49: el guardado se rechaza y se muestran las fechas en conflicto.
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
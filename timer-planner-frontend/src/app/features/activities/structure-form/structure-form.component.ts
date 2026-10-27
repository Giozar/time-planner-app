import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { PlannerService } from '../../../core/services/planner.service';
import {
  ActivityComplexity, ExecutionPlan, ExecutionPlanType, SubActivity, SubActivityStatus, WeekDay, WEEK_DAYS_ORDER
} from '../../../core/models/activity.model';
import { effectiveActivityDeadline, isClosed } from '../../../core/rules';
import { ACTIVITY_COMPLEXITY_LABELS, EXECUTION_PLAN_TYPE_LABELS, WEEK_DAY_LABELS } from '../../../core/i18n/labels';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { SessionStatus } from '../../../core/models/session.model';
import { DateUtils } from '../../../core/utils/date.utils';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { PlanSessionsEditor } from '../plan-sessions-editor';
import { SessionListComponent } from '../session-list/session-list.component';

@Component({
  selector: 'app-structure-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LabelPipe, SessionListComponent],
  templateUrl: './structure-form.component.html',
  styleUrl: './structure-form.component.css'
})
export class StructureFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(NativeDialogService);
  private destroyRef = inject(DestroyRef);

  objectiveId: string | null = null;
  activityId: string | null = null;
  subActivityId: string | null = null;
  isEditMode = false;
  /** Cerrado: su deadline y su plan ya no se editan (RN-80). */
  closed = false;

  minDate = DateUtils.getTodayISO();

  /** Sesiones del plan que se ajustan antes de guardar (CU-31). */
  readonly editor = new PlanSessionsEditor(crypto.randomUUID(), this.minDate);

  // Guardar estado original
  private originalProgress = 0;
  private originalStatus: SubActivityStatus = SubActivityStatus.OPEN;

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
    sameTime: [true], // «mismo tiempo»: todas las sesiones pendientes usan la duración (CU-31)
    patternDays: this.fb.array([]),
    specificDates: this.fb.array([])
  });

  get isPattern() { return this.form.get('planType')?.value === ExecutionPlanType.WEEKLY_PATTERN; }
  get sameTime() { return !!this.form.get('sameTime')?.value; }
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
    this.watchPlan();
  }

  /** Al cambiar el plan se regeneran las sesiones; al cambiar el tiempo con «mismo tiempo», todas lo toman. */
  private watchPlan() {
    merge(this.form.get('planType')!.valueChanges, this.form.get('deadline')!.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshSessions());
    merge(this.form.get('duration')!.valueChanges, this.form.get('sameTime')!.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.sameTime) this.editor.applySameTime(Number(this.form.get('duration')?.value));
      });
  }

  /** Regenera las sesiones de hoy en adelante con el plan del formulario (RN-21, RN-22, RN-51). */
  private refreshSessions() {
    const val = this.form.getRawValue();
    const isPattern = val.planType === ExecutionPlanType.WEEKLY_PATTERN;
    this.editor.regenerate({
      type: val.planType!,
      patternDays: isPattern ? (val.patternDays as WeekDay[]) : undefined,
      dates: isPattern ? undefined : [...(val.specificDates as string[])].sort(),
      durationPerExecutionMin: Number(val.duration),
    }, this.limitDate, this.sameTime);
  }

  private loadStepData(id: string) {
    const sub = this.plannerService.subActivities().find(s => s.id === id);
    if (!sub) {
      this.cancel();
      return;
    }

    this.originalProgress = sub.progress;
    this.originalStatus = sub.status;
    const plan = sub.executionPlan;
    const sessions = this.plannerService.sessionsOf(plan.id);
    this.editor.planId = plan.id;
    this.editor.load(sessions);

    this.form.patchValue({
      title: sub.title,
      complexity: sub.complexity,
      deadline: sub.deadline ?? '',
      planType: plan.type,
      duration: plan.durationPerExecutionMin,
      // «Mismo tiempo» si todas las pendientes de hoy en adelante tienen la duración del plan.
      sameTime: sessions
        .filter(s => s.status === SessionStatus.PLANNED && s.scheduledDate >= this.minDate)
        .every(s => s.plannedMinutes === plan.durationPerExecutionMin),
    });

    this.closed = isClosed(sub);
    if (this.closed) {
      ['deadline', 'planType', 'duration'].forEach(name => this.form.get(name)?.disable());
    }

    if (plan.type === ExecutionPlanType.WEEKLY_PATTERN && plan.patternDays) {
      plan.patternDays.forEach(day => this.patternDaysArray.push(new FormControl(day)));
    } else if (plan.type === ExecutionPlanType.SPECIFIC_DATES) {
      // Las fechas del plan son las pendientes que generó; las pasadas, realizadas, movidas y agregadas se conservan solas (RN-51).
      sessions
        .filter(s => s.scheduledDate >= this.minDate && s.status === SessionStatus.PLANNED && !s.rescheduledFrom && !s.manual)
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
    this.refreshSessions();
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
    this.editor.include(date);
    this.refreshSessions();
    dateInput.value = '';
  }

  /** Borra una sesión de la lista; si era una fecha específica del plan, también sale del plan (RN-83). */
  removeSession(id: string) {
    const generated = this.editor.remove(id);
    const index = generated ? this.specificDatesArray.value.indexOf(generated) : -1;
    if (!this.isPattern && index >= 0) this.specificDatesArray.removeAt(index);
  }

  /** Agrega una sesión suelta con la duración del plan (RN-83). */
  addSession(date: string) {
    this.editor.add(date, Number(this.form.get('duration')?.value));
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

    const executionPlan: ExecutionPlan = {
      id: this.editor.planId,
      type: val.planType!,
      patternDays: isPattern ? patternDays : undefined,
      durationPerExecutionMin: val.duration!,
    };

    // RN-51: la lista ya conserva las pasadas, hechas, movidas y agregadas, y sigue el plan desde hoy.
    // Si todavía no se generó (por ejemplo, se eligieron los días antes de escribir el tiempo), se genera ahora.
    if (!this.editor.upcoming().length) this.refreshSessions();
    const sessions = this.editor.sessions();

    // RN-20: el plan debe generar al menos una sesión desde hoy.
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
      status: this.isEditMode ? this.originalStatus : SubActivityStatus.OPEN,
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
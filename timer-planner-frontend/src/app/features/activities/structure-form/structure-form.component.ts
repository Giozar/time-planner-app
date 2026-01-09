import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { SubActivity, WeekDay, ExecutionPlan, WEEK_DAYS, EXECUTION_PLAN_TYPE_OPTIONS } from '../../../core/models/activity.model';
import { DateUtils } from '../../../core/utils/date.utils';
import { NativeDialogService } from '../../../core/services/native-dialog.service';

@Component({
  selector: 'app-structure-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './structure-form.component.html',
  styleUrl: './structure-form.component.css'
})
export class StructureFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private plannerService = inject(PlannerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(NativeDialogService);

  goalId: string | null = null;
  activityId: string | null = null;
  subActivityId: string | null = null;
  isEditMode = false;
  
  minDate = DateUtils.getTodayISO();

  // Guardar estado original
  private originalCompletedDates: string[] = [];
  private originalProgress: number = 0;
  private originalStatus: any = 'pendiente';

  readonly planTypeOptions = EXECUTION_PLAN_TYPE_OPTIONS;
  readonly weekDays = WEEK_DAYS;

  form = this.fb.group({
    title: ['', Validators.required],
    deadline: ['', Validators.required],
    planType: ['patron_repetitivo'], 
    duration: [45, [Validators.required, Validators.min(5)]],
    patternDays: this.fb.array([]),
    specificDates: this.fb.array([])
  });

  get isPattern() { return this.form.get('planType')?.value === 'patron_repetitivo'; }
  get specificDatesArray() { return this.form.get('specificDates') as FormArray; }
  get patternDaysArray() { return this.form.get('patternDays') as FormArray; }

  ngOnInit() {
    this.goalId = this.route.snapshot.paramMap.get('goalId');
    this.activityId = this.route.snapshot.paramMap.get('activityId');
    this.subActivityId = this.route.snapshot.paramMap.get('stepId'); // Capturamos ID del paso

    if (!this.activityId || !this.goalId) {
      this.router.navigate(['/goals']);
      return;
    }

    if (this.subActivityId) {
      this.isEditMode = true;
      this.loadStepData(this.subActivityId);
    }
  }

  // --- Cargar datos ---
  private loadStepData(id: string) {
    const sub = this.plannerService.subActivities().find(s => s.id === id);
    if (!sub) {
      this.cancel();
      return;
    }

    // Guardar originales
    this.originalProgress = sub.progress;
    this.originalStatus = sub.status;
    this.originalCompletedDates = sub.executionPlan.completedDates || [];

    // Rellenar formulario
    this.form.patchValue({
      title: sub.title,
      deadline: sub.deadline,
      planType: sub.executionPlan.type,
      duration: sub.executionPlan.durationPerExecutionMin
    });

    // Restaurar Arrays
    if (sub.executionPlan.type === 'patron_repetitivo' && sub.executionPlan.patternDays) {
      const checkArray = this.patternDaysArray;
      checkArray.clear();
      sub.executionPlan.patternDays.forEach(day => checkArray.push(new FormControl(day)));
    } else if (sub.executionPlan.type === 'fechas_especificas' && sub.executionPlan.dates) {
      const datesArray = this.specificDatesArray;
      datesArray.clear();
      sub.executionPlan.dates.forEach(date => datesArray.push(new FormControl(date)));
    }
  }

  // --- UI Helpers ---
  isDayChecked(dayValue: string): boolean {
    return this.patternDaysArray.value.includes(dayValue);
  }

  onDayChange(e: any) {
    const checkArray = this.patternDaysArray;
    if (e.target.checked) {
      checkArray.push(new FormControl(e.target.value));
    } else {
      let i = 0;
      checkArray.controls.forEach((item: any) => {
        if (item.value == e.target.value) {
          checkArray.removeAt(i);
          return;
        }
        i++;
      });
    }
  }

  addSpecificDate(dateInput: HTMLInputElement) {
    const date = dateInput.value;
    if (date && !this.specificDatesArray.value.includes(date)) {
      this.specificDatesArray.push(new FormControl(date));
      dateInput.value = '';
    }
  }

  removeSpecificDate(index: number) {
    this.specificDatesArray.removeAt(index);
  }

  // --- Guardar ---
  onSubmit() {
    if (this.form.invalid || !this.activityId) return;

    const val = this.form.value;
    let finalDates: string[] = [];

    // Lógica de fechas (Igual que antes)
    if (val.planType === 'patron_repetitivo') {
      const daysSelected = val.patternDays as WeekDay[];
      if (daysSelected.length === 0) {
        this.dialog.alert('Atención', 'Selecciona al menos un día.');
        return;
      }
      finalDates = DateUtils.generateDatesFromPattern(
        DateUtils.getTodayISO(),
        val.deadline!,
        daysSelected
      );
    } else {
      finalDates = (val.specificDates as string[]).sort();
      if (finalDates.length === 0) {
        this.dialog.alert('Atención', 'Añade fechas específicas.');
        return;
      }
    }

    if (finalDates.length === 0) {
      this.dialog.alert('Atención', 'No se generaron fechas válidas.');
      return;
    }

    const executionPlan: ExecutionPlan = {
      type: val.planType as any,
      durationPerExecutionMin: val.duration || 45,
      dates: finalDates,
      patternDays: val.planType === 'patron_repetitivo' ? (val.patternDays as WeekDay[]) : undefined,
      completedDates: this.originalCompletedDates // MANTENER PROGRESO
    };

    const subData: SubActivity = {
      id: this.subActivityId || crypto.randomUUID(),
      activityId: this.activityId,
      title: val.title!,
      deadline: val.deadline!,
      executionPlan: executionPlan,
      status: this.isEditMode ? this.originalStatus : 'pendiente',
      progress: this.isEditMode ? this.originalProgress : 0
    };

    if (this.isEditMode) {
      this.plannerService.updateSubActivity(subData);
    } else {
      this.plannerService.addSubActivity(subData);
    }

    this.router.navigate(['/goals', this.goalId]);
  }

  cancel() {
    this.router.navigate(['/goals', this.goalId]);
  }
}
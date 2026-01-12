import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { 
  Activity, WeekDay, ExecutionPlan, ActivityStatus, WEEK_DAYS, 
  ACTIVITY_TYPE_OPTIONS, EXECUTION_PLAN_TYPE_OPTIONS,
  ACTIVITY_PRIORITY_OPTIONS, ACTIVITY_CRITICALITY_OPTIONS, 
  ACTIVITY_COMPLEXITY_OPTIONS, ACTIVITY_RECURRENCE_OPTIONS
} from '../../../core/models/activity.model';
import { DateUtils } from '../../../core/utils/date.utils';
import { NativeDialogService } from '../../../core/services/native-dialog.service';

@Component({
  selector: 'app-activity-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  minDate = DateUtils.getTodayISO();

  // Guardamos datos originales para no perder el progreso al editar
  private originalCompletedDates: string[] = [];
  private originalProgress: number = 0;
  private originalStatus: ActivityStatus = 'pendiente';
  private originalType: 'simple' | 'compuesta' = 'simple';

  readonly priorityOptions = ACTIVITY_PRIORITY_OPTIONS;
  readonly criticalityOptions = ACTIVITY_CRITICALITY_OPTIONS;
  readonly complexityOptions = ACTIVITY_COMPLEXITY_OPTIONS;
  readonly recurrenceOptions = ACTIVITY_RECURRENCE_OPTIONS;
  readonly typeOptions = ACTIVITY_TYPE_OPTIONS;
  readonly planTypeOptions = EXECUTION_PLAN_TYPE_OPTIONS;
  readonly weekDays = WEEK_DAYS;

  activityForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    priority: ['media', Validators.required],
    criticality: ['flexible', Validators.required],
    complexity: ['media', Validators.required],
    recurrence: ['especifica', Validators.required],
    type: ['simple', Validators.required],
    deadline: ['', Validators.required],
    
    planType: ['patron_repetitivo'], 
    duration: [60], 
    
    patternDays: this.fb.array([]),
    specificDates: this.fb.array([])
  });

  get isSimple() { return this.activityForm.get('type')?.value === 'simple'; }
  get isPattern() { return this.activityForm.get('planType')?.value === 'patron_repetitivo'; }
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

    // Lógica dinámica de validaciones
    this.activityForm.get('type')?.valueChanges.subscribe(type => {
      if (type === 'compuesta') {
        this.activityForm.get('duration')?.clearValidators();
      } else {
        this.activityForm.get('duration')?.setValidators([Validators.required, Validators.min(5)]);
      }
      this.activityForm.get('duration')?.updateValueAndValidity();
    });

    // Auto-update recurrence based on planType if user hasn't touched it? 
    // Actually, let's just make it independent for now as per requirements.
  }

  private loadActivityData(id: string) {
    const activity = this.plannerService.activities().find(a => a.id === id);

    if (!activity) {
      this.router.navigate(['/goals']);
      return;
    }
    this.originalType = activity.type;
    this.objectiveId = activity.objectiveId;

    this.originalProgress = activity.progress;
    this.originalStatus = activity.status;
    if (activity.executionPlan) {
      this.originalCompletedDates = activity.executionPlan.completedDates || [];
    }

    this.activityForm.patchValue({
      title: activity.title,
      priority: activity.priority as any,
      criticality: activity.criticality as any,
      complexity: activity.complexity as any,
      recurrence: activity.recurrence as any,
      type: activity.type as any,
      deadline: activity.deadline,
      planType: activity.executionPlan?.type || 'patron_repetitivo',
      duration: activity.executionPlan?.durationPerExecutionMin || 60
    });

    if (activity.type === 'simple' && activity.executionPlan) {
      if (activity.executionPlan.type === 'patron_repetitivo' && activity.executionPlan.patternDays) {
        const checkArray = this.patternDaysArray;
        checkArray.clear();
        activity.executionPlan.patternDays.forEach(day => {
          checkArray.push(new FormControl(day));
        });
      }

      if (activity.executionPlan.type === 'fechas_especificas' && activity.executionPlan.dates) {
        const datesArray = this.specificDatesArray;
        datesArray.clear();
        activity.executionPlan.dates.forEach(date => {
           datesArray.push(new FormControl(date));
        });
      }
    }
  }

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

  onSubmit() {
    this.saveActivity();
  }

  async saveActivity() {
    if (this.activityForm.invalid || !this.objectiveId) return;
    
    const val = this.activityForm.value;
    const newType = val.type as 'simple' | 'compuesta';
    let finalExecutionPlan: ExecutionPlan | undefined = undefined;

    if (newType === 'simple') {
      let finalDates: string[] = [];

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
        this.dialog.alert('Atención', 'El plan no genera ninguna fecha de ejecución válida antes del deadline.');
        return;
      }

      finalExecutionPlan = {
        type: val.planType as any,
        durationPerExecutionMin: val.duration || 60,
        dates: finalDates,
        patternDays: val.planType === 'patron_repetitivo' ? (val.patternDays as WeekDay[]) : undefined,
        completedDates: this.originalCompletedDates 
      };
    }

    const activityData: Activity = {
      id: this.activityId || crypto.randomUUID(),
      objectiveId: this.objectiveId,
      title: val.title!,
      priority: val.priority as any,
      criticality: val.criticality as any,
      complexity: val.complexity as any,
      recurrence: val.recurrence as any,
      type: newType,
      deadline: val.deadline!,
      status: this.isEditMode ? this.originalStatus : 'pendiente',
      progress: this.isEditMode ? this.originalProgress : 0,
      
      executionPlan: finalExecutionPlan,
      
      totalTimeRequiredMin: finalExecutionPlan 
        ? finalExecutionPlan.dates!.length * finalExecutionPlan.durationPerExecutionMin 
        : undefined
    };

    if (this.isEditMode && this.activityId && this.originalType === 'compuesta' && newType === 'simple') {
      const stepsCount = this.plannerService.subActivities().filter(s => s.activityId === this.activityId).length;

      if (stepsCount > 0) {
        const confirmed = await this.dialog.confirm(
          'Cambio de Tipo Detectado',
          `Esta tarea tiene ${stepsCount} pasos registrados.\nAl convertirla en simple, estos pasos se eliminarán.\n\n¿Confirmas que deseas continuar?`,
          {
            confirmText: 'Convertir y borrar pasos',
            isDanger: true
          }
        );

        if (!confirmed) return;
        this.plannerService.deleteSubActivitiesByActivityId(this.activityId);
      }
    }

    if (this.isEditMode) {
      this.plannerService.updateActivity(activityData);
    } else {
      this.plannerService.addActivity(activityData);
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
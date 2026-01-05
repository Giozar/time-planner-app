import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { Activity, WeekDay, ExecutionPlan } from '../../../core/models/activity.model';
import { DateUtils } from '../../../core/utils/date.utils';

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

  goalId: string | null = null;
  activityId: string | null = null; // Nuevo: ID para edición
  isEditMode = false;               // Nuevo: Bandera de modo
  minDate = DateUtils.getTodayISO();

  // Guardamos datos originales para no perder el progreso al editar
  private originalCompletedDates: string[] = [];
  private originalProgress: number = 0;
  private originalStatus: any = 'pendiente';

  weekDays: { label: string, value: WeekDay }[] = [
    { label: 'Lun', value: 'L' }, { label: 'Mar', value: 'M' },
    { label: 'Mié', value: 'X' }, { label: 'Jue', value: 'J' },
    { label: 'Vie', value: 'V' }, { label: 'Sáb', value: 'S' }, { label: 'Dom', value: 'D' }
  ];

  activityForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    level: ['urgente_directo', Validators.required],
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
  get patternDaysArray() { return this.activityForm.get('patternDays') as FormArray; } // Getter faltante agregado

  ngOnInit() {
    // 1. OBTENCIÓN DE IDs ROBUSTA
    // Intenta obtener 'goalId' (ruta de edición) o 'id' (ruta de creación antigua)
    this.goalId = this.route.snapshot.paramMap.get('goalId') || this.route.snapshot.paramMap.get('id');
    this.activityId = this.route.snapshot.paramMap.get('activityId');

    if (!this.goalId) {
      this.router.navigate(['/goals']);
      return;
    }

    // 2. DETECTAR MODO EDICIÓN
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
  }

  // --- CARGAR DATOS PARA EDICIÓN ---
  private loadActivityData(id: string) {
    const activity = this.plannerService.activities().find(a => a.id === id);
    if (!activity) {
      this.router.navigate(['/goals']);
      return;
    }

    // Guardar estado original
    this.originalProgress = activity.progress;
    this.originalStatus = activity.status;
    if (activity.executionPlan) {
      this.originalCompletedDates = activity.executionPlan.completedDates || [];
    }

    // Rellenar formulario base
    this.activityForm.patchValue({
      title: activity.title,
      level: activity.level as any,
      type: activity.type as any,
      deadline: activity.deadline,
      planType: activity.executionPlan?.type || 'patron_repetitivo',
      duration: activity.executionPlan?.durationPerExecutionMin || 60
    });

    // Rellenar Arrays (Checkboxes y Fechas)
    if (activity.type === 'simple' && activity.executionPlan) {
      
      // Restaurar Patrón de Días
      if (activity.executionPlan.type === 'patron_repetitivo' && activity.executionPlan.patternDays) {
        const checkArray = this.patternDaysArray;
        checkArray.clear();
        activity.executionPlan.patternDays.forEach(day => {
          checkArray.push(new FormControl(day));
        });
      }

      // Restaurar Fechas Específicas
      if (activity.executionPlan.type === 'fechas_especificas' && activity.executionPlan.dates) {
        const datesArray = this.specificDatesArray;
        datesArray.clear();
        // Solo cargamos visualmente para editar
        activity.executionPlan.dates.forEach(date => {
           // Opcional: filtrar solo fechas futuras si no quieres editar el pasado
           datesArray.push(new FormControl(date));
        });
      }
    }
  }

  // --- HELPER PARA HTML (Checkboxes) ---
  isDayChecked(dayValue: string): boolean {
    return this.patternDaysArray.value.includes(dayValue);
  }

  // --- LOGICA DE CHECKBOXES ---
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

  // --- MÉTODOS FECHAS ---
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

  // --- GUARDAR ---
  onSubmit() {
    if (this.activityForm.invalid || !this.goalId) return;
    
    const val = this.activityForm.value;
    let finalExecutionPlan: ExecutionPlan | undefined = undefined;

    if (val.type === 'simple') {
      let finalDates: string[] = [];

      if (val.planType === 'patron_repetitivo') {
        const daysSelected = val.patternDays as WeekDay[];
        if (daysSelected.length === 0) {
          alert('Selecciona al menos un día para el patrón.');
          return;
        }
        // Regenerar fechas desde HOY hasta DEADLINE
        finalDates = DateUtils.generateDatesFromPattern(
          DateUtils.getTodayISO(),
          val.deadline!,
          daysSelected
        );
        // NOTA: Aquí podrías mezclar con fechas pasadas si quisieras mantener el historial visual
      } else {
        finalDates = (val.specificDates as string[]).sort();
        if (finalDates.length === 0) {
          alert('Añade al menos una fecha específica.');
          return;
        }
      }

      finalExecutionPlan = {
        type: val.planType as any,
        durationPerExecutionMin: val.duration || 60,
        dates: finalDates,
        patternDays: val.planType === 'patron_repetitivo' ? (val.patternDays as WeekDay[]) : undefined,
        // IMPORTANTE: Mantener las fechas que ya se completaron
        completedDates: this.originalCompletedDates 
      };
    }

    const activityData: Activity = {
      id: this.activityId || crypto.randomUUID(), // Usar ID existente si es edición
      goalId: this.goalId,
      title: val.title!,
      level: val.level as any,
      type: val.type as any,
      deadline: val.deadline!,
      status: this.isEditMode ? this.originalStatus : 'pendiente',
      progress: this.isEditMode ? this.originalProgress : 0, 
      
      executionPlan: finalExecutionPlan,
      
      totalTimeRequiredMin: finalExecutionPlan 
        ? finalExecutionPlan.dates!.length * finalExecutionPlan.durationPerExecutionMin 
        : undefined
    };

    if (this.isEditMode) {
      this.plannerService.updateActivity(activityData);
    } else {
      this.plannerService.addActivity(activityData);
    }

    this.router.navigate(['/goals', this.goalId]);
  }

  cancel() {
    this.router.navigate(['/goals', this.goalId]);
  }
}
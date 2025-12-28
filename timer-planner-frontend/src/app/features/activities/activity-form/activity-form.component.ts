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
  minDate = DateUtils.getTodayISO(); // Para validación de fechas

  // Días de la semana para el checkbox
  weekDays: { label: string, value: WeekDay }[] = [
    { label: 'Lun', value: 'L' },
    { label: 'Mar', value: 'M' },
    { label: 'Mié', value: 'X' },
    { label: 'Jue', value: 'J' },
    { label: 'Vie', value: 'V' },
    { label: 'Sáb', value: 'S' },
    { label: 'Dom', value: 'D' }
  ];

  activityForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    level: ['urgente_directo', Validators.required],
    type: ['simple', Validators.required], // simple | compuesta
    deadline: ['', Validators.required],
    
    // Configuración de Ejecución (Solo si es simple)
    planType: ['patron_repetitivo'], // patron_repetitivo | fechas_especificas
    duration: [60], // Minutos por sesión
    
    // Controles para Patrón
    patternDays: this.fb.array([]), // Checkboxes de días

    // Controles para Fechas Específicas
    specificDates: this.fb.array([]) // Lista de fechas manuales
  });

  get isSimple() { return this.activityForm.get('type')?.value === 'simple'; }
  get isPattern() { return this.activityForm.get('planType')?.value === 'patron_repetitivo'; }
  get specificDatesArray() { return this.activityForm.get('specificDates') as FormArray; }

  ngOnInit() {
    this.goalId = this.route.snapshot.paramMap.get('id');
    if (!this.goalId) this.router.navigate(['/goals']);

    // Manejo dinámico de validaciones
    this.activityForm.get('type')?.valueChanges.subscribe(type => {
      if (type === 'compuesta') {
        // Si es compuesta, no necesita plan de ejecución directo
        this.activityForm.get('duration')?.clearValidators();
      } else {
        this.activityForm.get('duration')?.setValidators([Validators.required, Validators.min(5)]);
      }
      this.activityForm.get('duration')?.updateValueAndValidity();
    });
  }

  // --- MÉTODOS PARA CHECKBOXES DE DÍAS (Patrón) ---
  onDayChange(e: any) {
    const checkArray: FormArray = this.activityForm.get('patternDays') as FormArray;
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

  // --- MÉTODOS PARA FECHAS ESPECÍFICAS ---
  addSpecificDate(dateInput: HTMLInputElement) {
    const date = dateInput.value;
    if (date) {
      // Evitar duplicados
      if (!this.specificDatesArray.value.includes(date)) {
        this.specificDatesArray.push(new FormControl(date));
      }
      dateInput.value = ''; // Limpiar input
    }
  }

  removeSpecificDate(index: number) {
    this.specificDatesArray.removeAt(index);
  }

  // --- SUBMIT ---
  onSubmit() {
    if (this.activityForm.invalid || !this.goalId) return;
    
    const val = this.activityForm.value;
    let finalExecutionPlan: ExecutionPlan | undefined = undefined;

    // LÓGICA DE GENERACIÓN DE PLAN (Solo si es simple)
    if (val.type === 'simple') {
      let finalDates: string[] = [];

      if (val.planType === 'patron_repetitivo') {
        // Generar fechas finitas usando el util
        const daysSelected = val.patternDays as WeekDay[];
        if (daysSelected.length === 0) {
          alert('Selecciona al menos un día para el patrón.');
          return;
        }
        finalDates = DateUtils.generateDatesFromPattern(
          DateUtils.getTodayISO(), // Desde hoy
          val.deadline!,          // Hasta deadline
          daysSelected
        );
      } else {
        // Fechas manuales
        finalDates = (val.specificDates as string[]).sort();
        if (finalDates.length === 0) {
          alert('Añade al menos una fecha específica.');
          return;
        }
      }

      // Validar que se generaron fechas
      if (finalDates.length === 0) {
        alert('El plan no genera ninguna fecha de ejecución válida antes del deadline.');
        return;
      }

      finalExecutionPlan = {
        type: val.planType as any,
        durationPerExecutionMin: val.duration || 60,
        dates: finalDates,
        patternDays: val.planType === 'patron_repetitivo' ? (val.patternDays as WeekDay[]) : undefined,
        completedDates: [] // Empieza vacío
      };
    }

    // CREAR OBJETO
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      goalId: this.goalId,
      title: val.title!,
      level: val.level as any,
      type: val.type as any,
      deadline: val.deadline!,
      status: 'pendiente',
      progress: 0,
      
      // Asignar plan (undefined si es compuesta)
      executionPlan: finalExecutionPlan,
      
      // Total tiempo: si es simple, calculamos total. Si compuesta, undefined.
      totalTimeRequiredMin: finalExecutionPlan 
        ? finalExecutionPlan.dates!.length * finalExecutionPlan.durationPerExecutionMin 
        : undefined
    };

    this.plannerService.addActivity(newActivity);
    this.router.navigate(['/goals', this.goalId]);
  }

  cancel() {
    this.router.navigate(['/goals', this.goalId]);
  }
}
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { Activity, WeekDay, ExecutionPlan, ActivityStatus } from '../../../core/models/activity.model';
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
  activityId: string | null = null;
  isEditMode = false;
  minDate = DateUtils.getTodayISO();

  // Guardamos datos originales para no perder el progreso al editar
  private originalCompletedDates: string[] = [];
  private originalProgress: number = 0;
  private originalStatus: ActivityStatus = 'pendiente';
  private originalType: 'simple' | 'compuesta' = 'simple';
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
    // 1. Obtención de IDs
    // Intenta obtener 'goalId' (ruta de edición) o 'id' (ruta de creación antigua)
    this.goalId = this.route.snapshot.paramMap.get('goalId') || this.route.snapshot.paramMap.get('id');
    this.activityId = this.route.snapshot.paramMap.get('activityId');

    if (!this.goalId) {
      this.router.navigate(['/goals']);
      return;
    }

    // 2. Detectar modo edición
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

  // --- Cargar datos para edición ---
  private loadActivityData(id: string) {
    const activity = this.plannerService.activities().find(a => a.id === id);

    // GUARDAMOS EL TIPO ORIGINAL
    if (!activity) {
      this.router.navigate(['/goals']);
      return;
    }
    this.originalType = activity.type;

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

  // --- Lógica de checkboxes ---
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

  onSubmit() {
    // 1. Validación básica
    if (this.activityForm.invalid || !this.goalId) return;
    
    const val = this.activityForm.value;
    const newType = val.type as 'simple' | 'compuesta';
    let finalExecutionPlan: ExecutionPlan | undefined = undefined;

    // 2. Cálculo y validación de lógica (Planes y Fechas)
    // Hacemos esto PRIMERO. Si falla algo aquí (ej: no seleccionaste fechas), 
    // el código se detiene y NO borramos nada.
    if (newType === 'simple') {
      let finalDates: string[] = [];

      if (val.planType === 'patron_repetitivo') {
        const daysSelected = val.patternDays as WeekDay[];
        if (daysSelected.length === 0) {
          alert('Selecciona al menos un día para el patrón.');
          return; // <-- SE DETIENE AQUÍ, NO BORRA NADA
        }
        
        finalDates = DateUtils.generateDatesFromPattern(
          DateUtils.getTodayISO(),
          val.deadline!,
          daysSelected
        );
      } else {
        // Validación de fechas específicas
        finalDates = (val.specificDates as string[]).sort();
        if (finalDates.length === 0) {
          alert('Añade al menos una fecha específica.');
          return; // <-- SE DETIENE AQUÍ, TE SALVA DE BORRAR POR ERROR
        }
      }

      if (finalDates.length === 0) {
        alert('El plan no genera ninguna fecha de ejecución válida antes del deadline.');
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

    // 3. Preparar el objeto a guardar
    // Ya sabemos que los datos son válidos, preparamos el paquete.
    const activityData: Activity = {
      id: this.activityId || crypto.randomUUID(),
      goalId: this.goalId,
      title: val.title!,
      level: val.level as any,
      type: newType,
      deadline: val.deadline!,
      status: this.isEditMode ? this.originalStatus : 'pendiente',
      progress: this.isEditMode ? this.originalProgress : 0,
      
      executionPlan: finalExecutionPlan,
      
      totalTimeRequiredMin: finalExecutionPlan 
        ? finalExecutionPlan.dates!.length * finalExecutionPlan.durationPerExecutionMin 
        : undefined
    };

    // 4. Alerta de seguridad
    // Solo llegamos aquí si todo lo de arriba funcionó bien.
    if (this.isEditMode && this.activityId && this.originalType === 'compuesta' && newType === 'simple') {
      
      const stepsCount = this.plannerService.getSubActivitiesCount(this.activityId);

      if (stepsCount > 0) {
        const confirmDelete = confirm(
          `CAMBIO DE TIPO DETECTADO\n\n` +
          `Esta actividad tiene ${stepsCount} pasos registrados.\n` +
          `Al convertirla en simple, estos pasos se eliminarán.\n\n` +
          `¿Confirmas que deseas continuar?`
        );

        if (!confirmDelete) {
          return; // El usuario canceló. No se guarda nada, no se borra nada.
        }

        // Si confirmó, borramos los pasos AHORA (porque sabemos que el guardado ocurrirá sí o sí en la siguiente línea)
        this.plannerService.deleteSubActivitiesByActivityId(this.activityId);
      }
    }

    // 5. Guardado final
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
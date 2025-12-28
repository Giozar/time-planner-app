import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { SubActivity, WeekDay, ExecutionPlan } from '../../../core/models/activity.model';
import { DateUtils } from '../../../core/utils/date.utils';

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

  goalId: string | null = null;
  activityId: string | null = null;
  minDate = DateUtils.getTodayISO();

  // Días de la semana para checkbox
  weekDays: { label: string, value: WeekDay }[] = [
    { label: 'Lun', value: 'L' }, { label: 'Mar', value: 'M' },
    { label: 'Mié', value: 'X' }, { label: 'Jue', value: 'J' },
    { label: 'Vie', value: 'V' }, { label: 'Sáb', value: 'S' }, { label: 'Dom', value: 'D' }
  ];

  form = this.fb.group({
    title: ['', Validators.required],
    deadline: ['', Validators.required], // Subactividad necesita deadline
    
    // Configuración de Ejecución
    planType: ['patron_repetitivo'], 
    duration: [45, [Validators.required, Validators.min(5)]],
    
    patternDays: this.fb.array([]),
    specificDates: this.fb.array([])
  });

  get isPattern() { return this.form.get('planType')?.value === 'patron_repetitivo'; }
  get specificDatesArray() { return this.form.get('specificDates') as FormArray; }

  ngOnInit() {
    this.goalId = this.route.snapshot.paramMap.get('goalId');
    this.activityId = this.route.snapshot.paramMap.get('activityId');
    
    if (!this.activityId || !this.goalId) {
      this.router.navigate(['/goals']);
    }
  }

  // --- MÉTODOS PARA CHECKBOXES DE DÍAS (Igual que ActivityForm) ---
  onDayChange(e: any) {
    const checkArray: FormArray = this.form.get('patternDays') as FormArray;
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
    if (date && !this.specificDatesArray.value.includes(date)) {
      this.specificDatesArray.push(new FormControl(date));
      dateInput.value = '';
    }
  }

  removeSpecificDate(index: number) {
    this.specificDatesArray.removeAt(index);
  }

  onSubmit() {
    if (this.form.invalid || !this.activityId) return;

    const val = this.form.value;
    let finalDates: string[] = [];

    // Generación de fechas (Igual lógica que ActivityForm)
    if (val.planType === 'patron_repetitivo') {
      const daysSelected = val.patternDays as WeekDay[];
      if (daysSelected.length === 0) {
        alert('Selecciona al menos un día.');
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
        alert('Añade fechas específicas.');
        return;
      }
    }

    if (finalDates.length === 0) {
      alert('No se generaron fechas válidas antes del deadline.');
      return;
    }

    const executionPlan: ExecutionPlan = {
      type: val.planType as any,
      durationPerExecutionMin: val.duration || 45,
      dates: finalDates,
      patternDays: val.planType === 'patron_repetitivo' ? (val.patternDays as WeekDay[]) : undefined,
      completedDates: []
    };

    const newSub: SubActivity = {
      id: crypto.randomUUID(),
      activityId: this.activityId,
      title: val.title!,
      deadline: val.deadline!,
      executionPlan: executionPlan,
      progress: 0,
      status: 'pendiente'
    };

    this.plannerService.addSubActivity(newSub);
    this.router.navigate(['/goals', this.goalId]);
  }

  cancel() {
    this.router.navigate(['/goals', this.goalId]);
  }
}
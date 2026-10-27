import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { PlannerService } from '../../../core/services/planner.service';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { AgendaItem } from '../../../core/models/agenda-item.model';
import { addDays } from '../../../core/rules';
import { DateUtils } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-daily-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './daily-dashboard.component.html',
  styleUrl: './daily-dashboard.component.css'
})
export class DailyDashboardComponent {
  private plannerService = inject(PlannerService);
  private dialog = inject(NativeDialogService);
  private router = inject(Router);
  private params = toSignal(inject(ActivatedRoute).queryParamMap);

  tasks = this.plannerService.agendaTasks;
  metrics = this.plannerService.agendaMetrics;
  selectedDate = this.plannerService.selectedDate;
  readOnly = this.plannerService.isSelectedDateReadOnly;

  readonly todayISO = DateUtils.getTodayISO();
  isToday = computed(() => this.selectedDate() === this.todayISO);

  /** Fecha local para mostrarla con el pipe `date` sin pasar por UTC. */
  displayDate = computed(() => {
    const [y, m, d] = this.selectedDate().split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  constructor() {
    effect(() => this.plannerService.syncSelectedDate(this.params()?.get('date') ?? null));
  }

  shiftDay(days: number) {
    this.goTo(addDays(this.selectedDate(), days));
  }

  goTo(date: string | null) {
    if (date === this.todayISO) date = null;
    this.router.navigate([], { queryParams: { date }, queryParamsHandling: 'merge' });
  }

  openPicker(picker: HTMLInputElement) {
    picker.showPicker();
  }

  onDatePicked(value: string) {
    if (value) this.goTo(value);
  }

  /** En días pasados se pide el tiempo realizado, con el previsto por defecto (RN-27, RN-71). */
  async toggleTask(task: AgendaItem, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    // Las fechas futuras no se marcan (RN-27).
    if (this.readOnly()) {
      checkbox.checked = task.isCompleted;
      return;
    }

    if (task.isCompleted || this.isToday()) {
      this.plannerService.toggleSession(task.sessionId);
      return;
    }

    const minutes = await this.dialog.promptMinutes(
      'Registrar trabajo',
      `¿Cuántos minutos trabajaste en "${task.title}" ese día?`,
      task.estimatedDurationMin,
    );
    if (minutes === null) {
      checkbox.checked = false;
      return;
    }
    this.plannerService.toggleSession(task.sessionId, minutes);
  }

  /** Mueve solo esta sesión a otra fecha, de hoy hasta el deadline del ítem (CU-30, RN-82). */
  moveTask(task: AgendaItem, date: string) {
    if (!date || date === this.selectedDate()) return;
    if (!this.plannerService.moveSession(task.sessionId, date)) {
      this.dialog.alert('No se puede mover', `Elige una fecha desde hoy hasta el ${task.deadline}.`);
    }
  }
}

import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { PlannerService } from '../../../core/services/planner.service';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { AgendaItem } from '../../../core/models/agenda-item.model';
import { MIN_SESSION_MINUTES, addDays, sessionDateRange } from '../../../core/rules';
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

  /**
   * Cambia la fecha o el tiempo previsto de solo esta sesión (CU-30, RN-82): una no hecha, de hoy al deadline del ítem;
   * una hecha, hasta hoy.
   */
  async editTask(task: AgendaItem) {
    const { min, max } = sessionDateRange(task.isCompleted, this.todayISO, task.deadline);
    // Una sesión vencida puede quedarse en su día para cambiar solo su tiempo.
    const current = this.selectedDate();
    const dateMin = min === null ? undefined : current < min ? current : min;
    const values = await this.dialog.promptFields('Editar sesión', `"${task.title}"`, [
      { key: 'date', label: 'Fecha', type: 'date', value: current, min: dateMin, max },
      { key: 'minutes', label: 'Tiempo previsto (min)', type: 'number', value: task.estimatedDurationMin, min: MIN_SESSION_MINUTES },
    ]);
    if (!values) return;

    const changes = { date: String(values['date']), plannedMinutes: Number(values['minutes']) };
    if (!this.plannerService.editSession(task.sessionId, changes)) {
      this.dialog.alert('No se puede guardar', 'Revisa la fecha: no puede pasar la fecha límite y, si la sesión no está hecha, va de hoy en adelante.');
    }
  }

  /** Borra solo esta sesión; a su tarea o paso le debe quedar al menos una (CU-31, RN-83). */
  async deleteTask(task: AgendaItem) {
    const ok = await this.dialog.confirm('Borrar sesión', `Se borrará la sesión de "${task.title}" de este día.`, {
      confirmText: 'Borrar',
      isDanger: true,
    });
    if (ok && !this.plannerService.deleteSession(task.sessionId)) {
      this.dialog.alert('No se puede borrar', 'Es la única sesión de su plan.');
    }
  }
}

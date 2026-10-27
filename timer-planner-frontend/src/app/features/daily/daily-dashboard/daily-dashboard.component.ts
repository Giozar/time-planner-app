import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { PlannerService } from '../../../core/services/planner.service';
import { DialogField, NativeDialogService } from '../../../core/services/native-dialog.service';
import { AgendaItem } from '../../../core/models/agenda-item.model';
import { MIN_SESSION_MINUTES, addDays, isComplete, sessionDateRange } from '../../../core/rules';
import { SESSION_RESULT_LABELS, SESSION_STATE_LABELS } from '../../../core/i18n/labels';
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
  /** Registro diario de la fecha, si ya se cerró (RN-75). */
  record = this.plannerService.selectedRecord;

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

  /** Estado, resultado y vencida de una sesión (RN-69): «Cerrada · Incompleta · Vencida». */
  stateOf(task: AgendaItem): string {
    const result = isComplete(task.progress) ? SESSION_RESULT_LABELS.complete : SESSION_RESULT_LABELS.incomplete;
    const parts = [SESSION_STATE_LABELS[task.state], result];
    if (task.overdue) parts.push(SESSION_RESULT_LABELS.overdue);
    return parts.join(' · ');
  }

  /** Marcar pide el tiempo realizado, con el previsto por defecto, y una nota opcional; desmarcar no pregunta (RN-27, RN-71). */
  async toggleTask(task: AgendaItem, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    // Las fechas futuras no se marcan (RN-27).
    if (this.readOnly()) {
      checkbox.checked = task.isCompleted;
      return;
    }

    if (task.isCompleted) {
      this.plannerService.toggleSession(task.sessionId);
      return;
    }

    const values = await this.dialog.promptFields('Registrar sesión', `"${task.title}"`, [
      { key: 'minutes', label: 'Tiempo realizado (min)', type: 'number', value: task.estimatedDurationMin, min: 1 },
      { key: 'notes', label: 'Nota (opcional)', type: 'text', value: task.notes ?? '' },
    ]);
    if (!values) {
      checkbox.checked = false;
      return;
    }
    this.plannerService.toggleSession(task.sessionId, Number(values['minutes']), String(values['notes']));
  }

  /**
   * Edita solo esta sesión (CU-30). Si su tarea o paso sigue abierto: fecha y tiempo previsto (RN-82); una no hecha va
   * de hoy al deadline del ítem y una hecha, hasta hoy. Si está hecha: también su tiempo realizado y su nota (RN-76),
   * lo único que se corrige cuando su ítem está cerrado (RN-80).
   */
  async editTask(task: AgendaItem) {
    const fields: DialogField[] = [];
    if (task.canEdit) {
      const { min, max } = sessionDateRange(task.isCompleted, this.todayISO, task.deadline);
      // Una sesión vencida puede quedarse en su día para cambiar solo su tiempo.
      const current = this.selectedDate();
      const dateMin = min === null ? undefined : current < min ? current : min;
      fields.push(
        { key: 'date', label: 'Fecha', type: 'date', value: current, min: dateMin, max },
        { key: 'planned', label: 'Tiempo previsto (min)', type: 'number', value: task.estimatedDurationMin, min: MIN_SESSION_MINUTES },
      );
    }
    if (task.isCompleted) {
      fields.push(
        { key: 'actual', label: 'Tiempo realizado (min)', type: 'number', value: task.executedMinutes, min: 1 },
        { key: 'notes', label: 'Nota', type: 'text', value: task.notes ?? '' },
      );
    }
    const values = await this.dialog.promptFields('Editar sesión', `"${task.title}"`, fields);
    if (!values) return;

    const changes = {
      ...(task.canEdit ? { date: String(values['date']), plannedMinutes: Number(values['planned']) } : {}),
      ...(task.isCompleted ? { actualMinutes: Number(values['actual']), notes: String(values['notes']) } : {}),
    };
    if (!this.plannerService.editSession(task.sessionId, changes)) {
      this.dialog.alert('No se puede guardar', 'La fecha no puede pasar la fecha límite y, si la sesión no está hecha, va de hoy en adelante.');
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

import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PlannerService } from '../../../core/services/planner.service';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { DayWorkLog } from '../../../core/services/planner.service';
import { AgendaItem } from '../../../core/models/agenda-item.model';
import { addDays } from '../../../core/rules';
import { DateUtils } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-daily-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
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

  workLogs = this.plannerService.dayWorkLogs;
  items = this.plannerService.executableItems;

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

  /** Registra tiempo trabajado sin sesión en la fecha elegida (CU-27, RN-71). */
  async logWork(itemId: string, minutesText: string, minutesInput: HTMLInputElement) {
    const item = this.items().find(i => i.id === itemId);
    const minutes = Number(minutesText);
    if (!item || !Number.isInteger(minutes) || minutes <= 0) {
      this.dialog.alert('Atención', 'Elige una tarea o paso y escribe minutos enteros mayores que cero.');
      return;
    }
    this.plannerService.logWork(item.id, item.sourceType, minutes, this.selectedDate());
    minutesInput.value = '';
  }

  /** Corrige los minutos de un bloque (RN-76). */
  async editLog(entry: DayWorkLog) {
    const minutes = await this.dialog.promptMinutes('Corregir tiempo', `Minutos trabajados en "${entry.label}":`, entry.log.minutes);
    if (minutes !== null) this.plannerService.updateWorkLog(entry.log.id, minutes);
  }

  async deleteLog(entry: DayWorkLog) {
    const reopens = entry.log.sessionId
      ? '\nSi es el último tiempo de su sesión, la sesión volverá a pendiente.'
      : '';
    const ok = await this.dialog.confirm('Borrar tiempo', `Se borrarán ${entry.log.minutes} min de "${entry.label}".${reopens}`, {
      confirmText: 'Borrar',
      isDanger: true,
    });
    if (ok) this.plannerService.deleteWorkLog(entry.log.id);
  }

  shiftDay(days: number) {
    this.goTo(addDays(this.selectedDate(), days));
  }

  goTo(date: string | null) {
    if (date === this.todayISO) date = null;
    this.router.navigate([], { queryParams: { date }, queryParamsHandling: 'merge' });
  }

  onDatePicked(value: string) {
    if (value) this.goTo(value);
  }

  /** En días pasados se piden los minutos reales, con los previstos por defecto (RN-27, RN-71). */
  async toggleTask(task: AgendaItem, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (this.readOnly()) {
      checkbox.checked = task.isCompleted;
      return;
    }

    if (task.isCompleted || this.isToday()) {
      this.plannerService.toggleTaskExecution(task.id, task.sourceType);
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
    this.plannerService.toggleTaskExecution(task.id, task.sourceType, minutes);
  }
}

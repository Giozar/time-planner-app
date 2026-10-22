import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PlannerService } from '../../../core/services/planner.service';
import { CalendarEntry } from '../../../core/models/calendar-entry.model';
import { TaskSourceType, WEEK_DAYS_ORDER } from '../../../core/models/activity.model';
import { DateUtils } from '../../../core/utils/date.utils';
import { buildMonthGrid, shiftMonth, shiftYear } from '../../../core/rules';
import { MONTH_LABELS, TASK_SOURCE_TYPE_LABELS, WEEK_DAY_LABELS } from '../../../core/i18n/labels';
import { LabelPipe } from '../../../shared/pipes/label.pipe';

/** Máximo de sesiones visibles por celda; el resto se ve en el detalle del día. */
const MAX_VISIBLE_ENTRIES = 3;

/** Calendario mensual de solo consulta (CU-26, RN-66). */
@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, MatIconModule, LabelPipe],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.css'
})
export class CalendarViewComponent {
  private plannerService = inject(PlannerService);

  readonly today = DateUtils.getTodayISO();
  readonly weekDays = WEEK_DAYS_ORDER;
  readonly weekDayLabels = WEEK_DAY_LABELS;
  readonly sourceTypeLabels = TASK_SOURCE_TYPE_LABELS;
  readonly TaskSourceType = TaskSourceType;
  readonly maxVisible = MAX_VISIBLE_ENTRIES;

  year = signal(Number(this.today.slice(0, 4)));
  month = signal(Number(this.today.slice(5, 7))); // 1 a 12
  selectedDate = signal<string | null>(null);

  title = computed(() => `${MONTH_LABELS[this.month() - 1]} ${this.year()}`);
  grid = computed(() => buildMonthGrid(this.year(), this.month()));
  selectedEntries = computed(() => {
    const date = this.selectedDate();
    return date ? this.entriesOf(date) : [];
  });

  entriesOf(date: string): CalendarEntry[] {
    return this.plannerService.calendarEntries().get(date) ?? [];
  }

  previousYear() { this.goTo(shiftYear(this.year(), this.month(), -1)); }
  nextYear() { this.goTo(shiftYear(this.year(), this.month(), 1)); }
  previousMonth() { this.goTo(shiftMonth(this.year(), this.month(), -1)); }
  nextMonth() { this.goTo(shiftMonth(this.year(), this.month(), 1)); }

  goToToday() {
    this.goTo({ year: Number(this.today.slice(0, 4)), month: Number(this.today.slice(5, 7)) });
    this.selectedDate.set(this.today);
  }

  selectDay(date: string) {
    this.selectedDate.set(this.selectedDate() === date ? null : date);
  }

  private goTo(target: { year: number; month: number }) {
    this.year.set(target.year);
    this.month.set(target.month);
    this.selectedDate.set(null);
  }
}

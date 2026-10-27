import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';

/** Resúmenes de los días cerrados, del más reciente al más antiguo (RN-43). */
@Component({
  selector: 'app-history-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './history-list.component.html',
  styleUrl: './history-list.component.css'
})
export class HistoryListComponent {
  private plannerService = inject(PlannerService);

  rows = computed(() => [...this.plannerService.records()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(record => {
      const [y, m, d] = record.date.split('-').map(Number);
      return { record, displayDate: new Date(y, m - 1, d) };
    }));
}

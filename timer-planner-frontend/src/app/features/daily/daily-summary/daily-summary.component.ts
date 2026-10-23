import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PlannerService } from '../../../core/services/planner.service';

@Component({
  selector: 'app-daily-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-summary.component.html',
  styleUrl: './daily-summary.component.css'
})
export class DailySummaryComponent {
  private plannerService = inject(PlannerService);
  private router = inject(Router);
  private params = toSignal(inject(ActivatedRoute).queryParamMap);

  metrics = this.plannerService.agendaMetrics;
  selectedDate = this.plannerService.selectedDate;
  readOnly = this.plannerService.isSelectedDateReadOnly;

  /** Notas del cierre existente de esa fecha, para no perderlas al volver a cerrar (RN-43). */
  savedNotes = computed(() => this.plannerService.records().find(r => r.date === this.selectedDate())?.notes ?? '');

  displayDate = computed(() => {
    const [y, m, d] = this.selectedDate().split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  constructor() {
    effect(() => this.plannerService.syncSelectedDate(this.params()?.get('date') ?? null));
  }

  finishDay(notes: string) {
    if (!this.plannerService.closeDay(notes)) return;

    // Feedback simple (podríamos usar un toast/alerta mejor después)
    alert('¡Día registrado exitosamente!');
    this.router.navigate(['/goals']);
  }
}

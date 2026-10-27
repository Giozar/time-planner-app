import { Component, computed, inject } from '@angular/core';
import { PlannerService } from '../../../core/services/planner.service';
import { MetricsLevel } from '../../../core/models/metrics.model';
import { METRICS_LEVEL_LABELS } from '../../../core/i18n/labels';

/** Orden de los niveles en la tabla, de la meta a la sesión. */
const LEVELS: readonly MetricsLevel[] = ['goal', 'objective', 'activity', 'step', 'session'];

/** Cómo va cada nivel: cuántos están completos, incompletos, cerrados y vencidos, y sus promedios (CU-32, RN-86). */
@Component({
  selector: 'app-metrics-view',
  standalone: true,
  templateUrl: './metrics-view.component.html',
  styleUrl: './metrics-view.component.css'
})
export class MetricsViewComponent {
  private plannerService = inject(PlannerService);

  rows = computed(() => {
    const metrics = this.plannerService.metrics();
    return LEVELS.map(level => ({ level, label: METRICS_LEVEL_LABELS[level], ...metrics[level] }));
  });

  /** Un promedio en porcentaje, o «Sin datos». */
  percent(value: number | null): string {
    return value === null ? 'Sin datos' : `${value} %`;
  }
}

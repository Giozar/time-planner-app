import { Pipe, PipeTransform, inject } from '@angular/core';
import { PlannerService } from '../../core/services/planner.service';
import type { HierarchyLevel } from '../../core/models/hierarchy.model';
import { RESULT_LABELS } from '../../core/i18n/labels';
import { isComplete } from '../../core/rules';

/**
 * Resultado (RN-84) y vencido (RN-85) de una meta, objetivo, tarea o paso, en el género de su nivel:
 * `Completa`, `Incompleto · Vencido`. Es impura porque lee signals del servicio.
 */
@Pipe({ name: 'result', pure: false })
export class ResultPipe implements PipeTransform {
  private planner = inject(PlannerService);

  transform(item: { id: string; progress: number }, level: HierarchyLevel): string {
    const labels = RESULT_LABELS[level];
    const result = isComplete(item.progress) ? labels.complete : labels.incomplete;
    return this.planner.overdue().has(item.id) ? `${result} · ${labels.overdue}` : result;
  }
}

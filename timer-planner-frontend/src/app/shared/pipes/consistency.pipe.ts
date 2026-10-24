import { Pipe, PipeTransform, inject } from '@angular/core';
import { PlannerService } from '../../core/services/planner.service';

/**
 * Constancia de una meta, objetivo, tarea o paso (RN-70): `50 %` o `Sin datos`.
 * Es impura porque lee signals del servicio y debe actualizarse al marcar sesiones.
 */
@Pipe({ name: 'consistency', pure: false })
export class ConsistencyPipe implements PipeTransform {
  private planner = inject(PlannerService);

  transform(id: string): string {
    const value = this.planner.consistency().get(id);
    return value === null || value === undefined ? 'Sin datos' : `${value} %`;
  }
}

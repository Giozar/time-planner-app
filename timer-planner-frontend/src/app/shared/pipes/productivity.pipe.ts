import { Pipe, PipeTransform, inject } from '@angular/core';
import { PlannerService } from '../../core/services/planner.service';

/**
 * Productividad de una meta, objetivo, tarea o paso (RN-73): `38 %` o `Sin datos`.
 * Es impura porque lee signals del servicio y debe actualizarse al registrar tiempo.
 */
@Pipe({ name: 'productivity', pure: false })
export class ProductivityPipe implements PipeTransform {
  private planner = inject(PlannerService);

  transform(id: string): string {
    const value = this.planner.productivity().get(id)?.percentage;
    return value === null || value === undefined ? 'Sin datos' : `${value} %`;
  }
}

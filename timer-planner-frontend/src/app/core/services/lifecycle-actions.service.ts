import { Injectable, inject } from '@angular/core';
import { PlannerService } from './planner.service';
import type { HierarchyLevel, ReopenResult } from '../models/hierarchy.model';
import { NativeDialogService } from './native-dialog.service';
import { DateUtils } from '../utils/date.utils';

const NAMES: Record<HierarchyLevel, string> = {
  goal: 'meta',
  objective: 'objetivo',
  activity: 'tarea',
  step: 'paso',
};
const HAS_CHILDREN: Record<HierarchyLevel, boolean> = {
  goal: true,
  objective: true,
  activity: true,
  step: false,
};

/**
 * Pausar, cerrar y reabrir con sus confirmaciones (RN-57, RN-64, RN-77). Las pantallas solo
 * llaman a estos métodos; las reglas viven en `PlannerService`.
 */
@Injectable({ providedIn: 'root' })
export class LifecycleActionsService {
  private planner = inject(PlannerService);
  private dialog = inject(NativeDialogService);

  /** Pausa si está abierto y reanuda si ya tiene una pausa propia abierta. */
  togglePause(level: HierarchyLevel, id: string, ownPaused: boolean) {
    const actions = {
      goal: [() => this.planner.pauseGoal(id), () => this.planner.resumeGoal(id)],
      objective: [() => this.planner.pauseObjective(id), () => this.planner.resumeObjective(id)],
      activity: [() => this.planner.pauseActivity(id), () => this.planner.resumeActivity(id)],
      step: [() => this.planner.pauseStep(id), () => this.planner.resumeStep(id)],
    }[level];
    actions[ownPaused ? 1 : 0]();
  }

  /** Confirma y cierra a mano. Cerrar no cambia el avance ni las demás medidas (RN-77). */
  async close(level: HierarchyLevel, id: string, title: string): Promise<boolean> {
    const below = HAS_CHILDREN[level] ? ' y todo lo que tiene abajo' : '';
    const ok = await this.dialog.confirm(`Cerrar ${NAMES[level]}`,
      `Se cerrará "${title}"${below}.\n` +
      'Conserva su avance, su constancia y su productividad; no se marca como completado.\n' +
      'Sus sesiones pendientes dejan de aparecer en la agenda y el calendario. Podrás reabrirlo cuando quieras.',
      { confirmText: 'Cerrar' });
    if (!ok) return false;

    switch (level) {
      case 'goal': return this.planner.closeGoal(id);
      case 'objective': return this.planner.closeObjective(id);
      case 'activity': return this.planner.closeActivity(id);
      case 'step': return this.planner.closeStep(id);
    }
  }

  /**
   * Confirma y reabre. Si su deadline ya pasó pide uno nuevo, que no puede superar el de su padre (RN-64).
   * Devuelve si quedó reabierto.
   */
  async reopen(level: HierarchyLevel, id: string, title: string): Promise<boolean> {
    const ok = await this.dialog.confirm(`Reabrir ${NAMES[level]}`,
      `Se reabrirá "${title}"${HAS_CHILDREN[level] ? ', lo que tiene abajo que siga dentro de su fecha límite' : ''} y lo que lo contiene.\n` +
      'Sus sesiones pendientes vuelven a la agenda y el calendario.',
      { confirmText: 'Reabrir' });
    if (!ok) return false;

    let result = this.attempt(level, id);
    while (result === 'needs_deadline' || result === 'invalid_deadline') {
      if (result === 'invalid_deadline') {
        await this.dialog.alert('Fecha no válida', 'El deadline nuevo debe ser desde hoy y no superar el de su padre.');
      }
      const deadline = await this.dialog.promptDate(
        `Reabrir ${NAMES[level]}`,
        `"${title}" ya pasó su fecha límite. Elige una nueva para reabrirlo:`,
        DateUtils.getTodayISO(),
      );
      if (!deadline) return false;
      result = this.attempt(level, id, deadline);
    }

    if (result === 'parent_expired') {
      await this.dialog.alert('No se puede reabrir', 'La fecha límite de lo que lo contiene también pasó. Reabre primero ese elemento.');
    }
    return result === 'ok';
  }

  private attempt(level: HierarchyLevel, id: string, deadline?: string): ReopenResult {
    switch (level) {
      case 'goal': return this.planner.reopenGoal(id, deadline);
      case 'objective': return this.planner.reopenObjective(id, deadline);
      case 'activity': return this.planner.reopenActivity(id, deadline);
      case 'step': return this.planner.reopenStep(id, deadline);
    }
  }
}

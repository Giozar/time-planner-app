import { computed, signal } from '@angular/core';
import { ExecutionSession } from '../../core/models/session.model';
import {
  PlanRequest, applySameTime, isValidPlannedMinutes, manualSession, regenerateFutureSessions,
} from '../../core/rules';

/**
 * Sesiones que se editan en los formularios de tarea simple y paso antes de guardar (CU-31).
 * Solo se regeneran al cambiar el plan (RN-51); lo que el usuario ajusta a mano se conserva hasta entonces.
 */
export class PlanSessionsEditor {
  readonly sessions = signal<ExecutionSession[]>([]);

  /** Fechas generadas que el usuario borró: no se vuelven a generar mientras edita (RN-83). */
  private excluded = new Set<string>();

  constructor(public planId: string, private today: string) {}

  /** Sesiones de hoy en adelante, las que se muestran y se editan. */
  readonly upcoming = computed(() => this.sessions().filter(s => s.scheduledDate >= this.today));

  load(sessions: readonly ExecutionSession[]) {
    this.sessions.set([...sessions]);
  }

  /**
   * Vuelve a generar las sesiones de hoy en adelante con el plan nuevo; con «mismo tiempo», todas toman su tiempo.
   * Sin fecha límite o con un tiempo no válido todavía no hay plan: no cambia nada.
   */
  regenerate(request: PlanRequest, deadline: string, sameTime: boolean) {
    if (!deadline || !isValidPlannedMinutes(request.durationPerExecutionMin)) return;
    const next = regenerateFutureSessions(this.sessions(), request, this.today, deadline, this.planId, this.excluded);
    this.sessions.set(sameTime ? applySameTime(next, request.durationPerExecutionMin, this.today) : next);
  }

  /** «Mismo tiempo»: las sesiones pendientes de hoy en adelante toman `minutes`. */
  applySameTime(minutes: number) {
    if (isValidPlannedMinutes(minutes)) this.sessions.update(all => applySameTime(all, minutes, this.today));
  }

  /** Tiempo de una sola sesión (RN-15). Devuelve si era válido. */
  setMinutes(id: string, minutes: number): boolean {
    if (!isValidPlannedMinutes(minutes)) return false;
    this.sessions.update(all => all.map(s => s.id === id ? { ...s, plannedMinutes: minutes } : s));
    return true;
  }

  /** Agrega una sesión suelta (RN-83). */
  add(date: string, minutes: number) {
    this.sessions.update(all => [...all, manualSession(this.planId, date, minutes)]
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)));
  }

  /**
   * Borra una sesión. Si la generó el plan, su fecha no se vuelve a generar mientras se edita (RN-83).
   * Devuelve esa fecha generada, o `null` si era una sesión agregada a mano.
   */
  remove(id: string): string | null {
    const session = this.sessions().find(s => s.id === id);
    if (!session) return null;
    this.sessions.update(all => all.filter(s => s.id !== id));
    if (session.manual) return null;
    const generated = session.rescheduledFrom ?? session.scheduledDate;
    this.excluded.add(generated);
    return generated;
  }

  /** Una fecha que se vuelve a elegir en el plan deja de estar excluida. */
  include(date: string) {
    this.excluded.delete(date);
  }
}

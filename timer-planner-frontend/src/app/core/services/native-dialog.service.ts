import { Injectable, signal } from '@angular/core';
import { DeletableType, DeletionImpact } from '../models/deletion-impact.model';
import { DELETABLE_TYPE_LABELS, DEADLINE_CONFLICT_LABELS } from '../i18n/labels';
import { DeadlineConflict } from '../rules';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  /** Si se indica, el usuario debe escribir este texto exacto para poder confirmar (RN-62). */
  requireText?: string;
  /** Si se indica, el diálogo pide un entero positivo con este valor inicial. */
  numberDefault?: number;
  numberLabel?: string;
  type: 'confirm' | 'alert';
  resolve: (value: boolean, input?: number) => void;
}

@Injectable({
  providedIn: 'root'
})
export class NativeDialogService {
  private dialogState = signal<DialogOptions | null>(null);
  
  get state() {
    return this.dialogState.asReadonly();
  }

  confirm(title: string, message: string, options?: Partial<DialogOptions>): Promise<boolean> {
    return new Promise((resolve) => {
      this.dialogState.set({
        title,
        message,
        confirmText: options?.confirmText || 'Confirmar',
        cancelText: options?.cancelText || 'Cancelar',
        isDanger: options?.isDanger || false,
        requireText: options?.requireText,
        type: 'confirm',
        resolve
      });
    });
  }

  /** Pide un número entero positivo (minutos reales, RN-71). Devuelve `null` si se cancela. */
  promptMinutes(title: string, message: string, defaultMinutes: number): Promise<number | null> {
    return new Promise((resolve) => {
      this.dialogState.set({
        title,
        message,
        confirmText: 'Guardar',
        cancelText: 'Cancelar',
        numberDefault: defaultMinutes,
        numberLabel: 'Minutos trabajados',
        type: 'confirm',
        resolve: (ok, input) => resolve(ok && input !== undefined ? input : null),
      });
    });
  }

  /** Confirmación de borrado con escritura del título y resumen de lo que se elimina (RN-62). */
  confirmDelete(type: DeletableType, impact: DeletionImpact): Promise<boolean> {
    const label = DELETABLE_TYPE_LABELS[type];
    const lines = [`Vas a eliminar (${label}): "${impact.title}".`];

    const children = [
      impact.objectives && `${impact.objectives} objetivo(s)`,
      impact.activities && `${impact.activities} tarea(s)`,
      impact.steps && `${impact.steps} paso(s)`,
    ].filter(Boolean);
    if (children.length > 0) lines.push(`También se eliminarán: ${children.join(', ')}.`);
    if (impact.completed > 0) lines.push(`Elementos completados que se perderán: ${impact.completed}.`);
    lines.push('', `Para confirmar, escribe el título exacto: ${impact.title}`);

    return this.confirm(`¿Eliminar ${label}?`, lines.join('\n'), {
      confirmText: 'Eliminar',
      isDanger: true,
      requireText: impact.title,
    });
  }

  /** Rechazo de guardado por deadlines: lista las fechas en conflicto (RN-49). */
  alertDeadlineConflicts(conflicts: DeadlineConflict[]): Promise<boolean> {
    const lines = conflicts.map(c => `• ${DEADLINE_CONFLICT_LABELS[c.kind]} "${c.title}": ${c.dates.join(', ')}`);
    return this.alert(
      'No se puede guardar',
      `Estas fechas superan el deadline permitido. Ajusta las fechas o el deadline:\n\n${lines.join('\n')}`
    );
  }

  alert(title: string, message: string, options?: Partial<DialogOptions>): Promise<boolean> {
    return new Promise((resolve) => {
      this.dialogState.set({
        title,
        message,
        confirmText: options?.confirmText || 'Entendido',
        type: 'alert',
        resolve
      });
    });
  }

  close(result: boolean, input?: number) {
    const current = this.dialogState();
    if (current) {
      current.resolve(result, input);
      this.dialogState.set(null);
    }
  }
}

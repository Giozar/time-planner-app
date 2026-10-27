import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExecutionSession, SessionStatus } from '../../../core/models/session.model';
import { MIN_SESSION_MINUTES } from '../../../core/rules';

/**
 * Sesiones de hoy en adelante de una tarea simple o un paso, en su formulario (CU-31).
 * Sin «mismo tiempo» cada una muestra su tiempo para cambiarlo; todas se pueden borrar y, si `canAdd`, se agregan sueltas.
 */
@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-list.component.html',
  styleUrl: './session-list.component.css'
})
export class SessionListComponent {
  sessions = input.required<readonly ExecutionSession[]>();
  sameTime = input.required<boolean>();
  canAdd = input(false);
  minDate = input.required<string>();
  maxDate = input('');

  minutesChange = output<{ id: string; minutes: number }>();
  remove = output<string>();
  add = output<string>();

  readonly SessionStatus = SessionStatus;
  readonly minMinutes = MIN_SESSION_MINUTES;

  onMinutes(session: ExecutionSession, input: HTMLInputElement) {
    const minutes = Number(input.value);
    if (Number.isInteger(minutes) && minutes >= MIN_SESSION_MINUTES) {
      this.minutesChange.emit({ id: session.id, minutes });
    } else {
      input.value = String(session.plannedMinutes);
    }
  }

  onAdd(input: HTMLInputElement) {
    const date = input.value;
    if (!date || date < this.minDate() || (this.maxDate() && date > this.maxDate())) return;
    this.add.emit(date);
    input.value = '';
  }
}

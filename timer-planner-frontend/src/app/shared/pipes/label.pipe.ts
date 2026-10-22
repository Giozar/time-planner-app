import { Pipe, PipeTransform } from '@angular/core';

/**
 * Muestra la etiqueta en español de un valor de enum.
 * Los valores se repiten entre enums (p. ej. ACTIVE), por eso se indica el diccionario:
 * `{{ goal.status | label: goalStatusLabels }}`.
 */
@Pipe({ name: 'label' })
export class LabelPipe implements PipeTransform {
  transform<T extends string>(value: T | null | undefined, labels: Record<T, string>): string {
    return value ? labels[value] ?? value : '';
  }
}

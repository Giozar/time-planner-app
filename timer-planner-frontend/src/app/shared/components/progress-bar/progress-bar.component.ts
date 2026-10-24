import { Component, input } from '@angular/core';

/** Barra de progreso de 0 a 100 en tres tamaños; al 100 % de tamaño `small` se pinta de verde. */
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: '<div class="fill" [style.width.%]="value()" [class.completed]="value() === 100"></div>',
  styleUrl: './progress-bar.component.css',
  host: { '[class]': 'size()', role: 'progressbar', '[attr.aria-valuenow]': 'value()' },
})
export class ProgressBarComponent {
  value = input.required<number>();
  size = input<'large' | 'small' | 'mini'>('large');
}

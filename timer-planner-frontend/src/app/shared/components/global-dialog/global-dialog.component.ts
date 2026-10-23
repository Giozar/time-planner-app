import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NativeDialogService } from '../../../core/services/native-dialog.service';

@Component({
  selector: 'app-global-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-dialog.component.html',
  styleUrl: './global-dialog.component.css'
})
export class GlobalDialogComponent {
  dialogService = inject(NativeDialogService);

  typedText = signal('');

  typedNumber = signal<string | null>(null);

  /** Valor mostrado en la entrada numérica: lo escrito o el inicial. */
  numberText(initial?: number): string {
    return this.typedNumber() ?? String(initial ?? '');
  }

  canConfirm(requireText?: string, numberDefault?: number): boolean {
    if (numberDefault !== undefined) {
      const n = Number(this.numberText(numberDefault));
      return Number.isInteger(n) && n > 0;
    }
    return !requireText || this.typedText() === requireText;
  }

  onCancel() {
    this.reset();
    this.dialogService.close(false);
  }

  onConfirm() {
    const state = this.dialogService.state();
    if (!this.canConfirm(state?.requireText, state?.numberDefault)) return;
    const input = state?.numberDefault !== undefined ? Number(this.numberText(state.numberDefault)) : undefined;
    this.reset();
    this.dialogService.close(true, input);
  }

  private reset() {
    this.typedText.set('');
    this.typedNumber.set(null);
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogField, DialogValues, NativeDialogService } from '../../../core/services/native-dialog.service';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

  typedDate = signal('');

  /** Lo escrito en cada campo de un diálogo con varios campos; los que faltan conservan su valor inicial. */
  typedFields = signal<Record<string, string>>({});

  /** Valor mostrado en la entrada numérica: lo escrito o el inicial. */
  numberText(initial?: number): string {
    return this.typedNumber() ?? String(initial ?? '');
  }

  /** Valor mostrado en un campo: lo escrito o el inicial. */
  fieldText(field: DialogField): string {
    return this.typedFields()[field.key] ?? String(field.value);
  }

  setField(key: string, value: string) {
    this.typedFields.update(fields => ({ ...fields, [key]: value }));
  }

  /** Cada campo es válido: número entero desde su mínimo, fecha dentro de su rango; el texto es libre. */
  fieldsValid(fields: DialogField[]): boolean {
    return fields.every(field => {
      const text = this.fieldText(field);
      if (field.type === 'number') {
        const n = Number(text);
        return text.trim() !== '' && Number.isInteger(n) && n >= (typeof field.min === 'number' ? field.min : 1);
      }
      if (field.type === 'date') {
        const min = typeof field.min === 'string' ? field.min : undefined;
        return ISO_DATE.test(text) && (!min || text >= min) && (!field.max || text <= field.max);
      }
      return true;
    });
  }

  canConfirm(requireText?: string, numberDefault?: number, dateRange?: { min?: string; max?: string }): boolean {
    if (dateRange) {
      const date = this.typedDate();
      return ISO_DATE.test(date) && (!dateRange.min || date >= dateRange.min) && (!dateRange.max || date <= dateRange.max);
    }
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
    if (state?.fields) {
      if (!this.fieldsValid(state.fields)) return;
      const values: DialogValues = {};
      for (const field of state.fields) {
        const text = this.fieldText(field);
        values[field.key] = field.type === 'number' ? Number(text) : text;
      }
      this.reset();
      this.dialogService.close(true, values);
      return;
    }

    if (!this.canConfirm(state?.requireText, state?.numberDefault, this.dateRange(state))) return;
    const input = state?.askDate ? this.typedDate()
      : state?.numberDefault !== undefined ? Number(this.numberText(state.numberDefault)) : undefined;
    this.reset();
    this.dialogService.close(true, input);
  }

  /** Rango de fechas del diálogo, o `undefined` si no pide fecha. */
  dateRange(state: { askDate?: boolean; dateMin?: string; dateMax?: string } | null | undefined) {
    return state?.askDate ? { min: state.dateMin, max: state.dateMax } : undefined;
  }

  private reset() {
    this.typedText.set('');
    this.typedNumber.set(null);
    this.typedDate.set('');
    this.typedFields.set({});
  }
}

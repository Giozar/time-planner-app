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

  canConfirm(requireText?: string): boolean {
    return !requireText || this.typedText() === requireText;
  }

  onCancel() {
    this.typedText.set('');
    this.dialogService.close(false);
  }

  onConfirm() {
    const required = this.dialogService.state()?.requireText;
    if (!this.canConfirm(required)) return;
    this.typedText.set('');
    this.dialogService.close(true);
  }
}

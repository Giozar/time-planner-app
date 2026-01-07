import { Component, inject } from '@angular/core';
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

  onCancel() {
    this.dialogService.close(false);
  }

  onConfirm() {
    this.dialogService.close(true);
  }
}

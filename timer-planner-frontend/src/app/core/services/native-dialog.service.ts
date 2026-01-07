import { Injectable, signal } from '@angular/core';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  type: 'confirm' | 'alert';
  resolve: (value: boolean) => void;
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
        type: 'confirm',
        resolve
      });
    });
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

  close(result: boolean) {
    const current = this.dialogState();
    if (current) {
      current.resolve(result);
      this.dialogState.set(null);
    }
  }
}

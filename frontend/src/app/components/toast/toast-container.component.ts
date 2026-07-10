import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[92%] max-w-md pointer-events-none">
      <div *ngFor="let t of toast.toasts()"
        (click)="toast.dismiss(t.id)"
        class="pointer-events-auto cursor-pointer rounded-xl px-4 py-3 shadow-lg text-sm font-medium flex items-start gap-2 border bg-white"
        [ngClass]="{
          'border-red-200 text-red-700': t.type === 'error',
          'border-emerald-200 text-emerald-700': t.type === 'success',
          'border-slate-200 text-slate-700': t.type === 'info'
        }">
        <span>{{ t.type === 'error' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️' }}</span>
        <span class="flex-1">{{ t.message }}</span>
      </div>
    </div>
  `
})
export class ToastContainerComponent {
  constructor(public toast: ToastService) {}
}

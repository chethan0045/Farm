import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;
  // Suppress identical messages fired in quick succession (e.g. a failing
  // poll or a burst of failed requests) so the screen doesn't fill up.
  private lastShown = new Map<string, number>();
  private static readonly DEDUP_MS = 30_000;

  show(message: string, type: Toast['type'] = 'info', durationMs = 5000) {
    const now = Date.now();
    const key = `${type}:${message}`;
    const last = this.lastShown.get(key);
    if (last && now - last < ToastService.DEDUP_MS) return;
    this.lastShown.set(key, now);

    const toast: Toast = { id: this.nextId++, message, type };
    this.toasts.update(list => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  success(message: string) { this.show(message, 'success', 3000); }
  error(message: string) { this.show(message, 'error', 6000); }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

// Background polling endpoints: the dashboards already render their own
// online/offline state, so a failing poll must not spam toasts every cycle.
const SILENT_PATHS = [
  '/devices/overview',
  '/sensor-data/',
  '/alerts/unread-count',
  '/sensor-alerts/unread-count'
];

// Surfaces every failed HTTP call as a toast so no write (or read) can fail
// silently. 401s are excluded — the auth interceptor redirects to login.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err) => {
      const silent = err?.status === 401 || SILENT_PATHS.some(p => req.url.includes(p));
      if (!silent) {
        const message = err?.error?.error
          || (err?.status === 0 ? 'Network error — check your connection' : `Request failed (${err?.status || 'unknown'})`);
        toast.error(message);
      }
      return throwError(() => err);
    })
  );
};

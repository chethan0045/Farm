import { Injectable } from '@angular/core';
import { timer, EMPTY, Observable } from 'rxjs';
import { switchMap, catchError, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';

// Single polling source shared by every dashboard component. Previously the
// dashboard, climate panel and IoT dashboard each ran their own interval
// against the same endpoints — 3-4x the HTTP traffic for identical data.
// shareReplay with refCount stops polling entirely when nothing subscribes.
@Injectable({ providedIn: 'root' })
export class SensorStore {
  readonly deviceOverview$: Observable<any[]>;
  readonly activeBatches$: Observable<any[]>;

  constructor(private api: ApiService) {
    this.deviceOverview$ = timer(0, 15_000).pipe(
      switchMap(() => this.api.getDeviceOverview().pipe(catchError(() => EMPTY))),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.activeBatches$ = timer(0, 60_000).pipe(
      switchMap(() => this.api.getBatches({ status: 'active' }).pipe(catchError(() => EMPTY))),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}

import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

/**
 * Reusable NL-X16 climate-controller screen replica.
 * Used standalone on the Climate Live page and embedded at the top of the Dashboard.
 */
@Component({
  selector: 'app-climate-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-3">
      <!-- House selector -->
      <div class="flex flex-wrap items-center justify-between gap-2" *ngIf="houses.length > 0">
        <div class="flex flex-wrap gap-2">
          <button *ngFor="let h of houses" (click)="selectHouse(h.houseNumber)"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition"
            [ngClass]="selectedHouse === h.houseNumber ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'">
            <span class="w-2 h-2 rounded-full" [ngClass]="h.onlineCount > 0 ? 'bg-green-400' : 'bg-gray-400'" [class.animate-pulse]="h.onlineCount > 0"></span>
            House {{ h.houseNumber }}
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button *ngIf="isPwa && selectedHouse" (click)="enterFullscreen()" class="text-xs text-gray-400 hover:text-gray-600">⛶ full screen</button>
          <button (click)="loadAll()" class="text-xs text-gray-400 hover:text-gray-600">↻ refresh</button>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="houses.length === 0" class="bg-white rounded-2xl shadow-sm border p-8 text-center">
        <div class="text-4xl mb-2">🌡️</div>
        <p class="text-gray-600 font-medium mb-1">No houses with sensor data yet</p>
        <p class="text-gray-400 text-sm mb-3">Register a device and start the gateway to see live climate</p>
        <a routerLink="/devices" class="text-emerald-600 hover:underline text-sm">Register a device →</a>
      </div>

      <!-- ================= CONTROLLER SCREEN REPLICA ================= -->
      <div *ngIf="selectedHouse" [class.fs-overlay]="fullscreen">
        <div [class.fs-stage]="fullscreen">
          <button *ngIf="fullscreen" (click)="exitFullscreen()" class="fs-back">‹ Back</button>
          <div class="mx-auto max-w-4xl rounded-[28px] p-3 bg-gradient-to-b from-gray-200 to-gray-400 shadow-2xl" [class.fs-bezel]="fullscreen">
        <div class="rounded-[20px] overflow-hidden border-4 border-gray-700 bg-[#06122b] text-white font-mono select-none">

          <!-- Title / status bar -->
          <div class="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#0a1f4d] to-[#0a2a5e] border-b border-cyan-900/50">
            <div class="flex items-center gap-2">
              <span class="text-cyan-300 font-bold tracking-widest text-sm">ABIS</span>
              <span class="text-[10px] text-cyan-500">NL-X16</span>
            </div>
            <span class="text-[11px] font-semibold tracking-wide" [ngClass]="isOnline ? 'text-emerald-400' : 'text-red-400'">
              {{ isOnline ? '● RUNNING' : '● OFFLINE' }} — HOUSE {{ selectedHouse }}
            </span>
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-amber-300 tabular-nums">{{ clock }}</span>
              <button *ngIf="isPwa && !fullscreen" (click)="enterFullscreen()" title="Full screen" class="text-cyan-300 hover:text-cyan-100 text-sm leading-none px-1">⛶</button>
            </div>
          </div>

          <!-- Main 3-zone area -->
          <div class="grid grid-cols-12 gap-2 p-3" [class.opacity-50]="!reading">
            <!-- Left parameter column -->
            <div class="col-span-4 space-y-1.5">
              <div *ngFor="let r of leftRows" class="flex items-center justify-between bg-[#0b1c3f] rounded px-2 py-1.5">
                <span class="text-[10px] text-cyan-400 uppercase">{{ r.label }}</span>
                <span class="tabular-nums"><span class="text-base font-bold" [ngClass]="r.color">{{ r.value }}</span><span class="text-[9px] text-gray-400 ml-0.5">{{ r.unit }}</span></span>
              </div>
            </div>

            <!-- Center: big temperature -->
            <div class="col-span-4 flex flex-col items-center justify-center bg-gradient-to-b from-[#0b1c3f] to-[#06122b] rounded-lg py-3">
              <span class="text-[10px] text-cyan-400 uppercase tracking-widest mb-1">Air Temp</span>
              <div class="text-6xl xl:text-7xl">☀️</div>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-5xl xl:text-6xl font-extrabold tabular-nums drop-shadow-[0_0_12px_rgba(255,80,80,0.6)]" [ngClass]="tempColor(reading?.temperature)">{{ fmt(reading?.temperature, 1) }}</span>
                <span class="text-xl text-gray-300">°C</span>
              </div>
              <div *ngIf="reading?.targetTemperature != null" class="text-[11px] text-gray-300 mt-1">
                target {{ fmt(reading.targetTemperature, 1) }}°C
                <span [ngClass]="deltaColor(reading.temperature, reading.targetTemperature)">({{ deltaLabel(reading.temperature, reading.targetTemperature) }})</span>
              </div>
            </div>

            <!-- Right parameter column -->
            <div class="col-span-4 space-y-1.5">
              <div *ngFor="let r of rightRows" class="flex items-center justify-between bg-[#0b1c3f] rounded px-2 py-1.5">
                <span class="text-[10px] text-cyan-400 uppercase">{{ r.label }}</span>
                <span class="tabular-nums"><span class="text-base font-bold" [ngClass]="r.color">{{ r.value }}</span><span class="text-[9px] text-gray-400 ml-0.5">{{ r.unit }}</span></span>
              </div>
            </div>
          </div>

          <!-- Bottom flock-info strip -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-cyan-900/40 border-t border-cyan-900/50">
            <div class="bg-[#08183a] px-3 py-2 flex items-center gap-2">
              <span class="text-xl">🐤</span>
              <div><p class="text-[9px] text-cyan-400 uppercase">Birds</p><p class="text-sm font-bold tabular-nums">{{ flock.birds }}</p></div>
            </div>
            <div class="bg-[#08183a] px-3 py-2"><p class="text-[9px] text-cyan-400 uppercase">Age</p><p class="text-sm font-bold tabular-nums">{{ flock.age }}</p></div>
            <div class="bg-[#08183a] px-3 py-2"><p class="text-[9px] text-cyan-400 uppercase">Day</p><p class="text-sm font-bold tabular-nums">{{ flock.day }}</p></div>
            <div class="bg-[#08183a] px-3 py-2"><p class="text-[9px] text-cyan-400 uppercase">Mortality</p><p class="text-sm font-bold tabular-nums">{{ flock.mortality }}</p></div>
          </div>
        </div>
          </div>
        </div>
      </div>

      <p *ngIf="selectedHouse && reading?.timestamp" class="text-center text-[11px] text-gray-400">
        Last reading {{ reading.timestamp | date:'medium' }} · auto-refresh {{ refreshInterval }}s
      </p>
      <p *ngIf="selectedHouse && !reading" class="text-center text-[11px] text-gray-400">
        Waiting for first reading from House {{ selectedHouse }}…
      </p>
    </div>
  `,
  styles: [`
    /* Fullscreen mode (installed PWA only): dark stage covering the app */
    .fs-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 100; margin: 0 !important;
      background: #000;
      overflow: hidden;
      overscroll-behavior: contain;
    }
    .fs-stage {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      padding: max(1.25rem, env(safe-area-inset-top), env(safe-area-inset-bottom), env(safe-area-inset-left), env(safe-area-inset-right));
    }
    /* Portrait phones: rotate the stage about the viewport center so the
       controller shows in landscape. translate+rotate from 50%/50% is the
       pattern iOS Safari handles reliably (flex-centering an oversized
       rotated child is not). vh/vw fallback for older iOS without dvh. */
    @media (orientation: portrait) {
      .fs-stage {
        top: 50%; left: 50%;
        width: 100vh; height: 100vw;
        transform: translate(-50%, -50%) rotate(90deg);
      }
      @supports (width: 100dvh) {
        .fs-stage { width: 100dvh; height: 100dvw; }
      }
    }
    .fs-bezel { width: 100%; max-width: 64rem; }
    .fs-back {
      position: absolute; top: 0.9rem; left: 0.9rem; z-index: 10;
      display: inline-flex; align-items: center; gap: 0.3rem;
      background: rgba(15, 23, 42, 0.78); color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 999px;
      padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600;
      backdrop-filter: blur(4px);
    }
    .fs-back:active { background: rgba(30, 41, 59, 0.9); }
  `]
})
export class ClimatePanelComponent implements OnInit, OnDestroy {
  @Input() refreshInterval = 15;
  /* Fullscreen is only offered in the installed web app, not the browser */
  isPwa = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  fullscreen = false;
  houses: any[] = [];
  selectedHouse = '';
  reading: any = null;
  isOnline = false;
  clock = '';
  leftRows: any[] = [];
  rightRows: any[] = [];
  flock = { birds: '--', age: '--', day: '--', mortality: '--' };
  private batches: any[] = [];
  private dataTimer: any;
  private clockTimer: any;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.tickClock();
    this.clockTimer = setInterval(() => { this.tickClock(); this.cdr.detectChanges(); }, 1000);
    this.loadAll();
    this.dataTimer = setInterval(() => this.loadAll(), this.refreshInterval * 1000);
  }

  ngOnDestroy() {
    if (this.dataTimer) clearInterval(this.dataTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.fullscreen) this.exitFullscreen(true);
  }

  enterFullscreen() {
    if (this.fullscreen) return;
    this.fullscreen = true;
    // Push a history entry so the Android back button / iOS back-swipe
    // closes fullscreen instead of leaving the page
    try { history.pushState({ climateFullscreen: true }, ''); } catch {}
    window.addEventListener('popstate', this.onPopState);
    document.body.style.overflow = 'hidden';
    // Native fullscreen + orientation lock help on Android; iPhone has
    // neither API, there the CSS overlay + rotation does all the work
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) {
      try { (document.documentElement as any).requestFullscreen?.()?.catch?.(() => {}); } catch {}
      try { (screen.orientation as any)?.lock?.('landscape')?.catch?.(() => {}); } catch {}
    }
    this.cdr.detectChanges();
  }

  exitFullscreen(fromNav = false) {
    if (!this.fullscreen) return;
    this.fullscreen = false;
    window.removeEventListener('popstate', this.onPopState);
    document.body.style.overflow = '';
    try { (screen.orientation as any)?.unlock?.(); } catch {}
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch {}
    if (!fromNav) { try { history.back(); } catch {} } // consume the entry we pushed
    this.cdr.detectChanges();
  }

  private onPopState = () => { this.exitFullscreen(true); };

  tickClock() {
    const d = new Date();
    this.clock = d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  loadAll() {
    this.api.getDeviceOverview().subscribe({
      next: (data) => {
        this.houses = data || [];
        if (!this.selectedHouse && this.houses.length) this.selectedHouse = this.houses[0].houseNumber;
        this.updateOnline();
        this.cdr.detectChanges();
        if (this.selectedHouse) this.loadReading();
      },
      error: () => {}
    });
    this.api.getBatches({ status: 'active' }).subscribe({
      next: (data) => { this.batches = data || []; this.buildFlock(); this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  updateOnline() {
    const h = this.houses.find(x => x.houseNumber === this.selectedHouse);
    this.isOnline = !!h && h.onlineCount > 0;
  }

  selectHouse(houseNumber: string) {
    this.selectedHouse = houseNumber;
    this.updateOnline();
    this.loadReading();
    this.buildFlock();
  }

  loadReading() {
    this.api.getSensorLatest(this.selectedHouse).subscribe({
      next: (data) => { this.reading = (data && data.timestamp) ? data : null; this.buildRows(); this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  buildRows() {
    const r = this.reading || {};
    this.leftRows = [
      { label: 'Av. Temp',    value: this.fmt(r.temperature, 1),       unit: '°C',  color: this.tempCellColor(r.temperature) },
      { label: 'Target',      value: this.fmt(r.targetTemperature, 1), unit: '°C',  color: 'text-gray-200' },
      { label: 'Humidity',    value: this.fmt(r.humidity, 0),          unit: '%',   color: this.range(r.humidity, 70, 80) },
      { label: 'Static Pres', value: this.fmt(r.staticPressure, 0),    unit: 'Pa',  color: 'text-gray-200' },
      { label: 'Air Inlet',   value: this.fmt(r.airInletPercent, 0),   unit: '%',   color: 'text-gray-200' },
      { label: 'Fan Run',     value: this.fmt(r.fanPercent, 0),        unit: '%',   color: 'text-gray-200' },
    ];
    this.rightRows = [
      { label: 'Air Vol',  value: this.fmt(r.airVelocity, 2),       unit: 'm/s', color: 'text-gray-200' },
      { label: 'CO₂',      value: this.fmt(r.co2PPM, 0),            unit: 'ppm', color: this.range(r.co2PPM, 2500, 3000) },
      { label: 'Ammonia',  value: this.fmt(r.ammoniaPPM, 0),        unit: 'ppm', color: this.range(r.ammoniaPPM, 15, 25) },
      { label: 'Light',    value: this.fmt(r.lightIntensity, 0),    unit: 'lux', color: 'text-gray-200' },
      { label: 'Water',    value: this.fmt(r.waterLevelPercent, 0), unit: '%',   color: 'text-gray-200' },
      { label: 'Feed',     value: this.fmt(r.feedLevelPercent, 0),  unit: '%',   color: 'text-gray-200' },
    ];
  }

  buildFlock() {
    const b = this.batches.find(x => x.houseNumber === this.selectedHouse && x.status === 'active');
    if (!b) { this.flock = { birds: '--', age: '--', day: '--', mortality: '--' }; return; }
    const day = b.dayCount || 0;
    this.flock = {
      birds: (b.currentCount ?? b.chicksArrived ?? '--').toLocaleString?.() ?? String(b.currentCount ?? '--'),
      age: day ? `${Math.floor(day / 7)}w ${day % 7}d` : '--',
      day: String(day || '--'),
      mortality: b.mortalityPercent != null ? `${b.mortalityPercent}%` : '--'
    };
  }

  // --- helpers ---
  fmt(v: any, dp: number): string { return (v === null || v === undefined || isNaN(v)) ? '--' : Number(v).toFixed(dp); }
  range(v: any, warn: number, crit: number): string {
    if (v === null || v === undefined || isNaN(v)) return 'text-gray-500';
    if (v >= crit) return 'text-red-400';
    if (v >= warn) return 'text-amber-300';
    return 'text-emerald-400';
  }
  tempCellColor(v: any): string {
    if (v === null || v === undefined || isNaN(v)) return 'text-gray-500';
    if (v > 35) return 'text-red-400';
    if (v > 30) return 'text-amber-300';
    return 'text-emerald-400';
  }
  tempColor(v: any): string {
    if (v === null || v === undefined || isNaN(v)) return 'text-gray-500';
    if (v > 35) return 'text-red-400';
    if (v > 30) return 'text-amber-300';
    return 'text-red-300';
  }
  deltaLabel(actual: any, target: any): string {
    if ([actual, target].some(x => x == null || isNaN(x))) return '';
    const d = actual - target; return `${d > 0 ? '+' : ''}${d.toFixed(1)}°`;
  }
  deltaColor(actual: any, target: any): string {
    if ([actual, target].some(x => x == null || isNaN(x))) return 'text-gray-400';
    return Math.abs(actual - target) <= 1 ? 'text-emerald-400' : 'text-amber-300';
  }
}

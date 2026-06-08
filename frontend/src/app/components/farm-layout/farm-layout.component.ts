import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

interface Sensor {
  id: string; x: number; y: number; icon: string; label: string;
  field: string | null;          // maps to a reading field, else 'planned'
  detects: string; why: string; zone: string;
  warn?: number; crit?: number;  // thresholds (above = worse)
  dp?: number; unit?: string;
}

@Component({
  selector: 'app-farm-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="ctrl-eyebrow">ABIS Control · House Map</p>
          <h1 class="text-2xl ctrl-title">Farm Layout</h1>
          <p class="text-sm ctrl-sub">Tunnel house · 3 feeder + 4 water lines · 2× 40ft cooling pads · 7 fans</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button *ngFor="let h of houses" (click)="selectHouse(h.houseNumber)"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition"
            [ngClass]="selectedHouse === h.houseNumber ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white/5 text-slate-300 border-cyan-900/40 hover:border-cyan-400'">
            <span class="ctrl-led" [ngClass]="h.onlineCount > 0 ? 'ctrl-led-on' : 'ctrl-led-off'"></span>
            House {{ h.houseNumber }}
          </button>
        </div>
      </div>

      <!-- Problem banner -->
      <div class="ctrl-panel p-3 flex items-center gap-3" [class.!border-red-500]="problems.length > 0">
        <span class="ctrl-led" [ngClass]="problems.length ? 'ctrl-led-alarm' : 'ctrl-led-on'"></span>
        <p class="text-sm font-mono" [ngClass]="problems.length ? 'text-red-300' : 'text-emerald-300'">
          {{ problems.length ? problems.length + ' problem zone(s) detected — see red markers' : 'All monitored zones nominal' }}
        </p>
        <span *ngFor="let p of problems" class="ctrl-chip !text-red-300 !border-red-500/40 !bg-red-500/10">{{ p }}</span>
      </div>

      <!-- ============ SVG HOUSE MAP ============ -->
      <div class="ctrl-panel p-3 overflow-x-auto">
        <svg viewBox="0 0 1000 560" class="w-full min-w-[760px]" font-family="JetBrains Mono, monospace">
          <!-- House shell -->
          <rect x="120" y="60" width="760" height="380" rx="8" fill="#0b1c3f" stroke="#22d3ee" stroke-opacity="0.4" stroke-width="2"/>

          <!-- Cooling pads (inlet, left end, two sides 40ft) -->
          <rect x="120" y="70" width="16" height="150" fill="#0ea5e9" opacity="0.55"/>
          <rect x="120" y="280" width="16" height="150" fill="#0ea5e9" opacity="0.55"/>
          <text x="92" y="150" fill="#7dd3fc" font-size="11" text-anchor="middle" transform="rotate(-90 92 150)">PAD 40ft</text>
          <text x="92" y="360" fill="#7dd3fc" font-size="11" text-anchor="middle" transform="rotate(-90 92 360)">PAD 40ft</text>

          <!-- 7 exhaust fans (right end) -->
          <g *ngFor="let f of fans; let i = index">
            <circle [attr.cx]="868" [attr.cy]="78 + i*57" r="18" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
            <path [attr.d]="fanBlades(868, 78 + i*57)" fill="#94a3b8"/>
          </g>
          <text x="930" y="250" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 930 250)">7 EXHAUST FANS</text>

          <!-- Airflow arrow -->
          <line x1="170" y1="50" x2="830" y2="50" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="6 5" marker-end="url(#arrow)"/>
          <text x="500" y="42" fill="#22d3ee" font-size="11" text-anchor="middle">AIR FLOW  (pad → fans)</text>
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#22d3ee"/></marker></defs>

          <!-- 4 water (nipple) lines -->
          <g *ngFor="let w of [110,200,300,400]">
            <line x1="150" [attr.y1]="w" x2="850" [attr.y2]="w" stroke="#38bdf8" stroke-width="2"/>
          </g>
          <text x="160" y="424" fill="#38bdf8" font-size="10">4× WATER LINES</text>

          <!-- 3 feeder lines -->
          <g *ngFor="let fd of [150,250,350]">
            <line x1="150" [attr.y1]="fd" x2="850" [attr.y2]="fd" stroke="#f59e0b" stroke-width="4" stroke-opacity="0.8"/>
          </g>
          <text x="160" y="146" fill="#fbbf24" font-size="10">3× FEEDER LINES</text>

          <!-- Front service area -->
          <g font-size="10" fill="#cbd5e1">
            <rect x="150" y="470" width="90" height="60" rx="5" fill="#0b1c3f" stroke="#475569"/><text x="195" y="504" text-anchor="middle">Control</text>
            <rect x="260" y="470" width="80" height="60" rx="5" fill="#0b1c3f" stroke="#475569"/><text x="300" y="504" text-anchor="middle">Office</text>
            <rect x="360" y="470" width="80" height="60" rx="5" fill="#0b1c3f" stroke="#475569"/><text x="400" y="498" text-anchor="middle">Entrance</text><text x="400" y="512" text-anchor="middle">/Doors</text>
            <rect x="470" y="470" width="80" height="60" rx="5" fill="#1c1917" stroke="#a16207"/><text x="510" y="504" text-anchor="middle" fill="#fcd34d">Silo</text>
            <rect x="570" y="470" width="90" height="60" rx="5" fill="#0c2a3a" stroke="#0891b2"/><text x="615" y="498" text-anchor="middle" fill="#67e8f9">Water</text><text x="615" y="512" text-anchor="middle" fill="#67e8f9">tank</text>
            <rect x="680" y="470" width="90" height="60" rx="5" fill="#0c2a3a" stroke="#0891b2"/><text x="725" y="498" text-anchor="middle" fill="#67e8f9">Medi</text><text x="725" y="512" text-anchor="middle" fill="#67e8f9">tank</text>
            <rect x="790" y="470" width="90" height="60" rx="5" fill="#0c2a3a" stroke="#0891b2"/><text x="835" y="498" text-anchor="middle" fill="#67e8f9">Pad water</text><text x="835" y="512" text-anchor="middle" fill="#67e8f9">tank</text>
          </g>

          <!-- Sensor markers -->
          <g *ngFor="let s of sensors" style="cursor:pointer" (click)="selected = s">
            <circle [attr.cx]="s.x" [attr.cy]="s.y" r="14" [attr.fill]="markerFill(s)" [attr.stroke]="selected?.id === s.id ? '#fff' : markerStroke(s)" stroke-width="2"/>
            <text [attr.x]="s.x" [attr.y]="s.y + 4" text-anchor="middle" font-size="13">{{ s.icon }}</text>
          </g>
        </svg>

        <!-- Legend -->
        <div class="flex flex-wrap gap-4 mt-2 px-1 text-[11px] font-mono text-slate-400">
          <span class="flex items-center gap-1"><span class="ctrl-led ctrl-led-on"></span> nominal</span>
          <span class="flex items-center gap-1"><span class="ctrl-led ctrl-led-warn"></span> warning</span>
          <span class="flex items-center gap-1"><span class="ctrl-led ctrl-led-alarm"></span> alarm</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span> planned (no live data)</span>
        </div>
      </div>

      <!-- Selected sensor detail -->
      <div *ngIf="selected" class="ctrl-card p-4">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" [style.background]="markerFill(selected) + '33'">{{ selected.icon }}</div>
            <div>
              <h3 class="font-bold text-gray-800">{{ selected.label }}</h3>
              <p class="text-[11px] text-gray-400">{{ selected.zone }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold ctrl-readout" [style.color]="liveValue(selected) === null ? '#94a3b8' : markerFill(selected)">
              {{ liveValue(selected) === null ? '--' : (liveValue(selected) | number:'1.0-' + (selected.dp || 0)) }}<span class="text-xs text-gray-400 ml-0.5">{{ selected.unit }}</span>
            </p>
            <p class="text-[10px] uppercase tracking-wide" [class.text-emerald-600]="status(selected)==='ok'" [class.text-amber-500]="status(selected)==='warn'" [class.text-red-600]="status(selected)==='alarm'" [class.text-gray-400]="status(selected)==='none'">{{ statusLabel(selected) }}</p>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
          <div class="bg-gray-50 rounded-lg p-3"><p class="text-[10px] text-gray-400 uppercase mb-1">Detects</p><p class="text-gray-700">{{ selected.detects }}</p></div>
          <div class="bg-gray-50 rounded-lg p-3"><p class="text-[10px] text-gray-400 uppercase mb-1">Why here</p><p class="text-gray-700">{{ selected.why }}</p></div>
        </div>
      </div>

      <!-- Sensor checklist -->
      <div class="ctrl-card p-4">
        <h3 class="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><span>🧭</span> Sensor placement plan ({{ sensors.length }})</h3>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <button *ngFor="let s of sensors" (click)="selected = s"
            class="flex items-center gap-2 p-2 rounded-lg border text-left hover:border-emerald-300 transition"
            [class.border-gray-200]="status(s)!=='alarm'" [class.border-red-300]="status(s)==='alarm'" [class.bg-red-50]="status(s)==='alarm'">
            <span class="ctrl-led shrink-0" [ngClass]="ledClass(s)"></span>
            <span class="text-base">{{ s.icon }}</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-gray-800 truncate">{{ s.label }}</p>
              <p class="text-[10px] text-gray-400 truncate">{{ s.zone }}</p>
            </div>
            <span class="ml-auto text-xs font-bold ctrl-readout" [style.color]="liveValue(s) === null ? '#9ca3af' : markerFill(s)">
              {{ liveValue(s) === null ? '—' : (liveValue(s) | number:'1.0-' + (s.dp||0)) }}{{ liveValue(s)===null ? '' : s.unit }}
            </span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class FarmLayoutComponent implements OnInit, OnDestroy {
  houses: any[] = [];
  selectedHouse = '';
  reading: any = null;
  selected: Sensor | null = null;
  problems: string[] = [];
  fans = Array(7);
  private timer: any;

  // Sensor placement plan for a tunnel-ventilated EC broiler house
  sensors: Sensor[] = [
    { id: 'th1', x: 200, y: 250, icon: '🌡️', label: 'Temp/Humidity — Inlet', field: 'temperature', detects: 'Air temp & RH where cool air enters from the pads', why: 'Coolest point of the tunnel; sets the start of the temperature gradient', zone: 'Cooling-pad end', warn: 30, crit: 35, dp: 1, unit: '°C' },
    { id: 'th2', x: 500, y: 250, icon: '🌡️', label: 'Temp/Humidity — Bird zone', field: 'temperature', detects: 'Temp & RH at bird level mid-house', why: 'Where the flock actually lives — the value that must stay on target', zone: 'Mid-house', warn: 30, crit: 35, dp: 1, unit: '°C' },
    { id: 'th3', x: 800, y: 250, icon: '🌡️', label: 'Temp/Humidity — Fan end', field: 'temperature', detects: 'Warmest point before exhaust', why: 'Tunnel gradient end; a big jump here = airflow/fan problem', zone: 'Fan end', warn: 32, crit: 37, dp: 1, unit: '°C' },
    { id: 'sp', x: 175, y: 110, icon: '🎈', label: 'Static Pressure', field: 'staticPressure', detects: 'Pressure differential across the inlets/pads', why: 'At the inlet end — tells if pads/inlets are set right for min ventilation', zone: 'Inlet', dp: 0, unit: 'Pa' },
    { id: 'nh3a', x: 430, y: 350, icon: '🫧', label: 'Ammonia — Litter (mid)', field: 'ammoniaPPM', detects: 'NH₃ at bird/litter level', why: 'Bird-level mid-house; ammonia pools low where litter is active', zone: 'Mid-house litter', warn: 15, crit: 25, dp: 0, unit: 'ppm' },
    { id: 'nh3b', x: 250, y: 350, icon: '🫧', label: 'Ammonia — Wet zone', field: null, detects: 'NH₃ near the damp pad-end litter', why: 'Litter near pads gets wet → highest ammonia release point', zone: 'Pad-end litter', warn: 15, crit: 25, dp: 0, unit: 'ppm' },
    { id: 'co2', x: 560, y: 150, icon: '🟢', label: 'CO₂', field: 'co2PPM', detects: 'Carbon dioxide mid-house', why: 'Best single indicator of whether minimum ventilation is enough', zone: 'Mid-house', warn: 2500, crit: 3000, dp: 0, unit: 'ppm' },
    { id: 'vel', x: 640, y: 250, icon: '🌬️', label: 'Air Velocity', field: 'airVelocity', detects: 'Wind speed in the bird zone', why: 'Confirms tunnel wind-chill is actually reaching the birds', zone: 'Mid/fan path', dp: 2, unit: 'm/s' },
    { id: 'feed', x: 510, y: 500, icon: '🌾', label: 'Feed Level — Silo', field: 'feedLevelPercent', detects: 'Feed remaining in the silo', why: 'On the silo — early warning before feed runs out', zone: 'Silo', dp: 0, unit: '%' },
    { id: 'water', x: 615, y: 500, icon: '🚰', label: 'Water Level/Flow', field: 'waterLevelPercent', detects: 'Water tank level & line flow', why: 'On the water header/tank — a flow drop is an early sickness sign', zone: 'Water tank', dp: 0, unit: '%' },
    { id: 'padw', x: 835, y: 500, icon: '💧', label: 'Pad Water', field: null, detects: 'Cooling-pad water flow & sump level', why: 'On the pad water tank — confirms pads are wetting and cooling', zone: 'Pad water tank', dp: 0, unit: '%' },
    { id: 'fan', x: 868, y: 420, icon: '🌀', label: 'Fan Status/Current', field: null, detects: 'Each exhaust fan running / current draw', why: 'On the fan bank — a dead fan creates a hot dead-spot', zone: 'Fan wall', dp: 0, unit: '' },
    { id: 'light', x: 500, y: 110, icon: '💡', label: 'Light', field: 'lightIntensity', detects: 'Light intensity mid-house', why: 'Mid-house at bird level — drives feed intake & uniformity', zone: 'Mid-house', dp: 0, unit: 'lux' },
  ];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), 15000);
  }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  load() {
    this.api.getDeviceOverview().subscribe({
      next: (data) => {
        this.houses = data || [];
        if (!this.selectedHouse && this.houses.length) this.selectedHouse = this.houses[0].houseNumber;
        this.cdr.detectChanges();
        if (this.selectedHouse) this.loadReading();
      }, error: () => {}
    });
  }
  selectHouse(h: string) { this.selectedHouse = h; this.loadReading(); }

  loadReading() {
    this.api.getSensorLatest(this.selectedHouse).subscribe({
      next: (d) => { this.reading = (d && d.timestamp) ? d : null; this.computeProblems(); this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  liveValue(s: Sensor): number | null {
    if (!s.field || !this.reading) return null;
    const v = this.reading[s.field];
    return (v === null || v === undefined || isNaN(v)) ? null : v;
  }
  status(s: Sensor): 'ok' | 'warn' | 'alarm' | 'none' {
    const v = this.liveValue(s);
    if (v === null) return 'none';
    if (s.crit != null && v >= s.crit) return 'alarm';
    if (s.warn != null && v >= s.warn) return 'warn';
    return 'ok';
  }
  statusLabel(s: Sensor): string {
    return { ok: 'NOMINAL', warn: 'WARNING', alarm: 'ALARM', none: 'PLANNED · no live data' }[this.status(s)];
  }
  ledClass(s: Sensor): string {
    return { ok: 'ctrl-led-on', warn: 'ctrl-led-warn', alarm: 'ctrl-led-alarm', none: 'ctrl-led-off' }[this.status(s)];
  }
  markerFill(s: Sensor): string {
    return { ok: '#10b981', warn: '#fbbf24', alarm: '#f87171', none: '#475569' }[this.status(s)];
  }
  markerStroke(s: Sensor): string {
    return this.status(s) === 'none' ? '#64748b' : '#0b1c3f';
  }
  fanBlades(cx: number, cy: number): string {
    return `M${cx},${cy} m-10,0 a10,10 0 0,1 10,-8 a10,10 0 0,1 0,16 a10,10 0 0,1 -10,-8 Z`;
  }
  computeProblems() {
    this.problems = this.sensors.filter(s => this.status(s) === 'alarm').map(s => s.label.split(' — ')[0]);
  }
}

import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

/**
 * ABIS-style live climate hero for the dashboard:
 * parameter tiles + isometric 3D house mimic, sensor stat cards with
 * sparklines from recent history, and a system status strip.
 * Wired to the selected house's latest reading + active batch.
 */
@Component({
  selector: 'app-house-viz',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-3">
      <!-- House selector -->
      <div class="flex flex-wrap items-center justify-between gap-2" *ngIf="houses.length > 0">
        <div class="flex flex-wrap gap-2">
          <button *ngFor="let h of houses" (click)="selectHouse(h.houseNumber)"
            class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition"
            [ngClass]="selectedHouse === h.houseNumber ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40' : 'bg-white/5 text-slate-300 border-cyan-900/40 hover:border-cyan-400'">
            <span>🏠</span> House {{ h.houseNumber }}
          </button>
        </div>
        <span class="hv-chip" [ngClass]="reading ? 'hv-chip-ok' : 'hv-chip-warn'">
          <span class="ctrl-led" [ngClass]="reading ? 'ctrl-led-on' : 'ctrl-led-warn'"></span>
          {{ reading?.timestamp ? ('Updated ' + (reading.timestamp | date:'shortTime')) : 'No live data' }}
        </span>
      </div>

      <div *ngIf="houses.length === 0" class="ctrl-panel p-8 text-center">
        <div class="text-4xl mb-2">🏠</div>
        <p class="text-slate-300 font-medium mb-1">No houses with sensor data yet</p>
        <a routerLink="/devices" class="text-cyan-300 hover:underline text-sm">Register a device →</a>
      </div>

      <!-- ============ HERO CLIMATE CARD ============ -->
      <div *ngIf="selectedHouse" class="hv-hero abis-glow">
        <!-- Header -->
        <div class="flex flex-wrap items-center gap-3 px-4 pt-4 md:px-5">
          <div class="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-2xl shrink-0">🏠</div>
          <div class="mr-auto">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-white font-mono leading-none">House {{ selectedHouse }}</h3>
              <span class="hv-pill" [ngClass]="online(currentHouse) ? 'hv-pill-live' : 'hv-pill-off'">● {{ online(currentHouse) ? 'LIVE' : 'OFFLINE' }}</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">3D Climate Overview</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-3xl leading-none">⛅</span>
            <div>
              <p class="text-sm font-bold text-white font-mono leading-tight">{{ v('outdoorTemp',0) }}°C</p>
              <p class="text-[10px] text-slate-400">Outdoor</p>
            </div>
          </div>
          <button (click)="alarmAck = true" class="hv-alarm-btn">🔔 Alarm Reset</button>
          <span class="hv-date">📅 {{ today }}</span>
        </div>

        <!-- Alarm banner -->
        <div *ngIf="alarm" class="mx-4 md:mx-5 mt-3 hv-alarm-banner abis-blink">⚠ {{ alarm }}</div>

        <!-- Body: params | 3D house | params -->
        <div class="grid grid-cols-12 gap-2.5 p-4 md:p-5">
          <div class="col-span-6 md:col-span-3 space-y-1.5">
            <div *ngFor="let r of leftRows" class="hv-row">
              <span class="hv-ico">{{ r.icon }}</span>
              <span class="hv-label">{{ r.label }}</span>
              <span class="hv-val" [class.text-red-400]="r.alarm">{{ r.value }}<span class="hv-unit">{{ r.unit }}</span></span>
            </div>
          </div>

          <div class="col-span-12 md:col-span-6 order-first md:order-none flex flex-col items-center justify-center hv-stagebg rounded-2xl">
            <svg viewBox="160 248 510 222" class="w-full block max-w-xl" font-family="JetBrains Mono, monospace">
              <polygon [attr.points]="floor"     fill="#bfdbfe" opacity="0.20" stroke="#93c5fd" stroke-width="1"/>
              <polygon [attr.points]="backWall"  fill="#dbeafe" opacity="0.26" stroke="#93c5fd" stroke-width="1"/>
              <polygon [attr.points]="leftEnd"   fill="#e0f2fe" opacity="0.30" stroke="#93c5fd" stroke-width="1"/>
              <polygon [attr.points]="rightEnd"  fill="#e0f2fe" opacity="0.30" stroke="#93c5fd" stroke-width="1"/>
              <polygon [attr.points]="roof"      fill="#eff6ff" opacity="0.42" stroke="#bfdbfe" stroke-width="1"/>

              <!-- Cooling pad panels (inlet, near-left) -->
              <polygon [attr.points]="padFront" fill="#22d3ee" opacity="0.85"/>
              <polygon [attr.points]="padEnd"   fill="#22d3ee" opacity="0.85"/>

              <!-- Equipment icons on the slab -->
              <text *ngFor="let e of equip" [attr.x]="e.x" [attr.y]="e.y" [attr.font-size]="e.s" [attr.fill]="e.fill" text-anchor="middle">{{ e.g }}</text>

              <!-- Zone temperatures -->
              <text *ngFor="let z of zones" [attr.x]="z.x" [attr.y]="z.y" fill="#fca5a5" font-size="13" text-anchor="middle" class="ctrl-readout">{{ v('temperature',1) }}</text>

              <!-- Humidity drop -->
              <text [attr.x]="dropPos.x" [attr.y]="dropPos.y" font-size="16" text-anchor="middle">💧</text>
              <text [attr.x]="dropPos.x + 16" [attr.y]="dropPos.y" fill="#a5f3fc" font-size="13" class="ctrl-readout">{{ v('humidity',0) }}</text>
            </svg>
            <div class="flex gap-1.5 pb-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span class="w-2 h-2 rounded-full bg-slate-600"></span>
              <span class="w-2 h-2 rounded-full bg-slate-600"></span>
            </div>
          </div>

          <div class="col-span-6 md:col-span-3 space-y-1.5">
            <div *ngFor="let r of rightRows" class="hv-row">
              <span class="hv-ico">{{ r.icon }}</span>
              <span class="hv-label">{{ r.label }}</span>
              <span class="hv-val" [class.text-red-400]="r.alarm">{{ r.value }}<span class="hv-unit">{{ r.unit }}</span></span>
            </div>
          </div>
        </div>

        <!-- Footer strip -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-cyan-900/40 border-t border-cyan-900/50">
          <div class="hv-foot"><span class="text-lg">🐔</span><div><p class="hv-flabel">Inventory</p><p class="hv-fval">{{ inventory }} birds</p></div></div>
          <div class="hv-foot"><span class="text-lg">📈</span><div><p class="hv-flabel">Growth Day</p><p class="hv-fval">{{ growthDay }}</p></div></div>
          <div class="hv-foot"><span class="text-lg">🌡️</span><div><p class="hv-flabel">Air Temp</p><p class="hv-fval hv-temp">{{ v('temperature',1) }}°C</p></div></div>
          <div class="hv-foot"><span class="text-lg">💧</span><div><p class="hv-flabel">Humidity</p><p class="hv-fval">{{ v('humidity',0) }}%</p></div></div>
        </div>
      </div>

      <!-- ============ SENSOR STAT CARDS ============ -->
      <div *ngIf="selectedHouse" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
        <div *ngFor="let c of statCards" class="hv-stat">
          <div class="flex items-center gap-3 px-4 pt-4">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" [style.background]="c.iconBg">{{ c.icon }}</div>
            <div class="min-w-0">
              <p class="text-xs text-slate-400">{{ c.label }}</p>
              <p class="text-xl font-bold text-white font-mono leading-tight">{{ c.value }} <span class="text-xs font-normal text-slate-400">{{ c.unit }}</span></p>
              <p class="text-[10px] text-slate-500">{{ c.sub }}</p>
            </div>
          </div>
          <svg viewBox="0 0 100 26" preserveAspectRatio="none" class="w-full h-9 mt-2 block">
            <path [attr.d]="c.area" [attr.fill]="c.color" opacity="0.18"></path>
            <path [attr.d]="c.line" fill="none" [attr.stroke]="c.color" stroke-width="1.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
          </svg>
        </div>
      </div>

      <!-- ============ SYSTEM STATUS ============ -->
      <div *ngIf="selectedHouse" class="hv-hero">
        <p class="ctrl-eyebrow px-4 pt-3 pb-2 md:px-5">System Status</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-cyan-900/30 border-t border-cyan-900/40">
          <div class="hv-foot"><span class="text-lg">🖥️</span><div><p class="hv-flabel">Devices</p><p class="hv-fval">{{ sys.devOnline }} / {{ sys.devTotal }} <span class="hv-fsub text-emerald-400">● Online</span></p></div></div>
          <div class="hv-foot"><span class="text-lg">🔔</span><div><p class="hv-flabel">Alarms</p><p class="hv-fval">{{ sys.alarms }} <span class="hv-fsub" [ngClass]="sys.alarms > 0 ? 'text-red-400' : 'text-emerald-400'">● Active</span></p></div></div>
          <div class="hv-foot"><span class="text-lg">⚙️</span><div><p class="hv-flabel">Automation</p><p class="hv-fval">{{ sys.rules }} <span class="hv-fsub text-emerald-400">● Running</span></p></div></div>
          <div class="hv-foot"><span class="text-lg">🕒</span><div><p class="hv-flabel">Last Update</p><p class="hv-fval">{{ reading?.timestamp ? (reading.timestamp | date:'HH:mm:ss') : '--:--:--' }} <span class="hv-fsub text-cyan-300">◉ Live</span></p></div></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hv-hero {
      background: linear-gradient(180deg, #0b1c3f, #06122b);
      border: 1px solid rgba(34, 211, 238, 0.22);
      border-radius: 1.25rem; overflow: hidden; color: #e2e8f0;
    }
    .hv-stagebg { background: radial-gradient(ellipse at center, rgba(34, 211, 238, 0.09), transparent 70%); }
    .hv-chip {
      display: inline-flex; align-items: center; gap: 0.45rem;
      font-family: var(--ctrl-mono); font-size: 11px;
      padding: 0.3rem 0.75rem; border-radius: 999px; border: 1px solid;
    }
    .hv-chip-ok   { color: #34d399; border-color: rgba(52, 211, 153, 0.35); background: rgba(16, 185, 129, 0.1); }
    .hv-chip-warn { color: #fbbf24; border-color: rgba(251, 191, 36, 0.35); background: rgba(251, 191, 36, 0.08); }
    .hv-pill {
      font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
      padding: 2px 8px; border-radius: 999px; border: 1px solid; font-family: var(--ctrl-mono);
    }
    .hv-pill-live { color: #34d399; background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); }
    .hv-pill-off  { color: #f87171; background: rgba(248, 113, 113, 0.12); border-color: rgba(248, 113, 113, 0.4); }
    .hv-alarm-btn {
      display: inline-flex; align-items: center; gap: 0.35rem;
      color: #67e8f9; border: 1px solid rgba(103, 232, 249, 0.5);
      background: rgba(34, 211, 238, 0.07);
      font-size: 0.78rem; font-weight: 600; font-family: var(--ctrl-mono);
      padding: 0.45rem 0.9rem; border-radius: 0.65rem;
    }
    .hv-alarm-btn:hover { background: rgba(34, 211, 238, 0.15); }
    .hv-date {
      font-family: var(--ctrl-mono); font-size: 0.78rem; font-weight: 700; color: #fbbf24;
      background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25);
      padding: 0.45rem 0.8rem; border-radius: 0.65rem; white-space: nowrap;
    }
    .hv-alarm-banner {
      background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5; border-radius: 0.75rem; padding: 0.4rem 0.8rem;
      font-size: 12px; font-family: var(--ctrl-mono);
    }
    .hv-row {
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(11, 28, 63, 0.85); border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.7rem; padding: 0.45rem 0.6rem;
    }
    .hv-ico {
      width: 1.5rem; height: 1.5rem; border-radius: 999px; flex-shrink: 0;
      background: rgba(255, 255, 255, 0.08);
      display: inline-flex; align-items: center; justify-content: center; font-size: 12px;
    }
    .hv-label { flex: 1; font-size: 11px; color: #cbd5e1; min-width: 0; }
    .hv-val { font-family: var(--ctrl-mono); font-weight: 700; color: #fbbf24; font-size: 0.88rem; white-space: nowrap; }
    .hv-unit { font-size: 9px; color: #64748b; margin-left: 3px; font-weight: 400; }
    .hv-foot { background: #08183a; padding: 0.6rem 0.9rem; display: flex; align-items: center; gap: 0.6rem; }
    .hv-flabel { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #22d3ee; }
    .hv-fval { font-family: var(--ctrl-mono); font-weight: 700; font-size: 0.9rem; color: #e2e8f0; }
    .hv-fsub { font-size: 9px; font-weight: 600; margin-left: 4px; }
    .hv-temp { color: #f59e0b; text-shadow: 0 0 12px rgba(245, 158, 11, 0.5); }
    .hv-stat {
      background: linear-gradient(180deg, #0b1c3f, #06122b);
      border: 1px solid rgba(34, 211, 238, 0.18);
      border-radius: 1rem; overflow: hidden;
      transition: border-color .2s ease, transform .2s ease;
    }
    .hv-stat:hover { border-color: rgba(34, 211, 238, 0.4); transform: translateY(-2px); }
  `]
})
export class HouseVizComponent implements OnInit, OnDestroy {
  @Input() refreshInterval = 15;
  houses: any[] = [];
  selectedHouse = '';
  reading: any = null;
  batch: any = null;
  alarmAck = false;
  today = '';
  leftRows: any[] = [];
  rightRows: any[] = [];
  statCards: any[] = [];
  sys = { devTotal: 0, devOnline: 0, alarms: 0, rules: 0 };
  private history: any[] = [];
  private timer: any;
  private statusTimer: any;

  // iso geometry (screen polygons) + equipment (precomputed)
  floor = ''; backWall = ''; leftEnd = ''; rightEnd = ''; roof = ''; padFront = ''; padEnd = '';
  equip: { x: number; y: number; g: string; fill: string; s: number }[] = [];
  zones: { x: number; y: number }[] = [];
  dropPos = { x: 0, y: 0 };

  // iso projection: long axis recedes up-right (matches the ABIS screen)
  private OX = 175; private OY = 415; private L = 200; private W = 40; private H = 10; private PEAK = 14;
  private ix(x: number, y: number) { return this.OX + x * 2.2 + y * 1.0; }
  private iy(x: number, y: number, z: number) { return this.OY - x * 0.7 + y * 1.0 - z * 2.0; }
  private p(x: number, y: number, z: number) { return `${this.ix(x, y).toFixed(1)},${this.iy(x, y, z).toFixed(1)}`; }

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.tickDate();
    this.buildGeometry();
    this.buildRows();
    this.buildStatCards();
    this.load();
    this.loadStatus();
    this.timer = setInterval(() => { this.tickDate(); this.load(); }, this.refreshInterval * 1000);
    this.statusTimer = setInterval(() => this.loadStatus(), 60000);
  }
  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.statusTimer) clearInterval(this.statusTimer);
  }

  tickDate() { const d = new Date(); this.today = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; }

  buildGeometry() {
    const { L, W, H, PEAK } = this;
    this.floor    = `${this.p(0,0,0)} ${this.p(L,0,0)} ${this.p(L,W,0)} ${this.p(0,W,0)}`;
    this.backWall = `${this.p(0,0,0)} ${this.p(L,0,0)} ${this.p(L,0,H)} ${this.p(0,0,H)}`;
    this.leftEnd  = `${this.p(0,0,0)} ${this.p(0,W,0)} ${this.p(0,W,H)} ${this.p(0,W/2,PEAK)} ${this.p(0,0,H)}`;
    this.rightEnd = `${this.p(L,0,0)} ${this.p(L,W,0)} ${this.p(L,W,H)} ${this.p(L,W/2,PEAK)} ${this.p(L,0,H)}`;
    this.roof     = `${this.p(0,0,H)} ${this.p(L,0,H)} ${this.p(L,W,H)} ${this.p(0,W,H)}`;
    // cooling pad panels near the left (inlet) end
    this.padFront = `${this.p(6,W,2)} ${this.p(42,W,2)} ${this.p(42,W,8)} ${this.p(6,W,8)}`;
    this.padEnd   = `${this.p(0,8,2)} ${this.p(0,34,2)} ${this.p(0,34,8)} ${this.p(0,8,8)}`;

    const P = (x: number, y: number, z: number) => ({ x: this.ix(x, y), y: this.iy(x, y, z) });
    // Equipment icons placed on the slab
    this.equip = [
      // fans cluster at far-right (exhaust)
      ...[6, 16, 26, 34].map(y => ({ ...P(196, y, 9), g: '✳', fill: '#a5f3fc', s: 13 })),
      ...[10, 22, 32].map(y => ({ ...P(190, y, 5), g: '✳', fill: '#a5f3fc', s: 12 })),
      // heaters (flames) on the right half
      { ...P(150, 14, 1), g: '🔥', fill: '#fb923c', s: 16 },
      { ...P(168, 28, 1), g: '🔥', fill: '#fb923c', s: 16 },
      { ...P(178, 8, 1),  g: '🔥', fill: '#fb923c', s: 14 },
      // brooder dome (center)
      { ...P(92, 20, 2), g: '🛎️', fill: '#5eead4', s: 22 },
      // cooling snowflakes near pads + center
      { ...P(30, 30, 1), g: '❄️', fill: '#bae6fd', s: 14 },
      { ...P(64, 10, 1), g: '❄️', fill: '#bae6fd', s: 14 },
      { ...P(110, 34, 1), g: '❄️', fill: '#bae6fd', s: 13 },
    ].map(e => ({ x: e.x, y: e.y, g: e.g, fill: e.fill, s: e.s }));

    // zone temperature label positions
    this.zones = [P(120, 18, 1), P(70, 30, 1), P(160, 12, 1)].map(z => ({ x: z.x, y: z.y }));
    const dp = P(86, 30, 1); this.dropPos = { x: dp.x, y: dp.y };
  }

  load() {
    this.api.getDeviceOverview().subscribe({
      next: (data) => {
        this.houses = data || [];
        if (!this.selectedHouse && this.houses.length) this.selectedHouse = this.houses[0].houseNumber;
        this.cdr.detectChanges();
        if (this.selectedHouse) { this.loadReading(); this.loadBatch(); this.loadHistory(); }
      }, error: () => {}
    });
  }
  loadStatus() {
    this.api.getDevices().subscribe({
      next: (ds) => {
        this.sys.devTotal = (ds || []).length;
        this.sys.devOnline = (ds || []).filter((d: any) => d.status === 'online').length;
        this.cdr.detectChanges();
      }, error: () => {}
    });
    this.api.getUnreadAlertCount().subscribe({
      next: (r) => { this.sys.alarms = r?.count ?? 0; this.cdr.detectChanges(); }, error: () => {}
    });
    this.api.getAutomationRules().subscribe({
      next: (rs) => { this.sys.rules = (rs || []).filter((r: any) => r.enabled).length; this.cdr.detectChanges(); }, error: () => {}
    });
  }
  online(h: any) { return h && h.onlineCount > 0; }
  get currentHouse() { return this.houses.find(x => x.houseNumber === this.selectedHouse); }
  selectHouse(h: string) { this.selectedHouse = h; this.alarmAck = false; this.loadReading(); this.loadBatch(); this.loadHistory(); }
  loadReading() {
    this.api.getSensorLatest(this.selectedHouse).subscribe({
      next: (d) => { this.reading = (d && d.timestamp) ? d : null; this.buildRows(); this.buildStatCards(); this.cdr.detectChanges(); }, error: () => {}
    });
  }
  loadBatch() {
    this.api.getBatches({ status: 'active' }).subscribe({
      next: (b) => { this.batch = (b || []).find((x: any) => x.houseNumber === this.selectedHouse) || null; this.cdr.detectChanges(); }, error: () => {}
    });
  }
  loadHistory() {
    const from = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    this.api.getSensorHistory(this.selectedHouse, { from, resolution: 'raw' }).subscribe({
      next: (rows) => { this.history = (rows || []).slice().reverse(); this.buildStatCards(); this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  buildRows() {
    this.leftRows = [
      { icon: '🌡️', label: 'Av. Temp',     value: this.v('temperature', 1),       unit: '°C' },
      { icon: '🎯', label: 'Target T',     value: this.v('targetTemperature', 1), unit: '°C' },
      { icon: '💧', label: 'Indoor RH',    value: this.v('humidity', 0),          unit: '%' },
      { icon: '🎚️', label: 'Target RH',    value: '50',                           unit: '%' },
      { icon: '❄️', label: 'Vent. level',  value: this.ventLevel,                 unit: '%' },
      { icon: '🔄', label: 'Cycle period', value: '120',                          unit: 'min' },
      { icon: '⏱️', label: 'Run time',     value: '120',                          unit: 'min' },
    ];
    this.rightRows = [
      { icon: '🌤️', label: 'Outdoor T',    value: this.v('outdoorTemp', 1),    unit: '°C' },
      { icon: '🌀', label: 'S. Press.',    value: this.v('staticPressure', 0), unit: 'Pa' },
      { icon: '🎯', label: 'Target S.P.',  value: '12',                        unit: 'Pa' },
      { icon: '♨️', label: 'Boiler T',     value: '--',                        unit: '°C' },
      { icon: '💨', label: 'Air volume',   value: this.v('airVolume', 2),      unit: 'W' },
      { icon: '🍃', label: 'CO₂',          value: this.v('co2PPM', 0),         unit: 'ppm' },
      { icon: '☁️', label: 'NH₃',          value: this.v('ammoniaPPM', 0),     unit: 'ppm', alarm: this.nh3Alarm },
    ];
  }

  buildStatCards() {
    const defs = [
      { key: 'temperature',    label: 'Temperature', unit: '°C',  dp: 1, icon: '🌡️', color: '#10b981', iconBg: 'rgba(16,185,129,0.15)',  sub: `Target: ${this.v('targetTemperature', 0)} °C` },
      { key: 'humidity',       label: 'Humidity',    unit: '%',   dp: 0, icon: '💧', color: '#3b82f6', iconBg: 'rgba(59,130,246,0.15)',  sub: 'Target: 50 %' },
      { key: 'staticPressure', label: 'Pressure',    unit: 'Pa',  dp: 0, icon: '🌀', color: '#8b5cf6', iconBg: 'rgba(139,92,246,0.15)',  sub: 'Target: 12 Pa' },
      { key: 'co2PPM',         label: 'Air Quality', unit: 'ppm', dp: 0, icon: '💨', color: '#14b8a6', iconBg: 'rgba(20,184,166,0.15)',  sub: 'CO₂ Level' },
    ];
    this.statCards = defs.map(d => {
      const series = this.sample(this.history.map((h: any) => h[d.key]));
      const { line, area } = this.spark(series);
      return { ...d, value: this.v(d.key, d.dp), line, area };
    });
  }

  /** Downsample to at most 48 points, dropping null/NaN */
  private sample(values: any[]): number[] {
    const vs = values.filter(v => v !== null && v !== undefined && !isNaN(v)).map(Number);
    if (vs.length <= 48) return vs;
    const step = vs.length / 48;
    return Array.from({ length: 48 }, (_, i) => vs[Math.floor(i * step)]);
  }

  /** Build sparkline line + area paths in a 100x26 viewBox */
  private spark(vs: number[]): { line: string; area: string } {
    const W = 100, H = 26, PAD = 3;
    if (vs.length < 2) {
      const y = H - 6;
      return { line: `M0 ${y} L${W} ${y}`, area: `M0 ${y} L${W} ${y} L${W} ${H} L0 ${H} Z` };
    }
    const min = Math.min(...vs), max = Math.max(...vs), span = (max - min) || 1;
    const pts = vs.map((v, i) => [i * (W / (vs.length - 1)), PAD + (1 - (v - min) / span) * (H - 2 * PAD)]);
    const line = 'M' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');
    return { line, area: `${line} L${W} ${H} L0 ${H} Z` };
  }

  // ---- value formatting ----
  v(field: string, dp: number): string {
    const x = this.reading ? this.reading[field] : null;
    return (x === null || x === undefined || isNaN(x)) ? '--' : Number(x).toFixed(dp);
  }
  get ventLevel(): string {
    if (this.reading?.ventLevel != null) return String(this.reading.ventLevel);
    return this.reading?.airVelocity != null ? String(Math.min(10, Math.round(this.reading.airVelocity * 3))) : '--';
  }
  get nh3Alarm(): boolean { return this.reading?.ammoniaPPM != null && this.reading.ammoniaPPM >= 25; }
  get alarm(): string {
    if (this.alarmAck) return '';
    const a: string[] = [];
    if (this.nh3Alarm) a.push('NH3 overproof');
    if (this.reading?.temperature != null && this.reading.temperature >= 35) a.push('Temp overproof');
    if (this.reading?.co2PPM != null && this.reading.co2PPM >= 3000) a.push('CO2 overproof');
    return a.join(' | ');
  }
  get inventory(): string { return this.batch?.currentCount != null ? String(this.batch.currentCount) : '--'; }
  get growthDay(): string { return this.batch?.dayCount != null ? String(this.batch.dayCount) : '--'; }
}

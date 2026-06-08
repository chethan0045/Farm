import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

/**
 * Replica of the ABIS NL-X16 main "farm layout" mimic screen:
 * parameter columns + 3D house with cooling pads, fans, heaters, brooder,
 * zone temperatures, big temp readout, and the bottom inventory/growth bar.
 * Wired to the selected house's latest reading + active batch.
 */
@Component({
  selector: 'app-house-viz',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-2">
      <!-- House selector -->
      <div class="flex flex-wrap items-center justify-between gap-2" *ngIf="houses.length > 0">
        <div class="flex flex-wrap gap-2">
          <button *ngFor="let h of houses" (click)="selectHouse(h.houseNumber)"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition"
            [ngClass]="selectedHouse === h.houseNumber ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white/5 text-slate-300 border-cyan-900/40 hover:border-cyan-400'">
            <span class="ctrl-led" [ngClass]="online(h) ? 'ctrl-led-on' : 'ctrl-led-off'"></span>
            House {{ h.houseNumber }}
          </button>
        </div>
        <span class="text-xs ctrl-sub">{{ reading?.timestamp ? ('updated ' + (reading.timestamp | date:'shortTime')) : 'no live data' }}</span>
      </div>

      <div *ngIf="houses.length === 0" class="ctrl-panel p-8 text-center">
        <div class="text-4xl mb-2">🏠</div>
        <p class="text-slate-300 font-medium mb-1">No houses with sensor data yet</p>
        <a routerLink="/devices" class="text-cyan-300 hover:underline text-sm">Register a device →</a>
      </div>

      <!-- ============ ABIS NL-X16 SCREEN REPLICA ============ -->
      <div *ngIf="selectedHouse" class="rounded-xl overflow-hidden border border-cyan-900/40 abis-glow">
        <svg viewBox="0 0 820 490" class="w-full block" font-family="JetBrains Mono, monospace">
          <defs>
            <linearGradient id="abisbg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#1d4ed8"/><stop offset="1" stop-color="#10328f"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="820" height="490" fill="url(#abisbg)"/>

          <!-- Top status bar -->
          <text x="22" y="40" font-size="22">🏠</text>
          <text *ngIf="alarm" x="320" y="34" fill="#f87171" font-size="15" text-anchor="middle" class="ctrl-readout abis-blink">{{ alarm }}</text>
          <g (click)="alarmAck = true" style="cursor:pointer">
            <rect x="590" y="20" width="96" height="22" rx="3" fill="#0b1c3f" stroke="#67e8f9"/>
            <text x="638" y="35" fill="#a5f3fc" font-size="11" text-anchor="middle">Alarm Reset</text>
          </g>
          <text x="790" y="35" fill="#fbbf24" font-size="13" text-anchor="end">{{ today }}</text>

          <!-- ===== Parameter columns ===== -->
          <g font-size="13">
            <!-- left -->
            <text x="60" y="78" fill="#dbeafe">Av.T:</text>      <text x="150" y="78" fill="#fbbf24" class="ctrl-readout">{{ v('temperature',1) }}</text>
            <text x="50" y="100" fill="#dbeafe">Target T:</text>  <text x="150" y="100" fill="#fbbf24" class="ctrl-readout">{{ v('targetTemperature',1) }}</text>
            <text x="44" y="122" fill="#dbeafe">indoor RH:</text> <text x="150" y="122" fill="#fbbf24" class="ctrl-readout">{{ v('humidity',0) }}</text>
            <text x="46" y="144" fill="#dbeafe">Target RH:</text> <text x="150" y="144" fill="#fbbf24" class="ctrl-readout">50</text>
            <text x="46" y="166" fill="#dbeafe">Vent. level:</text><text x="156" y="166" fill="#fbbf24" class="ctrl-readout">{{ ventLevel }}</text>
            <text x="40" y="188" fill="#dbeafe">Cycle period:</text><text x="162" y="188" fill="#fbbf24" class="ctrl-readout">120</text>
            <text x="52" y="210" fill="#dbeafe">Run time:</text>   <text x="150" y="210" fill="#fbbf24" class="ctrl-readout">120</text>
            <!-- middle -->
            <text x="370" y="60">⛅</text>
            <text x="300" y="88" fill="#dbeafe">Outdoor T:</text>      <text x="420" y="88" fill="#fbbf24" class="ctrl-readout">{{ v('outdoorTemp',1) }}</text>
            <text x="316" y="110" fill="#dbeafe">S.PRESS.:</text>      <text x="420" y="110" fill="#fbbf24" class="ctrl-readout">{{ v('staticPressure',0) }}</text>
            <text x="286" y="132" fill="#dbeafe">Target S.PRESS.:</text><text x="430" y="132" fill="#fbbf24" class="ctrl-readout">12</text>
            <text x="300" y="154" fill="#dbeafe">Boiler water T:</text> <text x="430" y="154" fill="#fbbf24">_._</text>
            <!-- right -->
            <text x="560" y="78" fill="#dbeafe">air volume:</text> <text x="676" y="78" fill="#fbbf24" class="ctrl-readout">{{ v('airVolume',2) }}W</text>
            <text x="610" y="100" fill="#dbeafe">CO2:</text>        <text x="676" y="100" fill="#fbbf24" class="ctrl-readout">{{ v('co2PPM',0) }}</text>
            <text x="610" y="122" fill="#dbeafe">NH3:</text>        <text x="676" y="122" [attr.fill]="nh3Alarm ? '#f87171' : '#fbbf24'" class="ctrl-readout">{{ v('ammoniaPPM',0) }}</text>
          </g>

          <!-- ===== 3D house ===== -->
          <polygon [attr.points]="floor"     fill="#bfdbfe" opacity="0.22" stroke="#93c5fd" stroke-width="1"/>
          <polygon [attr.points]="backWall"  fill="#dbeafe" opacity="0.28" stroke="#93c5fd" stroke-width="1"/>
          <polygon [attr.points]="leftEnd"   fill="#e0f2fe" opacity="0.30" stroke="#93c5fd" stroke-width="1"/>
          <polygon [attr.points]="rightEnd"  fill="#e0f2fe" opacity="0.30" stroke="#93c5fd" stroke-width="1"/>
          <polygon [attr.points]="roof"      fill="#eff6ff" opacity="0.40" stroke="#bfdbfe" stroke-width="1"/>

          <!-- Cooling pad panels (inlet, near-left) -->
          <polygon [attr.points]="padFront" fill="#22d3ee" opacity="0.85"/>
          <polygon [attr.points]="padEnd"   fill="#22d3ee" opacity="0.85"/>

          <!-- Equipment icons (positioned on the slab) -->
          <text *ngFor="let e of equip" [attr.x]="e.x" [attr.y]="e.y" [attr.font-size]="e.s" [attr.fill]="e.fill" text-anchor="middle">{{ e.g }}</text>

          <!-- Zone temperatures on the floor -->
          <text *ngFor="let z of zones" [attr.x]="z.x" [attr.y]="z.y" fill="#fca5a5" font-size="13" text-anchor="middle" class="ctrl-readout">{{ v('temperature',1) }}</text>

          <!-- Humidity drop -->
          <text [attr.x]="dropPos.x" [attr.y]="dropPos.y" font-size="16" text-anchor="middle">💧</text>
          <text [attr.x]="dropPos.x + 16" [attr.y]="dropPos.y" fill="#a5f3fc" font-size="13" class="ctrl-readout">{{ v('humidity',0) }}</text>

          <!-- Big temperature readout -->
          <text x="690" y="430" fill="#f59e0b" font-size="52" text-anchor="middle" class="ctrl-readout" style="filter:drop-shadow(0 0 10px rgba(245,158,11,.6))">{{ v('temperature',1) }}</text>

          <!-- ===== Bottom bar ===== -->
          <text x="36" y="470" font-size="18">🐔</text>
          <text x="62" y="470" fill="#fbbf24" font-size="13" class="ctrl-readout">{{ comfort }}</text>
          <rect x="430" y="458" width="170" height="14" rx="2" fill="#0e2a6b" stroke="#3b82f6"/>
          <rect x="430" y="458" [attr.width]="growthBar" height="14" rx="2" fill="#22d3ee" opacity="0.7"/>
          <text x="150" y="486" fill="#dbeafe" font-size="12">Inventory: <tspan fill="#fbbf24" class="ctrl-readout">{{ inventory }}</tspan> bird</text>
          <text x="640" y="470" fill="#dbeafe" font-size="12">Weight Growth Day: <tspan fill="#fbbf24" class="ctrl-readout">{{ growthDay }}</tspan> day</text>
        </svg>
      </div>
    </div>
  `
})
export class HouseVizComponent implements OnInit, OnDestroy {
  @Input() refreshInterval = 15;
  houses: any[] = [];
  selectedHouse = '';
  reading: any = null;
  batch: any = null;
  alarmAck = false;
  today = '';
  private timer: any;

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
    this.load();
    this.timer = setInterval(() => { this.tickDate(); this.load(); }, this.refreshInterval * 1000);
  }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

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
        if (this.selectedHouse) { this.loadReading(); this.loadBatch(); }
      }, error: () => {}
    });
  }
  online(h: any) { return h && h.onlineCount > 0; }
  selectHouse(h: string) { this.selectedHouse = h; this.alarmAck = false; this.loadReading(); this.loadBatch(); }
  loadReading() {
    this.api.getSensorLatest(this.selectedHouse).subscribe({
      next: (d) => { this.reading = (d && d.timestamp) ? d : null; this.cdr.detectChanges(); }, error: () => {}
    });
  }
  loadBatch() {
    this.api.getBatches({ status: 'active' }).subscribe({
      next: (b) => { this.batch = (b || []).find((x: any) => x.houseNumber === this.selectedHouse) || null; this.cdr.detectChanges(); }, error: () => {}
    });
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
  get growthBar(): number { const d = this.batch?.dayCount || 0; return Math.max(0, Math.min(170, (d / 42) * 170)); }
  get comfort(): string { return this.v('temperature', 1); }
}

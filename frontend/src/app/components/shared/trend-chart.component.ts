import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Lightweight dependency-free SVG line/area trend chart.
 * Usage: <app-trend-chart [data]="[..]" label="Temp" unit="°C" color="#22d3ee"></app-trend-chart>
 */
@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ctrl-card p-3">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" [style.background]="color"></span>{{ label }}
        </span>
        <span class="text-sm font-bold ctrl-readout" [style.color]="color">{{ last }}<span class="text-[10px] text-gray-400 ml-0.5">{{ unit }}</span></span>
      </div>
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="w-full" preserveAspectRatio="none" [style.height.px]="H">
        <defs>
          <linearGradient [attr.id]="gid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" [attr.stop-color]="color" stop-opacity="0.35"/>
            <stop offset="1" [attr.stop-color]="color" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line *ngFor="let g of grid" x1="0" [attr.y1]="g" [attr.x2]="W" [attr.y2]="g" stroke="#94a3b8" stroke-opacity="0.18" stroke-width="1"/>
        <path *ngIf="area" [attr.d]="area" [attr.fill]="'url(#' + gid + ')'"/>
        <path *ngIf="line" [attr.d]="line" fill="none" [attr.stroke]="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <circle *ngIf="hasData" [attr.cx]="lastX" [attr.cy]="lastY" r="3.5" [attr.fill]="color"/>
        <text *ngIf="!hasData" [attr.x]="W/2" [attr.y]="H/2" text-anchor="middle" fill="#94a3b8" font-size="11">no data</text>
      </svg>
      <div class="flex justify-between text-[9px] text-gray-400 mt-0.5"><span>{{ min }}</span><span>{{ max }}</span></div>
    </div>
  `
})
export class TrendChartComponent implements OnChanges {
  @Input() data: number[] = [];
  @Input() label = '';
  @Input() unit = '';
  @Input() color = '#22d3ee';
  @Input() dp = 1;

  W = 300; H = 80;
  line = ''; area = ''; grid: number[] = [];
  hasData = false; lastX = 0; lastY = 0;
  last = '--'; min = '--'; max = '--';
  gid = 'g' + Math.floor(performance.now() % 100000);

  ngOnChanges() {
    const d = (this.data || []).filter(v => v !== null && v !== undefined && !isNaN(v as any)) as number[];
    this.hasData = d.length > 1;
    this.grid = [0.2, 0.5, 0.8].map(f => +(f * this.H).toFixed(1));
    if (!this.hasData) { this.line = ''; this.area = ''; this.last = d.length ? d[d.length - 1].toFixed(this.dp) : '--'; this.min = this.max = '--'; return; }

    const lo = Math.min(...d), hi = Math.max(...d);
    const pad = (hi - lo) * 0.12 || 1;
    const y0 = lo - pad, y1 = hi + pad;
    const sx = this.W / (d.length - 1);
    const px = (i: number) => +(i * sx).toFixed(2);
    const py = (v: number) => +(this.H - ((v - y0) / (y1 - y0)) * this.H).toFixed(2);

    const pts = d.map((v, i) => `${px(i)},${py(v)}`);
    this.line = 'M' + pts.join(' L');
    this.area = `M0,${this.H} L` + pts.join(' L') + ` L${this.W},${this.H} Z`;
    this.lastX = px(d.length - 1); this.lastY = py(d[d.length - 1]);
    this.last = d[d.length - 1].toFixed(this.dp);
    this.min = lo.toFixed(this.dp); this.max = hi.toFixed(this.dp);
  }
}

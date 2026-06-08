import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Box { x: number; y: number; w: number; h: number; ht: number; label: string; top: string; side: string; }
interface Face { points: string; fill: string; }

@Component({
  selector: 'app-site-plan',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="ctrl-eyebrow">ABIS Control · Site Plan</p>
          <h1 class="text-2xl ctrl-title">Poultry Farm Master Plan</h1>
          <p class="text-sm ctrl-sub">Site 280 ft × 36 ft · tunnel house · 2× 40 ft cooling ponds · scale shown</p>
        </div>
        <button (click)="print()" class="ctrl-btn-ghost">🖨️ Print / Save PDF</button>
      </div>

      <!-- ============ TOP-DOWN MASTER PLAN ============ -->
      <div class="ctrl-panel p-3 overflow-x-auto">
        <p class="ctrl-chip mb-2">Top View · Master Plan (1 ft = {{ S }} px)</p>
        <svg [attr.viewBox]="'0 0 ' + (PW) + ' 240'" class="w-full min-w-[860px]" font-family="JetBrains Mono, monospace">
          <!-- Site boundary -->
          <rect [attr.x]="fx(0)" [attr.y]="fy(0)" [attr.width]="S*280" [attr.height]="S*36" fill="#0b1c3f" stroke="#22d3ee" stroke-width="2"/>

          <!-- Zones (subtle fills) -->
          <rect [attr.x]="fx(0)" [attr.y]="fy(0)" [attr.width]="S*32" [attr.height]="S*36" fill="#f59e0b" opacity="0.06"/>
          <rect [attr.x]="fx(248)" [attr.y]="fy(0)" [attr.width]="S*32" [attr.height]="S*36" fill="#0ea5e9" opacity="0.08"/>

          <!-- Service walkway (perimeter dashed) -->
          <rect [attr.x]="fx(2)" [attr.y]="fy(2)" [attr.width]="S*276" [attr.height]="S*32" fill="none" stroke="#475569" stroke-width="1" stroke-dasharray="3 3"/>

          <!-- Poultry house (central) -->
          <rect [attr.x]="fx(34)" [attr.y]="fy(8)" [attr.width]="S*212" [attr.height]="S*20" rx="2" fill="#102a52" stroke="#7dd3fc" stroke-width="1.5"/>
          <text [attr.x]="fx(140)" [attr.y]="fy(18)" fill="#bae6fd" font-size="9" text-anchor="middle">POULTRY HOUSE  212 ft × 20 ft</text>

          <!-- Feeder + water lines inside house -->
          <line *ngFor="let yy of [12,18,24]" [attr.x1]="fx(40)" [attr.y1]="fy(yy)" [attr.x2]="fx(240)" [attr.y2]="fy(yy)" stroke="#f59e0b" stroke-width="2" opacity="0.6"/>

          <!-- Cooling ponds both sides (40 ft each) + pads -->
          <rect [attr.x]="fx(198)" [attr.y]="fy(1)" [attr.width]="S*40" [attr.height]="S*6" fill="#0ea5e9" opacity="0.6" stroke="#38bdf8"/>
          <rect [attr.x]="fx(198)" [attr.y]="fy(29)" [attr.width]="S*40" [attr.height]="S*6" fill="#0ea5e9" opacity="0.6" stroke="#38bdf8"/>
          <text [attr.x]="fx(218)" [attr.y]="fy(5)" fill="#e0f2fe" font-size="7" text-anchor="middle">COOLING POND 40 ft</text>
          <text [attr.x]="fx(218)" [attr.y]="fy(33)" fill="#e0f2fe" font-size="7" text-anchor="middle">COOLING POND 40 ft</text>

          <!-- Exhaust fans (rear) -->
          <circle *ngFor="let i of [0,1,2,3,4,5,6]" [attr.cx]="fx(250)" [attr.cy]="fy(10 + i*2.5)" r="3.5" fill="#1e293b" stroke="#94a3b8"/>
          <text [attr.x]="fx(258)" [attr.y]="fy(18)" fill="#94a3b8" font-size="7" text-anchor="middle" [attr.transform]="'rotate(-90 ' + fx(258) + ' ' + fy(18) + ')'">7 FANS</text>

          <!-- Front service / utility structures -->
          <rect [attr.x]="fx(20)" [attr.y]="fy(24)" [attr.width]="S*12" [attr.height]="S*10" fill="#1c2a14" stroke="#a3e635"/>
          <text [attr.x]="fx(26)" [attr.y]="fy(29.5)" fill="#d9f99d" font-size="6.5" text-anchor="middle">OFFICE 12×10</text>

          <rect [attr.x]="fx(4)" [attr.y]="fy(3)" [attr.width]="S*5" [attr.height]="S*4" fill="#3b0764" stroke="#c084fc"/>
          <text [attr.x]="fx(6.5)" [attr.y]="fy(9.5)" fill="#e9d5ff" font-size="5.5" text-anchor="middle">CTRL BOX</text>

          <rect [attr.x]="fx(11)" [attr.y]="fy(3)" [attr.width]="S*6" [attr.height]="S*5" fill="#0c2a3a" stroke="#0891b2"/>
          <text [attr.x]="fx(14)" [attr.y]="fy(10.5)" fill="#67e8f9" font-size="5.5" text-anchor="middle">PAD SUMP</text>

          <rect [attr.x]="fx(6)" [attr.y]="fy(13)" [attr.width]="S*10" [attr.height]="S*10" fill="#0c2a3a" stroke="#0891b2"/>
          <text [attr.x]="fx(11)" [attr.y]="fy(18.5)" fill="#67e8f9" font-size="6.5" text-anchor="middle">WATER 10×10</text>

          <rect [attr.x]="fx(20)" [attr.y]="fy(4)" [attr.width]="S*8" [attr.height]="S*8" fill="#3a2a10" stroke="#fbbf24"/>
          <text [attr.x]="fx(24)" [attr.y]="fy(8.5)" fill="#fde68a" font-size="6" text-anchor="middle">SILO 8×8</text>

          <!-- Entrance gate (front, 4 ft) -->
          <line [attr.x1]="fx(0)" [attr.y1]="fy(16)" [attr.x2]="fx(0)" [attr.y2]="fy(20)" stroke="#10b981" stroke-width="4"/>
          <text [attr.x]="fx(0)+4" [attr.y]="fy(15)" fill="#6ee7b7" font-size="7">GATE 4 ft</text>

          <!-- Utility connection lines -->
          <g stroke="#22d3ee" stroke-width="0.8" stroke-dasharray="2 2" opacity="0.7">
            <line [attr.x1]="fx(16)" [attr.y1]="fy(18)" [attr.x2]="fx(34)" [attr.y2]="fy(18)"/>
            <line [attr.x1]="fx(24)" [attr.y1]="fy(12)" [attr.x2]="fx(34)" [attr.y2]="fy(12)"/>
            <line [attr.x1]="fx(14)" [attr.y1]="fy(8)" [attr.x2]="fx(198)" [attr.y2]="fy(6)"/>
          </g>

          <!-- ===== Dimension lines ===== -->
          <!-- overall length 280 -->
          <g stroke="#e2e8f0" stroke-width="0.8" fill="#e2e8f0" font-size="8">
            <line [attr.x1]="fx(0)" [attr.y1]="fy(0)-18" [attr.x2]="fx(280)" [attr.y2]="fy(0)-18"/>
            <line [attr.x1]="fx(0)" [attr.y1]="fy(0)-22" [attr.x2]="fx(0)" [attr.y2]="fy(0)-14"/>
            <line [attr.x1]="fx(280)" [attr.y1]="fy(0)-22" [attr.x2]="fx(280)" [attr.y2]="fy(0)-14"/>
            <text [attr.x]="fx(140)" [attr.y]="fy(0)-22" text-anchor="middle">280 ft</text>
            <!-- width 36 -->
            <line [attr.x1]="fx(0)-16" [attr.y1]="fy(0)" [attr.x2]="fx(0)-16" [attr.y2]="fy(36)"/>
            <line [attr.x1]="fx(0)-20" [attr.y1]="fy(0)" [attr.x2]="fx(0)-12" [attr.y2]="fy(0)"/>
            <line [attr.x1]="fx(0)-20" [attr.y1]="fy(36)" [attr.x2]="fx(0)-12" [attr.y2]="fy(36)"/>
            <text [attr.x]="fx(0)-20" [attr.y]="fy(18)" text-anchor="middle" [attr.transform]="'rotate(-90 ' + (fx(0)-20) + ' ' + fy(18) + ')'">36 ft</text>
            <!-- house length 212 -->
            <line [attr.x1]="fx(34)" [attr.y1]="fy(36)+14" [attr.x2]="fx(246)" [attr.y2]="fy(36)+14"/>
            <line [attr.x1]="fx(34)" [attr.y1]="fy(36)+10" [attr.x2]="fx(34)" [attr.y2]="fy(36)+18"/>
            <line [attr.x1]="fx(246)" [attr.y1]="fy(36)+10" [attr.x2]="fx(246)" [attr.y2]="fy(36)+18"/>
            <text [attr.x]="fx(140)" [attr.y]="fy(36)+24" text-anchor="middle">house 212 ft</text>
          </g>

          <!-- North arrow -->
          <g [attr.transform]="'translate(' + (PW-34) + ',32)'" fill="#22d3ee" stroke="#22d3ee">
            <line x1="0" y1="14" x2="0" y2="-10" stroke-width="1"/>
            <path d="M0,-14 L4,-6 L0,-9 L-4,-6 Z"/>
            <text x="0" y="26" font-size="9" text-anchor="middle" stroke="none">N</text>
          </g>
        </svg>
      </div>

      <!-- ============ ISOMETRIC 3D ============ -->
      <div class="ctrl-panel p-3 overflow-x-auto">
        <p class="ctrl-chip mb-2">Isometric 3D · Massing</p>
        <svg viewBox="0 0 1000 460" class="w-full min-w-[860px]" font-family="JetBrains Mono, monospace">
          <!-- Ground slab -->
          <polygon [attr.points]="groundPoints" fill="#0b1c3f" stroke="#22d3ee" stroke-opacity="0.5" stroke-width="1.5"/>
          <!-- Structures painted back-to-front -->
          <g *ngFor="let s of isoShapes">
            <polygon *ngFor="let f of s.faces" [attr.points]="f.points" [attr.fill]="f.fill" stroke="#0a1326" stroke-width="0.6"/>
            <text *ngIf="s.label" [attr.x]="s.lx" [attr.y]="s.ly" fill="#cbd5e1" font-size="9" text-anchor="middle">{{ s.label }}</text>
          </g>
        </svg>
        <div class="flex flex-wrap gap-4 mt-1 px-1 text-[11px] font-mono text-slate-400">
          <span class="flex items-center gap-1"><span class="w-3 h-3 inline-block" style="background:#1d4ed8"></span> house</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 inline-block" style="background:#0ea5e9"></span> cooling pond</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 inline-block" style="background:#f59e0b"></span> silo</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 inline-block" style="background:#0891b2"></span> water/sump</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 inline-block" style="background:#65a30d"></span> office</span>
        </div>
      </div>

      <!-- Spec / zoning table -->
      <div class="ctrl-card p-4">
        <h3 class="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><span>📐</span> Schedule & zoning</h3>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          <div *ngFor="let r of schedule" class="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span class="text-gray-600">{{ r.k }}</span><span class="font-semibold text-gray-800 ctrl-readout">{{ r.v }}</span>
          </div>
        </div>
        <p class="text-[11px] text-gray-400 mt-3">Assumptions: house width 20 ft centred to leave ~8 ft side service strips; cooling ponds placed along both sides at the pad/inlet section; utility cluster (silo, water tank, sump, control box) and office grouped in the front 0–32 ft service zone; 7 exhaust fans at the rear form the tunnel with the pads. Adjust any dimension and I'll regenerate.</p>
      </div>
    </div>
  `
})
export class SitePlanComponent implements OnInit {
  S = 3;                 // px per foot (top view)
  PW = 280 * 3 + 140;    // svg width with margins
  MX = 70; MY = 60;      // top-view margins

  schedule = [
    { k: 'Site', v: '280 × 36 ft' },
    { k: 'Poultry house', v: '212 × 20 ft' },
    { k: 'Cooling ponds', v: '2 × 40 ft' },
    { k: 'Office', v: '12 × 10 ft' },
    { k: 'Water tank', v: '10 × 10 ft' },
    { k: 'Feed silo', v: '8 × 8 ft · 10 ft H' },
    { k: 'Entrance gate', v: '4 ft' },
    { k: 'Exhaust fans', v: '7 (rear)' },
    { k: 'Control box', v: 'front-left @ sump' },
  ];

  // ---- top-view feet→px ----
  fx(f: number) { return this.MX + f * this.S; }
  fy(f: number) { return this.MY + f * this.S; }

  // ---- isometric ----
  K = 2.2; OX = 360; OY = 150;
  isoX(x: number, y: number) { return this.OX + (x - y) * this.K; }
  isoY(x: number, y: number, z: number) { return this.OY + (x + y) * this.K * 0.5 - z * this.K * 1.3; }
  private p(x: number, y: number, z: number) { return `${this.isoX(x, y).toFixed(1)},${this.isoY(x, y, z).toFixed(1)}`; }

  groundPoints = '';
  isoShapes: { faces: Face[]; label: string; lx: number; ly: number }[] = [];

  private shade(hex: string, f: number) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    const b = Math.min(255, Math.round((n & 255) * f));
    return `rgb(${r},${g},${b})`;
  }

  private boxFaces(b: Box): Face[] {
    const { x, y, w, h, ht, top, side } = b;
    const right = `${this.p(x + w, y, 0)} ${this.p(x + w, y + h, 0)} ${this.p(x + w, y + h, ht)} ${this.p(x + w, y, ht)}`;
    const front = `${this.p(x, y + h, 0)} ${this.p(x + w, y + h, 0)} ${this.p(x + w, y + h, ht)} ${this.p(x, y + h, ht)}`;
    const topf = `${this.p(x, y, ht)} ${this.p(x + w, y, ht)} ${this.p(x + w, y + h, ht)} ${this.p(x, y + h, ht)}`;
    return [
      { points: right, fill: this.shade(side, 0.7) },
      { points: front, fill: this.shade(side, 0.85) },
      { points: topf, fill: top },
    ];
  }

  ngOnInit() {
    // Ground slab footprint (site 280 x 36)
    this.groundPoints = `${this.p(0, 0, 0)} ${this.p(280, 0, 0)} ${this.p(280, 36, 0)} ${this.p(0, 36, 0)}`;

    const boxes: Box[] = [
      { x: 34, y: 8, w: 212, h: 20, ht: 8, label: 'POULTRY HOUSE', top: '#1d4ed8', side: '#1d4ed8' },
      { x: 198, y: 1, w: 40, h: 6, ht: 1, label: 'POND', top: '#0ea5e9', side: '#0ea5e9' },
      { x: 198, y: 29, w: 40, h: 6, ht: 1, label: '', top: '#0ea5e9', side: '#0ea5e9' },
      { x: 20, y: 24, w: 12, h: 10, ht: 9, label: 'OFFICE', top: '#65a30d', side: '#65a30d' },
      { x: 6, y: 13, w: 10, h: 10, ht: 8, label: 'WATER', top: '#0891b2', side: '#0891b2' },
      { x: 20, y: 4, w: 8, h: 8, ht: 10, label: 'SILO', top: '#f59e0b', side: '#f59e0b' },
      { x: 11, y: 3, w: 6, h: 5, ht: 4, label: 'SUMP', top: '#0891b2', side: '#0891b2' },
      { x: 4, y: 3, w: 5, h: 4, ht: 5, label: 'CTRL', top: '#a855f7', side: '#a855f7' },
    ];

    // gable roof for the house (two planes + ridge)
    const h = boxes[0];
    const ymid = h.y + h.h / 2;
    const roofL: Face = { points: `${this.p(h.x, h.y, h.ht)} ${this.p(h.x + h.w, h.y, h.ht)} ${this.p(h.x + h.w, ymid, h.ht + 4)} ${this.p(h.x, ymid, h.ht + 4)}`, fill: '#3b82f6' };
    const roofR: Face = { points: `${this.p(h.x, h.y + h.h, h.ht)} ${this.p(h.x + h.w, h.y + h.h, h.ht)} ${this.p(h.x + h.w, ymid, h.ht + 4)} ${this.p(h.x, ymid, h.ht + 4)}`, fill: '#2563eb' };

    // Build shapes with painter order (far first = smaller x+y center)
    const shapes = boxes.map(b => {
      const faces = this.boxFaces(b);
      if (b.label === 'POULTRY HOUSE') faces.push(roofR, roofL);
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      return { faces, label: b.label, lx: this.isoX(cx, cy), ly: this.isoY(cx, cy, b.ht) - 4, order: cx + cy };
    });
    shapes.sort((a, b) => a.order - b.order);
    this.isoShapes = shapes;
  }

  print() { window.print(); }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen ctrl-shell flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-[#06122b] text-slate-200 flex flex-col fixed h-full z-30 transition-transform border-r border-cyan-900/40"
        [class.-translate-x-full]="!sidebarOpen" [class.translate-x-0]="sidebarOpen"
        [class.lg:translate-x-0]="true">

        <!-- Brand -->
        <div class="p-4 border-b border-cyan-900/40 flex items-center gap-3 bg-gradient-to-r from-[#0a1f4d] to-[#06122b]">
          <img src="logo.png" alt="KVS" class="w-11 h-11 rounded-lg bg-white p-0.5">
          <div class="font-mono leading-tight">
            <h1 class="text-sm font-bold text-cyan-200 tracking-wide">KVS · ABIS</h1>
            <p class="text-cyan-500/70 text-[9px] tracking-[0.2em] uppercase">Control System</p>
          </div>
        </div>

        <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p class="ctrl-navlabel">Control</p>
          <a *ngFor="let it of controlNav" [routerLink]="it.link" routerLinkActive="ctrl-navactive" (click)="sidebarOpen=false" class="ctrl-navlink">
            <span class="ctrl-led ctrl-led-on shrink-0"></span><span>{{ it.icon }}</span> {{ it.label }}
          </a>

          <p class="ctrl-navlabel">Farm</p>
          <a *ngFor="let it of farmNav" [routerLink]="it.link" routerLinkActive="ctrl-navactive" (click)="sidebarOpen=false" class="ctrl-navlink">
            <span class="ctrl-led ctrl-led-off shrink-0"></span><span>{{ it.icon }}</span> {{ it.label }}
          </a>

          <p class="ctrl-navlabel">Insights</p>
          <a routerLink="/ai-insights" routerLinkActive="ctrl-navactive" (click)="sidebarOpen=false" class="ctrl-navlink">
            <span class="ctrl-led ctrl-led-off shrink-0"></span><span>🧠</span> AI Insights
          </a>
          <a routerLink="/analytics" routerLinkActive="ctrl-navactive" (click)="sidebarOpen=false" class="ctrl-navlink">
            <span class="ctrl-led ctrl-led-off shrink-0"></span><span>📈</span> Analytics
          </a>
          <a routerLink="/alerts" routerLinkActive="ctrl-navactive" (click)="sidebarOpen=false" class="ctrl-navlink">
            <span class="ctrl-led shrink-0" [class.ctrl-led-alarm]="unreadAlerts > 0" [class.ctrl-led-off]="unreadAlerts === 0"></span><span>🔔</span> Alerts
            <span *ngIf="unreadAlerts > 0" class="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ctrl-readout">{{ unreadAlerts }}</span>
          </a>
          <a routerLink="/cameras" routerLinkActive="ctrl-navactive" (click)="sidebarOpen=false" class="ctrl-navlink">
            <span class="ctrl-led ctrl-led-off shrink-0"></span><span>📹</span> Cameras
          </a>

          <p class="ctrl-navlabel">Business</p>
          <a *ngFor="let it of businessNav" [routerLink]="it.link" routerLinkActive="ctrl-navactive" (click)="sidebarOpen=false" class="ctrl-navlink">
            <span class="ctrl-led ctrl-led-off shrink-0"></span><span>{{ it.icon }}</span> {{ it.label }}
          </a>
        </nav>

        <div class="p-3 border-t border-cyan-900/40 bg-[#081530] flex items-center justify-between">
          <div>
            <p class="text-sm text-cyan-200 font-mono">{{ (auth.currentUser$ | async)?.username }}</p>
            <button (click)="logout()" class="text-xs text-slate-400 hover:text-cyan-300 mt-1 font-mono">⏻ Logout</button>
          </div>
          <button (click)="toggleTheme()" title="Toggle light/dark"
            class="text-xs font-mono text-cyan-200 border border-cyan-900/60 rounded-lg px-2.5 py-1.5 hover:bg-white/5">
            {{ theme === 'dark' ? '☀️ Light' : '🌙 Dark' }}
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 lg:ml-64">
        <header class="lg:hidden bg-[#06122b] border-b border-cyan-900/40 p-3 flex items-center justify-between sticky top-0 z-20">
          <button (click)="sidebarOpen = !sidebarOpen" class="text-cyan-300">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div class="flex items-center gap-2">
            <img src="logo.png" alt="KVS" class="w-8 h-8 rounded-md bg-white p-0.5">
            <span class="font-bold text-cyan-200 text-sm font-mono">KVS · ABIS</span>
          </div>
          <a routerLink="/alerts" class="relative">
            <span class="text-lg">🔔</span>
            <span *ngIf="unreadAlerts > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{{ unreadAlerts }}</span>
          </a>
        </header>
        <main class="p-4 md:p-6">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Mobile overlay -->
      <div *ngIf="sidebarOpen" (click)="sidebarOpen=false" class="lg:hidden fixed inset-0 bg-black/60 z-20"></div>
    </div>
  `,
  styles: [`
    .ctrl-navlabel { font-family: var(--ctrl-mono); font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(34,211,238,0.55); padding: 0.6rem 0.75rem 0.25rem; }
    .ctrl-navlink { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.7rem; border-radius: 0.5rem; font-size: 0.82rem; color: #cbd5e1; border-left: 2px solid transparent; transition: background .15s ease, color .15s ease, transform .15s ease; }
    .ctrl-navlink:hover { background: rgba(255,255,255,0.06); color: #fff; transform: translateX(2px); }
    .ctrl-navactive { background: linear-gradient(90deg, rgba(34,211,238,0.18), rgba(34,211,238,0.04)) !important; color: #67e8f9 !important; border-left-color: var(--ctrl-cyan) !important; box-shadow: inset 0 0 18px -8px rgba(34,211,238,0.5); }
  `]
})
export class LayoutComponent implements OnInit {
  sidebarOpen = false;
  unreadAlerts = 0;
  theme: 'dark' | 'light' = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';

  controlNav = [
    { link: '/dashboard', icon: '📊', label: 'Dashboard' },
    { link: '/climate-live', icon: '🌡️', label: 'Climate Live' },
    { link: '/iot-dashboard', icon: '📡', label: 'IoT Dashboard' },
    { link: '/devices', icon: '🔧', label: 'Devices' },
    { link: '/device-control', icon: '🎛️', label: 'Control Panel' },
    { link: '/automation-rules', icon: '⚙️', label: 'Automation' },
  ];
  farmNav = [
    { link: '/batches', icon: '🐣', label: 'Batches' },
    { link: '/daily-logs', icon: '📋', label: 'Daily Monitoring' },
    { link: '/mortality', icon: '📉', label: 'Mortality' },
    { link: '/health', icon: '💊', label: 'Health & Vaccination' },
    { link: '/inventory', icon: '📦', label: 'Inventory' },
  ];
  businessNav = [
    { link: '/sales', icon: '🛒', label: 'Sales & Customers' },
    { link: '/finance', icon: '💰', label: 'Finance' },
    { link: '/batch-expenses', icon: '💡', label: 'Batch Expenses' },
  ];

  constructor(public auth: AuthService, private router: Router, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadAlertCount();
    setInterval(() => this.loadAlertCount(), 60000);
  }

  loadAlertCount() {
    this.api.getUnreadAlertCount().subscribe({ next: (r) => { this.unreadAlerts = r.count; this.cdr.detectChanges(); } });
  }

  logout() { this.auth.logout(); this.router.navigate(['/login']); }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.theme);
    const el = document.documentElement;
    el.classList.remove('theme-dark', 'theme-light');
    el.classList.add('theme-' + this.theme);
  }
}

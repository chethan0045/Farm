import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SensorStore } from '../../services/sensor-store.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen ctrl-shell">

      <!-- ===== Top bar (dark navy, full width) ===== -->
      <header class="fixed top-0 left-0 right-0 z-40 bg-[#0b1626] safe-top">
        <div class="h-14 px-3 md:px-5 flex items-center gap-3">
          <!-- Mobile menu -->
          <button (click)="sidebarOpen = !sidebarOpen" class="lg:hidden text-slate-300 hover:text-white p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>

          <!-- Brand -->
          <a routerLink="/dashboard" class="flex items-center gap-2.5">
            <img src="logo.png" alt="KVS" class="w-8 h-8 rounded-lg bg-white p-0.5">
            <span class="text-white font-extrabold tracking-tight text-[17px]">KVS<span class="text-blue-400"> Farm</span></span>
          </a>

          <!-- Farm selector-style label -->
          <div class="hidden md:flex items-center gap-1.5 ml-3 pl-4 border-l border-white/10 text-slate-300 text-sm font-medium">
            ABIS — Poultry Farm
          </div>

          <div class="flex-1"></div>

          <!-- Farm status pill -->
          <span class="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full"
            [ngClass]="farmOnline ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'">
            <span class="w-1.5 h-1.5 rounded-full" [ngClass]="farmOnline ? 'bg-emerald-400' : 'bg-slate-400'" [class.animate-pulse]="farmOnline"></span>
            {{ farmOnline ? 'Farm online' : 'Farm offline' }}
          </span>

          <span class="hidden md:block text-slate-300 text-sm font-medium">KVS Farms</span>

          <!-- Alerts bell -->
          <a routerLink="/alerts" class="relative text-slate-300 hover:text-white p-1.5">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span *ngIf="unreadAlerts > 0" class="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">{{ unreadAlerts }}</span>
          </a>

          <!-- Avatar → account settings -->
          <a routerLink="/settings" class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold uppercase select-none hover:bg-blue-500"
            [title]="((auth.currentUser$ | async)?.username || '') + ' — account settings'">
            {{ ((auth.currentUser$ | async)?.username || 'U').charAt(0) }}
          </a>
        </div>
      </header>

      <!-- ===== Sidebar (light) ===== -->
      <aside class="fixed left-0 z-30 bg-white border-r flex flex-col transition-all duration-200
                    top-14 bottom-0 mt-[env(safe-area-inset-top)]"
        [class.w-64]="!collapsed" [class.w-[76px]]="collapsed"
        [class.-translate-x-full]="!sidebarOpen" [class.translate-x-0]="sidebarOpen"
        [class.lg:translate-x-0]="true">

        <!-- pb-16 on mobile: the fixed bottom tab bar overlays the sidebar's
             lowest items (Settings is last) and steals their taps otherwise -->
        <nav class="flex-1 px-3 py-4 pb-16 lg:pb-4 space-y-4 overflow-y-auto overflow-x-hidden">
          <div *ngFor="let section of nav">
            <p *ngIf="!collapsed" class="px-3 mb-1.5 text-[10.5px] font-bold tracking-[0.14em] uppercase text-slate-400">{{ section.label }}</p>
            <div class="space-y-0.5">
              <a *ngFor="let it of section.items" [routerLink]="it.link" routerLinkActive="nav-active"
                (click)="sidebarOpen = false"
                class="nav-item" [class.justify-center]="collapsed" [title]="collapsed ? it.label : ''">
                <span class="text-[17px] leading-none w-6 text-center shrink-0">{{ it.icon }}</span>
                <span *ngIf="!collapsed" class="truncate">{{ it.label }}</span>
              </a>
            </div>
          </div>
        </nav>

        <!-- User + collapse -->
        <div class="border-t px-3 py-3 space-y-2">
          <div class="flex items-center gap-2.5" [class.justify-center]="collapsed">
            <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold uppercase shrink-0">
              {{ ((auth.currentUser$ | async)?.username || 'U').charAt(0) }}
            </div>
            <div *ngIf="!collapsed" class="min-w-0 flex-1">
              <p class="text-[13px] font-semibold text-slate-700 truncate">{{ (auth.currentUser$ | async)?.username }}</p>
              <button (click)="logout()" class="text-[11.5px] text-slate-400 hover:text-blue-600 font-medium">Sign out</button>
            </div>
          </div>
          <button (click)="toggleCollapse()"
            class="hidden lg:flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            [class.justify-center]="collapsed">
            <span class="transition-transform" [class.rotate-180]="collapsed">‹</span>
            <span *ngIf="!collapsed">Collapse</span>
          </button>
        </div>
      </aside>

      <!-- ===== Main content ===== -->
      <div class="pt-14 mt-[env(safe-area-inset-top)] transition-all duration-200"
        [class.lg:pl-64]="!collapsed" [class.lg:pl-[76px]]="collapsed">
        <main class="p-4 md:p-6 max-w-[1440px] mx-auto safe-main">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Mobile overlay -->
      <div *ngIf="sidebarOpen" (click)="sidebarOpen = false" class="lg:hidden fixed inset-0 bg-slate-900/40 z-20 mt-14"></div>

      <!-- Mobile bottom tab bar -->
      <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 border-t backdrop-blur safe-bottom">
        <div class="grid grid-cols-5">
          <a routerLink="/dashboard" routerLinkActive="tab-active" (click)="sidebarOpen=false" class="tab-item">
            <span class="tab-ico">📊</span><span>Dashboard</span>
          </a>
          <a routerLink="/climate-live" routerLinkActive="tab-active" (click)="sidebarOpen=false" class="tab-item">
            <span class="tab-ico">🌡️</span><span>Climate</span>
          </a>
          <a routerLink="/iot-dashboard" routerLinkActive="tab-active" (click)="sidebarOpen=false" class="tab-item">
            <span class="tab-ico">📡</span><span>IoT</span>
          </a>
          <a routerLink="/inventory" routerLinkActive="tab-active" (click)="sidebarOpen=false" class="tab-item">
            <span class="tab-ico">📦</span><span>Inventory</span>
          </a>
          <button (click)="sidebarOpen = true" class="tab-item">
            <span class="tab-ico">⋯</span><span>More</span>
          </button>
        </div>
      </nav>
    </div>
  `,
  styles: [`
    .nav-item {
      display: flex; align-items: center; gap: 0.65rem;
      padding: 0.5rem 0.75rem; border-radius: 0.55rem;
      font-size: 13.5px; font-weight: 500; color: #475569;
      transition: background .15s ease, color .15s ease;
    }
    .nav-item:hover { background: #f4f7fb; color: #0f172a; }
    .nav-active { background: #eaf1fe !important; color: #1d4ed8 !important; font-weight: 600; }
    .tab-item {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 0.45rem 0 0.4rem; width: 100%;
      font-size: 10px; font-weight: 500; color: #64748b;
    }
    .tab-ico {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2.1rem; height: 1.5rem; border-radius: 0.55rem; font-size: 1rem;
      transition: background .15s ease;
    }
    .tab-active { color: #1d4ed8; }
    .tab-active .tab-ico { background: #eaf1fe; }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  unreadAlerts = 0;
  farmOnline = false;
  private alertTimer: any;
  private subs = new Subscription();

  nav = [
    {
      label: 'Control',
      items: [
        { link: '/dashboard', icon: '📊', label: 'Dashboard' },
        { link: '/climate-live', icon: '🌡️', label: 'Climate Live' },
        { link: '/iot-dashboard', icon: '📡', label: 'IoT Dashboard' },
        { link: '/devices', icon: '🔧', label: 'Devices' },
        { link: '/device-control', icon: '🎛️', label: 'Control Panel' },
        { link: '/automation-rules', icon: '⚙️', label: 'Automation' },
      ]
    },
    {
      label: 'Farm',
      items: [
        { link: '/batches', icon: '🐣', label: 'Batches' },
        { link: '/daily-logs', icon: '📋', label: 'Daily Monitoring' },
        { link: '/mortality', icon: '📉', label: 'Mortality' },
        { link: '/health', icon: '💊', label: 'Health & Vaccination' },
        { link: '/inventory', icon: '📦', label: 'Inventory' },
      ]
    },
    {
      label: 'Insights',
      items: [
        { link: '/ai-insights', icon: '🧠', label: 'AI Insights' },
        { link: '/analytics', icon: '📈', label: 'Analytics' },
        { link: '/alerts', icon: '🔔', label: 'Alerts' },
        { link: '/cameras', icon: '📹', label: 'Cameras' },
      ]
    },
    {
      label: 'Business',
      items: [
        { link: '/sales', icon: '🛒', label: 'Sales & Customers' },
        { link: '/finance', icon: '💰', label: 'Finance' },
        { link: '/batch-expenses', icon: '💡', label: 'Batch Expenses' },
      ]
    },
    {
      label: 'System',
      items: [
        { link: '/settings', icon: '🛠️', label: 'Settings' },
      ]
    }
  ];

  constructor(public auth: AuthService, private router: Router, private api: ApiService,
              private store: SensorStore, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadAlertCount();
    this.alertTimer = setInterval(() => this.loadAlertCount(), 60000);
    // Shared overview poll powers the "Farm online" pill (same stream the
    // dashboards use — no extra requests)
    this.subs.add(this.store.deviceOverview$.subscribe(houses => {
      this.farmOnline = (houses || []).some((h: any) => h.onlineCount > 0);
      this.cdr.detectChanges();
    }));
  }

  ngOnDestroy() {
    if (this.alertTimer) clearInterval(this.alertTimer);
    this.subs.unsubscribe();
  }

  loadAlertCount() {
    this.api.getUnreadAlertCount().subscribe({ next: (r) => { this.unreadAlerts = r.count; this.cdr.detectChanges(); }, error: () => {} });
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    localStorage.setItem('sidebar-collapsed', String(this.collapsed));
  }

  logout() { this.auth.logout(); this.router.navigate(['/login']); }
}

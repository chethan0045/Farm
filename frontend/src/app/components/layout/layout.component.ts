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
    <div class="min-h-screen bg-gray-50 flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-emerald-800 text-white flex flex-col fixed h-full z-30 transition-transform"
        [class.-translate-x-full]="!sidebarOpen" [class.translate-x-0]="sidebarOpen"
        [class.lg:translate-x-0]="true">
        <div class="p-4 border-b border-emerald-700 flex items-center gap-3">
          <img src="logo.png" alt="KVS Poultry Farms" class="w-12 h-12 rounded-full bg-white p-0.5">
          <div>
            <h1 class="text-base font-bold leading-tight">KVS Poultry Farms</h1>
            <p class="text-emerald-300 text-[10px]">Smart Management System</p>
          </div>
        </div>
        <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p class="text-[10px] text-emerald-400 uppercase tracking-wider px-3 pt-2 pb-1">Overview</p>
          <a routerLink="/dashboard" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>📊</span> Dashboard
          </a>
          <a routerLink="/alerts" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>🔔</span> Alerts
            <span *ngIf="unreadAlerts > 0" class="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{{ unreadAlerts }}</span>
          </a>

          <p class="text-[10px] text-emerald-400 uppercase tracking-wider px-3 pt-3 pb-1">Farm</p>
          <a routerLink="/batches" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>🐣</span> Batches
          </a>
          <a routerLink="/daily-logs" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>📋</span> Daily Monitoring
          </a>
          <a routerLink="/mortality" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>📉</span> Mortality
          </a>

          <p class="text-[10px] text-emerald-400 uppercase tracking-wider px-3 pt-3 pb-1">Health</p>
          <a routerLink="/health" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>💊</span> Health & Vaccination
          </a>
          <a routerLink="/inventory" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>📦</span> Inventory
          </a>

          <p class="text-[10px] text-emerald-400 uppercase tracking-wider px-3 pt-3 pb-1">IoT & AI</p>
          <a routerLink="/iot-dashboard" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>📡</span> IoT Dashboard
          </a>
          <a routerLink="/devices" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>🔧</span> Devices
          </a>
          <a routerLink="/device-control" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>🎛️</span> Control Panel
          </a>
          <a routerLink="/automation-rules" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>⚙️</span> Automation
          </a>
          <a routerLink="/ai-insights" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>🧠</span> AI Insights
          </a>

          <p class="text-[10px] text-emerald-400 uppercase tracking-wider px-3 pt-3 pb-1">Finance</p>
          <a routerLink="/batch-expenses" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>💡</span> Batch Expenses
          </a>
          <a routerLink="/sales" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>🛒</span> Sales & Customers
          </a>
          <a routerLink="/finance" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span>💰</span> Finance
          </a>
        </nav>
        <div class="p-3 border-t border-emerald-700">
          <p class="text-sm text-emerald-300">{{ (auth.currentUser$ | async)?.username }}</p>
          <button (click)="logout()" class="text-xs text-emerald-400 hover:text-white mt-1">Logout</button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 lg:ml-64">
        <header class="lg:hidden bg-white shadow-sm p-3 flex items-center justify-between sticky top-0 z-20">
          <button (click)="sidebarOpen = !sidebarOpen" class="text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div class="flex items-center gap-2">
            <img src="logo.png" alt="KVS" class="w-8 h-8 rounded-full">
            <span class="font-bold text-emerald-700 text-sm">KVS Poultry Farms</span>
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
      <div *ngIf="sidebarOpen" (click)="sidebarOpen=false" class="lg:hidden fixed inset-0 bg-black/50 z-20"></div>
    </div>
  `
})
export class LayoutComponent implements OnInit {
  sidebarOpen = false;
  unreadAlerts = 0;

  constructor(public auth: AuthService, private router: Router, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadAlertCount();
    setInterval(() => this.loadAlertCount(), 60000);
  }

  loadAlertCount() {
    this.api.getUnreadAlertCount().subscribe({ next: (r) => { this.unreadAlerts = r.count; this.cdr.detectChanges(); } });
  }

  logout() { this.auth.logout(); this.router.navigate(['/login']); }
}

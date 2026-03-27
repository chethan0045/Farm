import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
            <p class="text-emerald-300 text-[10px]">Management System</p>
          </div>
        </div>
        <nav class="flex-1 p-4 space-y-1">
          <a routerLink="/dashboard" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span class="text-lg">📊</span> Dashboard
          </a>
          <a routerLink="/batches" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span class="text-lg">🐣</span> Batches
          </a>
          <a routerLink="/daily-logs" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span class="text-lg">📋</span> Daily Monitoring
          </a>
          <a routerLink="/mortality" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span class="text-lg">📉</span> Mortality
          </a>
          <a routerLink="/batch-expenses" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span class="text-lg">💡</span> Batch Expenses
          </a>
          <a routerLink="/finance" routerLinkActive="bg-emerald-700" (click)="sidebarOpen=false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-700 transition text-sm">
            <span class="text-lg">💰</span> Finance
          </a>
        </nav>
        <div class="p-4 border-t border-emerald-700">
          <p class="text-sm text-emerald-300">{{ (auth.currentUser$ | async)?.username }}</p>
          <button (click)="logout()" class="text-sm text-emerald-400 hover:text-white mt-1">Logout</button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 lg:ml-64">
        <header class="lg:hidden bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-20">
          <button (click)="sidebarOpen = !sidebarOpen" class="text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div class="flex items-center gap-2">
            <img src="logo.png" alt="KVS" class="w-8 h-8 rounded-full">
            <span class="font-bold text-emerald-700 text-sm">KVS Poultry Farms</span>
          </div>
          <div></div>
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
export class LayoutComponent {
  sidebarOpen = false;
  constructor(public auth: AuthService, private router: Router) {}
  logout() { this.auth.logout(); this.router.navigate(['/login']); }
}

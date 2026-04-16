import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
  {
    path: '',
    loadComponent: () => import('./components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'batches', loadComponent: () => import('./components/batches/batches.component').then(m => m.BatchesComponent) },
      { path: 'daily-logs', loadComponent: () => import('./components/daily-logs/daily-logs.component').then(m => m.DailyLogsComponent) },
      { path: 'mortality', loadComponent: () => import('./components/mortality/mortality.component').then(m => m.MortalityComponent) },
      { path: 'health', loadComponent: () => import('./components/health/health.component').then(m => m.HealthComponent) },
      { path: 'batch-expenses', loadComponent: () => import('./components/batch-expenses/batch-expenses.component').then(m => m.BatchExpensesComponent) },
      { path: 'inventory', loadComponent: () => import('./components/inventory/inventory.component').then(m => m.InventoryComponent) },
      { path: 'sales', loadComponent: () => import('./components/sales/sales.component').then(m => m.SalesComponent) },
      { path: 'finance', loadComponent: () => import('./components/finance/finance.component').then(m => m.FinanceComponent) },
      { path: 'alerts', loadComponent: () => import('./components/alerts/alerts.component').then(m => m.AlertsComponent) },
      { path: 'iot-dashboard', loadComponent: () => import('./components/iot-dashboard/iot-dashboard.component').then(m => m.IotDashboardComponent) },
      { path: 'devices', loadComponent: () => import('./components/devices/devices.component').then(m => m.DevicesComponent) },
      { path: 'device-control', loadComponent: () => import('./components/device-control/device-control.component').then(m => m.DeviceControlComponent) },
      { path: 'automation-rules', loadComponent: () => import('./components/automation-rules/automation-rules.component').then(m => m.AutomationRulesComponent) },
      { path: 'ai-insights', loadComponent: () => import('./components/ai-insights/ai-insights.component').then(m => m.AiInsightsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

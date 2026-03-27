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
      { path: 'mortality', loadComponent: () => import('./components/mortality/mortality.component').then(m => m.MortalityComponent) },
      { path: 'daily-logs', loadComponent: () => import('./components/daily-logs/daily-logs.component').then(m => m.DailyLogsComponent) },
      { path: 'batch-expenses', loadComponent: () => import('./components/batch-expenses/batch-expenses.component').then(m => m.BatchExpensesComponent) },
      { path: 'finance', loadComponent: () => import('./components/finance/finance.component').then(m => m.FinanceComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

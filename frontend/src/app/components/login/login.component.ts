import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <div class="text-center mb-8">
          <img src="logo.png" alt="KVS Poultry Farms" class="w-28 h-28 mx-auto mb-4 drop-shadow-lg">
          <h1 class="text-2xl font-bold text-emerald-700">KVS Poultry Farms</h1>
          <p class="text-gray-400 mt-1 text-sm">Sign in to manage your farm</p>
        </div>
        <div *ngIf="error" class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100">{{ error }}</div>
        <form (ngSubmit)="onLogin()">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
            <input type="text" [(ngModel)]="username" name="username" required
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition" placeholder="Enter username or email">
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" [(ngModel)]="password" name="password" required
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition" placeholder="Enter password">
          </div>
          <button type="submit" [disabled]="loading"
            class="w-full bg-emerald-600 text-white py-2.5 px-4 rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50 shadow-md hover:shadow-lg">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
        <p class="text-center mt-5 text-sm text-gray-500">
          Don't have an account? <a routerLink="/register" class="text-emerald-600 hover:underline font-medium">Register</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn) this.router.navigate(['/dashboard']);
  }

  onLogin() {
    this.loading = true;
    this.error = '';
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => { this.error = err.error?.error || 'Login failed'; this.loading = false; }
    });
  }
}

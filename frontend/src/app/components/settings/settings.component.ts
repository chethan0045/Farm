import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <p class="ctrl-eyebrow">ABIS Control · System</p>
        <h1 class="text-2xl ctrl-title">Settings</h1>
        <p class="text-sm ctrl-sub">Account, users and ABIS NL-X16 controller configuration</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit">
        <button *ngFor="let t of visibleTabs" (click)="tab = t.id"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          [ngClass]="tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'">
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <!-- ===================== ACCOUNT ===================== -->
      <div *ngIf="tab === 'account'" class="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
        <div class="bg-white rounded-2xl shadow-sm p-6">
          <h2 class="font-bold text-gray-800 mb-1">Profile</h2>
          <p class="text-xs text-gray-400 mb-4">Your login identity across the farm app</p>
          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-600">Username</label>
              <input [(ngModel)]="profile.username" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Email</label>
              <input [(ngModel)]="profile.email" type="email" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              Role: <span class="badge" [ngClass]="auth.isAdmin ? 'badge-blue' : 'badge-gray'">{{ auth.currentUser?.role }}</span>
            </div>
          </div>
          <button (click)="saveProfile()" [disabled]="savingProfile"
            class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            Save Profile
          </button>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-6">
          <h2 class="font-bold text-gray-800 mb-1">Change Password</h2>
          <p class="text-xs text-gray-400 mb-4">Minimum 6 characters</p>
          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-600">Current password</label>
              <input [(ngModel)]="pw.current" type="password" autocomplete="current-password" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">New password</label>
              <input [(ngModel)]="pw.next" type="password" autocomplete="new-password" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Confirm new password</label>
              <input [(ngModel)]="pw.confirm" type="password" autocomplete="new-password" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
          </div>
          <button (click)="changePassword()" [disabled]="savingPw"
            class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            Update Password
          </button>
        </div>
      </div>

      <!-- ===================== USERS (admin) ===================== -->
      <div *ngIf="tab === 'users'" class="space-y-4">
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray-500">{{ users.length }} account{{ users.length === 1 ? '' : 's' }} — public registration stays closed; only admins add users.</p>
          <button (click)="openUserForm()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ Add User</button>
        </div>

        <div class="bg-white rounded-2xl shadow-sm overflow-x-auto">
          <table class="w-full text-sm min-w-[640px]">
            <thead>
              <tr class="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b">
                <th class="px-5 py-3">User</th>
                <th class="px-5 py-3">Role</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3">Created</th>
                <th class="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of users" class="border-b last:border-0 hover:bg-slate-50/60">
                <td class="px-5 py-3">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold uppercase shrink-0">{{ u.username.charAt(0) }}</div>
                    <div>
                      <p class="font-semibold text-slate-700">{{ u.username }} <span *ngIf="u._id === auth.currentUser?.id" class="text-[10px] text-slate-400 font-normal">(you)</span></p>
                      <p class="text-[11.5px] text-slate-400">{{ u.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-3">
                  <span class="badge" [ngClass]="u.role === 'admin' ? 'badge-blue' : 'badge-gray'">{{ u.role }}</span>
                </td>
                <td class="px-5 py-3">
                  <span class="badge" [ngClass]="u.active !== false ? 'badge-green' : 'badge-red'">
                    <span class="badge-dot"></span>{{ u.active !== false ? 'Active' : 'Deactivated' }}
                  </span>
                </td>
                <td class="px-5 py-3 text-slate-500">{{ u.createdAt | date:'mediumDate' }}</td>
                <td class="px-5 py-3">
                  <div class="flex justify-end gap-3 text-xs font-medium">
                    <button (click)="openUserForm(u)" class="text-blue-600 hover:underline">Edit</button>
                    <button (click)="openResetPw(u)" class="text-amber-600 hover:underline">Reset PW</button>
                    <button *ngIf="u._id !== auth.currentUser?.id" (click)="toggleActive(u)" class="text-slate-500 hover:underline">
                      {{ u.active !== false ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button *ngIf="u._id !== auth.currentUser?.id" (click)="deleteUser(u)" class="text-red-600 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===================== ABIS NL-X16 (admin) ===================== -->
      <div *ngIf="tab === 'abis'" class="space-y-4 max-w-4xl">
        <div class="bg-white rounded-2xl shadow-sm p-6">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 class="font-bold text-gray-800 mb-1">ABIS NL-X16 Controller — Bridge Configuration</h2>
              <p class="text-xs text-gray-400">The Raspberry Pi bridge pulls this config every 5 minutes with its device API key. Network settings (API URL, key, listen port) stay in the Pi's local config.json so a bad value here can't cut the bridge off.</p>
            </div>
            <span class="badge badge-gray shrink-0" *ngIf="abisLoadedAt">saved config</span>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label class="text-sm text-gray-600">Modbus slave ID</label>
              <input [(ngModel)]="abis.slaveId" type="number" min="1" max="247" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Function code</label>
              <select [(ngModel)]="abis.functionCode" class="w-full border rounded-lg px-3 py-2 text-sm">
                <option [ngValue]="3">3 — Holding registers</option>
                <option [ngValue]="4">4 — Input registers</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-gray-600">Poll interval (s)</label>
              <input [(ngModel)]="abis.pollSeconds" type="number" min="5" max="3600" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Block start register</label>
              <input [(ngModel)]="abis.blockStart" type="number" min="0" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Block count</label>
              <input [(ngModel)]="abis.blockCount" type="number" min="1" max="125" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" [(ngModel)]="abis.discovery">
                Discovery mode <span class="text-[10px] text-gray-400">(log all registers)</span>
              </label>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-6">
          <div class="flex justify-between items-center mb-1">
            <h2 class="font-bold text-gray-800">Register Map</h2>
            <button (click)="addMapRow()" class="text-blue-600 text-sm font-medium hover:underline">+ Add register</button>
          </div>
          <p class="text-xs text-gray-400 mb-4">Which Modbus register (offset within the block) feeds which sensor field. Scale multiplies the raw value (e.g. 0.1 when the controller reports tenths of a degree).</p>

          <div class="space-y-2">
            <div *ngFor="let m of abis.map; let i = index" class="grid grid-cols-[70px_1fr_90px_70px_32px] gap-2 items-center">
              <input [(ngModel)]="m.offset" type="number" min="0" placeholder="Offset" class="border rounded-lg px-2 py-1.5 text-sm">
              <select [(ngModel)]="m.field" class="border rounded-lg px-2 py-1.5 text-sm">
                <option *ngFor="let f of sensorFields" [value]="f">{{ f }}</option>
              </select>
              <input [(ngModel)]="m.scale" type="number" step="0.001" placeholder="Scale" class="border rounded-lg px-2 py-1.5 text-sm">
              <label class="flex items-center gap-1 text-[11px] text-gray-500 justify-center"><input type="checkbox" [(ngModel)]="m.signed">±</label>
              <button (click)="abis.map.splice(i, 1)" class="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
            </div>
            <p *ngIf="abis.map.length === 0" class="text-sm text-gray-400 py-2">No registers mapped — enable discovery mode, watch the bridge log on the Pi, then map the offsets here.</p>
          </div>

          <div class="flex items-center gap-3 mt-5 pt-4 border-t">
            <button (click)="saveAbis()" [disabled]="savingAbis"
              class="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              Save ABIS Configuration
            </button>
            <p class="text-[11.5px] text-gray-400">Applied by the Pi bridge within 5 minutes — no restart needed.</p>
          </div>
        </div>
      </div>

      <!-- ===== User add/edit modal ===== -->
      <div *ngIf="showUserForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl w-full max-w-md p-6">
          <h2 class="text-lg font-bold mb-4">{{ editUserId ? 'Edit User' : 'Add User' }}</h2>
          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-600">Username *</label>
              <input [(ngModel)]="userForm.username" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Email *</label>
              <input [(ngModel)]="userForm.email" type="email" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div *ngIf="!editUserId">
              <label class="text-sm text-gray-600">Password * <span class="text-[10px] text-gray-400">(min 6 chars)</span></label>
              <input [(ngModel)]="userForm.password" type="password" autocomplete="new-password" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Role</label>
              <select [(ngModel)]="userForm.role" class="w-full border rounded-lg px-3 py-2 text-sm"
                [disabled]="editUserId === auth.currentUser?.id">
                <option value="user">User — full farm access, no user/settings management</option>
                <option value="admin">Admin — everything incl. users & settings</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button (click)="showUserForm = false" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button (click)="saveUser()" [disabled]="savingUser" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {{ editUserId ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ===== Reset password modal ===== -->
      <div *ngIf="resetPwUser" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl w-full max-w-sm p-6">
          <h2 class="text-lg font-bold mb-1">Reset Password</h2>
          <p class="text-sm text-gray-500 mb-4">Set a new password for <b>{{ resetPwUser.username }}</b></p>
          <input [(ngModel)]="resetPwValue" type="password" autocomplete="new-password" placeholder="New password (min 6 chars)"
            class="w-full border rounded-lg px-3 py-2 text-sm">
          <div class="flex justify-end gap-2 mt-5">
            <button (click)="resetPwUser = null" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button (click)="confirmResetPw()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Reset</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  tab: 'account' | 'users' | 'abis' = 'account';

  profile = { username: '', email: '' };
  savingProfile = false;
  pw = { current: '', next: '', confirm: '' };
  savingPw = false;

  users: any[] = [];
  showUserForm = false;
  editUserId = '';
  userForm: any = {};
  savingUser = false;
  resetPwUser: any = null;
  resetPwValue = '';

  abis: any = { slaveId: 1, functionCode: 3, blockStart: 0, blockCount: 40, pollSeconds: 30, discovery: false, map: [] };
  abisLoadedAt: Date | null = null;
  savingAbis = false;
  sensorFields = ['temperature', 'humidity', 'ammoniaPPM', 'co2PPM', 'lightIntensity', 'feedLevelPercent', 'waterLevelPercent'];

  get visibleTabs() {
    const tabs = [{ id: 'account' as const, icon: '👤', label: 'Account' }];
    if (this.auth.isAdmin) {
      tabs.push({ id: 'users' as any, icon: '👥', label: 'Users' });
      tabs.push({ id: 'abis' as any, icon: '🎛️', label: 'ABIS NL-X16' });
    }
    return tabs;
  }

  constructor(private api: ApiService, public auth: AuthService, private toast: ToastService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const u = this.auth.currentUser;
    this.profile = { username: u?.username || '', email: u?.email || '' };
    if (this.auth.isAdmin) {
      this.loadUsers();
      this.loadAbis();
    }
  }

  // --- Account ---
  saveProfile() {
    if (!this.profile.username.trim() || !this.profile.email.trim()) {
      this.toast.error('Username and email are required');
      return;
    }
    this.savingProfile = true;
    this.api.updateProfile(this.profile).subscribe({
      next: (res) => {
        this.auth.applySession(res);
        this.savingProfile = false;
        this.toast.success('Profile updated');
        this.cdr.detectChanges();
      },
      error: () => { this.savingProfile = false; this.cdr.detectChanges(); }
    });
  }

  changePassword() {
    if (this.pw.next.length < 6) { this.toast.error('New password must be at least 6 characters'); return; }
    if (this.pw.next !== this.pw.confirm) { this.toast.error('Passwords do not match'); return; }
    this.savingPw = true;
    this.api.changePassword(this.pw.current, this.pw.next).subscribe({
      next: () => {
        this.pw = { current: '', next: '', confirm: '' };
        this.savingPw = false;
        this.toast.success('Password updated');
        this.cdr.detectChanges();
      },
      error: () => { this.savingPw = false; this.cdr.detectChanges(); }
    });
  }

  // --- Users ---
  loadUsers() {
    this.api.getUsers().subscribe({ next: (data) => { this.users = data; this.cdr.detectChanges(); } });
  }

  openUserForm(u?: any) {
    this.editUserId = u?._id || '';
    this.userForm = u
      ? { username: u.username, email: u.email, role: u.role }
      : { username: '', email: '', password: '', role: 'user' };
    this.showUserForm = true;
  }

  saveUser() {
    this.savingUser = true;
    const done = () => { this.savingUser = false; this.showUserForm = false; this.loadUsers(); };
    const fail = () => { this.savingUser = false; this.cdr.detectChanges(); };
    if (this.editUserId) {
      this.api.updateUser(this.editUserId, this.userForm).subscribe({
        next: () => { done(); this.toast.success('User updated'); }, error: fail
      });
    } else {
      this.api.createUser(this.userForm).subscribe({
        next: () => { done(); this.toast.success('User created'); }, error: fail
      });
    }
  }

  toggleActive(u: any) {
    const activating = u.active === false;
    if (!activating && !confirm(`Deactivate ${u.username}? They will not be able to log in.`)) return;
    this.api.updateUser(u._id, { active: activating }).subscribe({
      next: () => { this.toast.success(activating ? 'User activated' : 'User deactivated'); this.loadUsers(); }
    });
  }

  deleteUser(u: any) {
    if (!confirm(`Permanently delete ${u.username}? This cannot be undone.`)) return;
    this.api.deleteUser(u._id).subscribe({
      next: () => { this.toast.success('User deleted'); this.loadUsers(); }
    });
  }

  openResetPw(u: any) { this.resetPwUser = u; this.resetPwValue = ''; }

  confirmResetPw() {
    if (this.resetPwValue.length < 6) { this.toast.error('Password must be at least 6 characters'); return; }
    this.api.resetUserPassword(this.resetPwUser._id, this.resetPwValue).subscribe({
      next: () => { this.toast.success(`Password reset for ${this.resetPwUser.username}`); this.resetPwUser = null; this.cdr.detectChanges(); }
    });
  }

  // --- ABIS NL-X16 ---
  loadAbis() {
    this.api.getSetting('abis').subscribe({
      next: (value) => {
        if (value && typeof value === 'object') {
          this.abis = { ...this.abis, ...value, map: Array.isArray(value.map) ? value.map : [] };
          this.abisLoadedAt = new Date();
        }
        this.cdr.detectChanges();
      }
    });
  }

  addMapRow() {
    this.abis.map.push({ offset: 0, field: 'temperature', scale: 1, signed: false });
  }

  saveAbis() {
    const a = this.abis;
    if (!(a.slaveId >= 1 && a.slaveId <= 247)) { this.toast.error('Slave ID must be 1–247'); return; }
    if (!(a.pollSeconds >= 5)) { this.toast.error('Poll interval must be at least 5 seconds'); return; }
    if (!(a.blockCount >= 1 && a.blockCount <= 125)) { this.toast.error('Block count must be 1–125'); return; }
    for (const m of a.map) {
      if (m.offset < 0 || m.offset >= a.blockCount) {
        this.toast.error(`Register offset ${m.offset} is outside the polled block (0–${a.blockCount - 1})`);
        return;
      }
    }
    this.savingAbis = true;
    // Coerce numerics: ngModel on number inputs can still yield strings
    const value = {
      slaveId: +a.slaveId, functionCode: +a.functionCode, blockStart: +a.blockStart,
      blockCount: +a.blockCount, pollSeconds: +a.pollSeconds, discovery: !!a.discovery,
      map: a.map.map((m: any) => ({ offset: +m.offset, field: m.field, scale: +m.scale || 1, signed: !!m.signed }))
    };
    this.api.updateSetting('abis', value).subscribe({
      next: () => {
        this.savingAbis = false;
        this.abisLoadedAt = new Date();
        this.toast.success('ABIS configuration saved — bridge applies it within 5 minutes');
        this.cdr.detectChanges();
      },
      error: () => { this.savingAbis = false; this.cdr.detectChanges(); }
    });
  }
}

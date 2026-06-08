import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Hls from 'hls.js';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-cameras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 class="text-2xl ctrl-title">Live Cameras</h1>
          <p class="text-sm text-gray-500">Watch live CCTV feeds from your poultry houses</p>
        </div>
        <button (click)="openForm()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
          + Add Camera
        </button>
      </div>

      <!-- Add / Edit Modal -->
      <div *ngIf="showForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-lg font-bold mb-4">{{ editId ? 'Edit' : 'Add' }} Camera</h2>
          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-600">Name *</label>
              <input [(ngModel)]="form.name" placeholder="House 1 - Brooder" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">House Number *</label>
              <input [(ngModel)]="form.houseNumber" placeholder="H1" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Stream Type *</label>
              <select [(ngModel)]="form.streamType" class="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="hls">HLS (.m3u8) — recommended</option>
                <option value="mjpeg">MJPEG (ESP32-CAM / direct snapshot stream)</option>
                <option value="iframe">Embed page (iframe URL)</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-gray-600">Stream URL *</label>
              <input [(ngModel)]="form.streamUrl" placeholder="https://your-tunnel.example.com/stream.m3u8" class="w-full border rounded-lg px-3 py-2 text-sm">
              <p class="text-[11px] text-gray-400 mt-1">Paste the public HTTPS stream URL from your local relay (e.g. go2rtc) — not the camera's rtsp:// address.</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">Location</label>
              <input [(ngModel)]="form.location" placeholder="Brooder corner" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showForm = false" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button (click)="saveCamera()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
              {{ editId ? 'Update' : 'Add' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Cameras Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" *ngIf="cameras.length > 0">
        <div *ngFor="let cam of cameras" class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all">
          <!-- Video area -->
          <div class="relative bg-black aspect-video flex items-center justify-center">
            <!-- HLS / native video -->
            <video *ngIf="cam.streamType === 'hls'" [id]="'video-' + cam._id" class="w-full h-full object-contain"
              autoplay muted playsinline controls></video>
            <!-- MJPEG -->
            <img *ngIf="cam.streamType === 'mjpeg'" [src]="cam.streamUrl" class="w-full h-full object-contain" alt="{{ cam.name }}">
            <!-- Iframe embed -->
            <iframe *ngIf="cam.streamType === 'iframe'" [src]="safeUrl(cam.streamUrl)" class="w-full h-full" frameborder="0" allowfullscreen></iframe>

            <span class="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> LIVE
            </span>
          </div>

          <div class="p-4">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="font-bold text-gray-800 leading-tight">{{ cam.name }}</h3>
                <p class="text-[11px] text-gray-400">{{ cam.location || 'No location set' }}</p>
              </div>
              <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">🏠 House {{ cam.houseNumber }}</span>
            </div>
            <div class="flex gap-3 mt-2 pt-3 border-t border-gray-100 text-xs">
              <button (click)="editCamera(cam)" class="text-blue-600 hover:underline font-medium">Edit</button>
              <button (click)="deleteCamera(cam._id)" class="text-red-600 hover:underline font-medium">Remove</button>
              <a [href]="cam.streamUrl" target="_blank" class="text-gray-500 hover:underline font-medium ml-auto">Open stream ↗</a>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="cameras.length === 0" class="bg-white rounded-2xl shadow-sm p-10 text-center">
        <div class="text-4xl mb-2">📹</div>
        <p class="text-gray-600 font-medium mb-1">No cameras added</p>
        <p class="text-gray-400 text-sm mb-4">Add a camera's public stream URL to watch live from anywhere</p>
        <button (click)="openForm()" class="bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-medium">+ Add Camera</button>
      </div>
    </div>
  `
})
export class CamerasComponent implements OnInit, OnDestroy {
  cameras: any[] = [];
  showForm = false;
  editId = '';
  form: any = {};
  private players: { [id: string]: Hls } = {};

  constructor(private api: ApiService, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit() { this.loadCameras(); }

  ngOnDestroy() { this.destroyPlayers(); }

  loadCameras() {
    this.api.getCameras().subscribe({
      next: (data) => {
        this.destroyPlayers();
        this.cameras = data;
        this.cdr.detectChanges();
        // Attach HLS players after the DOM has rendered the <video> elements.
        setTimeout(() => this.attachPlayers(), 0);
      }
    });
  }

  attachPlayers() {
    for (const cam of this.cameras) {
      if (cam.streamType !== 'hls') continue;
      const video = document.getElementById('video-' + cam._id) as HTMLVideoElement | null;
      if (!video) continue;

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(cam.streamUrl);
        hls.attachMedia(video);
        this.players[cam._id] = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari / iOS play HLS natively.
        video.src = cam.streamUrl;
      }
    }
  }

  destroyPlayers() {
    Object.values(this.players).forEach(hls => hls.destroy());
    this.players = {};
  }

  safeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openForm() { this.resetForm(); this.showForm = true; }

  resetForm() {
    this.editId = '';
    this.form = { name: '', houseNumber: '', streamUrl: '', streamType: 'hls', location: '' };
  }

  saveCamera() {
    if (!this.form.name || !this.form.houseNumber || !this.form.streamUrl) {
      alert('Name, house number and stream URL are required.');
      return;
    }
    const req = this.editId
      ? this.api.updateCamera(this.editId, this.form)
      : this.api.createCamera(this.form);
    req.subscribe({ next: () => { this.showForm = false; this.loadCameras(); } });
  }

  editCamera(cam: any) {
    this.editId = cam._id;
    this.form = { name: cam.name, houseNumber: cam.houseNumber, streamUrl: cam.streamUrl, streamType: cam.streamType, location: cam.location || '' };
    this.showForm = true;
  }

  deleteCamera(id: string) {
    if (confirm('Remove this camera?')) {
      this.api.deleteCamera(id).subscribe({ next: () => this.loadCameras() });
    }
  }
}

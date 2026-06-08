import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClimatePanelComponent } from './climate-panel.component';

@Component({
  selector: 'app-climate-live',
  standalone: true,
  imports: [CommonModule, ClimatePanelComponent],
  template: `
    <div class="space-y-4">
      <div>
        <h1 class="text-2xl ctrl-title">Climate Live</h1>
        <p class="text-sm text-gray-500">Real-time house climate, styled like your NL-X16 controller</p>
      </div>
      <app-climate-panel></app-climate-panel>
    </div>
  `
})
export class ClimateLiveComponent {}

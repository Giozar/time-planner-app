import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerService } from '../../../core/services/planner.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-daily-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './daily-dashboard.component.html',
  styleUrl: './daily-dashboard.component.css'
})
export class DailyDashboardComponent {
  private plannerService = inject(PlannerService);
  
  // Signals computadas desde el servicio
  tasks = this.plannerService.todaysTasks;
  metrics = this.plannerService.todaysMetrics;

  // Fecha actual para mostrar en el título
  today = new Date();

  toggleTask(taskId: string) {
    this.plannerService.toggleTask(taskId);
  }
}
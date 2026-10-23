import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerService } from '../../../core/services/planner.service';
import { RouterLink } from '@angular/router';
import { TaskSourceType } from '../../../core/models/activity.model';

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
  tasks = this.plannerService.agendaTasks;
  metrics = this.plannerService.agendaMetrics;

  // Fecha actual para mostrar en el título
  today = new Date();

  toggleTask(taskId: string, sourceType: TaskSourceType) {
    this.plannerService.toggleTaskExecution(taskId, sourceType);
  }
}
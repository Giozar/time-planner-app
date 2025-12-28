import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerService } from '../../../core/services/planner.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-goals-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './goals-list.component.html',
  styleUrl: './goals-list.component.css'
})
export class GoalsListComponent {
  private plannerService = inject(PlannerService);
  
  // Señal de lectura del servicio
  goals = this.plannerService.goals;
}
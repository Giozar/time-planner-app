import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';

@Component({
  selector: 'app-daily-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-summary.component.html',
  styleUrl: './daily-summary.component.css'
})
export class DailySummaryComponent {
  private plannerService = inject(PlannerService);
  private router = inject(Router);

  // Usamos las mismas métricas que ya calcula el servicio
  metrics = this.plannerService.todaysMetrics;
  today = new Date();

  finishDay(notes: string) {
    // 1. Guardar en el servicio
    this.plannerService.closeDay(notes);
    
    // 2. Feedback simple (podríamos usar un toast/alerta mejor después)
    alert('¡Día registrado exitosamente!');

    // 3. Redirigir (por ahora a metas, o podrías limpiar el dashboard)
    this.router.navigate(['/goals']);
  }
}
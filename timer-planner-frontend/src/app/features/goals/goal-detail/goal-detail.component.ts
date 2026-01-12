import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PlannerService } from '../../../core/services/planner.service';
import { MatIconModule } from '@angular/material/icon';
import { NativeDialogService } from '../../../core/services/native-dialog.service';
import { Objective } from '../../../core/models/objective.model';

@Component({
  selector: 'app-goal-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './goal-detail.component.html',
  styleUrl: './goal-detail.component.css',
})
export class GoalDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private plannerService = inject(PlannerService);
  private dialogService = inject(NativeDialogService);

  goalId = this.route.snapshot.paramMap.get('id');

  goal = computed(() => this.plannerService.goals().find((g) => g.id === this.goalId));

  // En V2, la Meta (Goal) tiene Objetivos
  objectives = computed(() =>
    this.plannerService.objectives().filter((o) => o.goalId === this.goalId)
  );

  ngOnInit() {
    if (!this.goal()) {
      this.router.navigate(['/goals']);
    }
  }

  async onDeleteObjective(objective: Objective) {
    const confirmed = await this.dialogService.confirm(
      '¿Eliminar Objetivo?',
      `¿Estás seguro de que quieres eliminar el objetivo "${objective.title}"? \n\nADVERTENCIA: Todas las tareas asociadas serán eliminadas.`,
      { confirmText: 'Eliminar', isDanger: true }
    );

    if (confirmed) {
      this.plannerService.deleteObjective(objective.id);
    }
  }
}

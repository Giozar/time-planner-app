import { Component, input } from '@angular/core';
import { ActivityComplexity, ActivityCriticality, ActivityPriority } from '../../../core/models/activity.model';
import {
  ACTIVITY_COMPLEXITY_LABELS, ACTIVITY_CRITICALITY_LABELS, ACTIVITY_PRIORITY_LABELS,
} from '../../../core/i18n/labels';
import { LabelPipe } from '../../pipes/label.pipe';

/** Etiquetas de prioridad, criticidad y complejidad de una tarea. */
@Component({
  selector: 'app-task-tags',
  standalone: true,
  imports: [LabelPipe],
  templateUrl: './task-tags.component.html',
  styleUrl: './task-tags.component.css'
})
export class TaskTagsComponent {
  priority = input.required<ActivityPriority>();
  criticality = input.required<ActivityCriticality>();
  complexity = input.required<ActivityComplexity>();

  readonly priorityLabels = ACTIVITY_PRIORITY_LABELS;
  readonly criticalityLabels = ACTIVITY_CRITICALITY_LABELS;
  readonly complexityLabels = ACTIVITY_COMPLEXITY_LABELS;
}

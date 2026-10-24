import { LabelPipe } from './label.pipe';
import { GOAL_STATUS_LABELS, ACTIVITY_PRIORITY_LABELS, OBJECTIVE_STATUS_LABELS } from '../../core/i18n/labels';
import { GoalStatus } from '../../core/models/goal.model';
import { ActivityPriority } from '../../core/models/activity.model';
import { ObjectiveStatus } from '../../core/models/objective.model';

describe('LabelPipe', () => {
  const pipe = new LabelPipe();

  it('traduce el valor con el diccionario indicado', () => {
    expect(pipe.transform(GoalStatus.IDEA, GOAL_STATUS_LABELS)).toBe('Idea');
    expect(pipe.transform(ActivityPriority.HIGH, ACTIVITY_PRIORITY_LABELS)).toBe('Alta');
  });

  it('un mismo valor en enums distintos usa su diccionario y su género (OPEN)', () => {
    expect(pipe.transform(GoalStatus.OPEN, GOAL_STATUS_LABELS)).toBe('Abierta');
    expect(pipe.transform(ObjectiveStatus.OPEN, OBJECTIVE_STATUS_LABELS)).toBe('Abierto');
  });

  it('devuelve cadena vacía con null o undefined', () => {
    expect(pipe.transform(null, GOAL_STATUS_LABELS)).toBe('');
    expect(pipe.transform(undefined, GOAL_STATUS_LABELS)).toBe('');
  });
});

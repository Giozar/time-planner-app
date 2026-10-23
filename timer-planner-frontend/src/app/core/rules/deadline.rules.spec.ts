import { ActivityType } from '../models/activity.model';
import { makeActivity, makeObjective, makePlan, makeSessions, makeStep } from '../../testing/builders';
import {
  DeadlineConflictKind, effectiveActivityDeadline, effectiveDeadline, validateDeadlines,
} from './deadline.rules';

const objective = makeObjective({ deadline: '2026-12-31' });

describe('deadline.rules', () => {
  describe('deadline efectivo (RN-14, RN-48)', () => {
    it('usa el propio y, si falta, el del padre', () => {
      expect(effectiveDeadline({ deadline: '2026-11-01' }, '2026-12-31')).toBe('2026-11-01');
      expect(effectiveDeadline({}, '2026-12-31')).toBe('2026-12-31');
      expect(effectiveActivityDeadline(makeActivity(), objective)).toBe('2026-12-31');
      expect(effectiveActivityDeadline(makeActivity({ deadline: '2026-11-15' }), objective)).toBe('2026-11-15');
    });
  });

  describe('validateDeadlines (RN-48, RN-49, RN-65)', () => {
    it('sin conflictos devuelve lista vacía', () => {
      const activity = makeActivity({ executionPlan: makePlan() });
      expect(validateDeadlines(objective, [activity], [], makeSessions('p1', ['2026-12-31']))).toEqual([]);
    });

    it('rechaza una tarea con deadline propio mayor que el del objetivo', () => {
      const activity = makeActivity({ deadline: '2027-01-01' });
      const [conflict] = validateDeadlines(objective, [activity], [], []);
      expect(conflict.kind).toBe(DeadlineConflictKind.ACTIVITY_DEADLINE);
      expect(conflict.dates).toEqual(['2027-01-01']);
    });

    it('rechaza sesiones de la tarea posteriores a su deadline efectivo heredado', () => {
      const activity = makeActivity({ executionPlan: makePlan() });
      const [conflict] = validateDeadlines(objective, [activity], [], makeSessions('p1', ['2026-12-30', '2027-01-02']));
      expect(conflict.kind).toBe(DeadlineConflictKind.ACTIVITY_DATES);
      expect(conflict.dates).toEqual(['2027-01-02']);
    });

    it('rechaza un paso con deadline propio mayor que el efectivo de su tarea', () => {
      const activity = makeActivity({ type: ActivityType.COMPOSITE, deadline: '2026-11-30' });
      const step = makeStep({ deadline: '2026-12-15' });
      const kinds = validateDeadlines(objective, [activity], [step], makeSessions('p-s1', ['2026-11-01'])).map(c => c.kind);
      expect(kinds).toEqual([DeadlineConflictKind.STEP_DEADLINE]);
    });

    it('rechaza sesiones de un paso posteriores a su deadline efectivo', () => {
      const activity = makeActivity({ type: ActivityType.COMPOSITE, deadline: '2026-11-30' });
      const step = makeStep();
      const [conflict] = validateDeadlines(objective, [activity], [step], makeSessions('p-s1', ['2026-11-29', '2026-12-01']));
      expect(conflict.kind).toBe(DeadlineConflictKind.STEP_DATES);
      expect(conflict.dates).toEqual(['2026-12-01']);
    });

    it('un deadline heredado no entra en conflicto y sigue al padre (RN-49)', () => {
      const activity = makeActivity({ type: ActivityType.COMPOSITE });
      const step = makeStep();
      const sessions = makeSessions('p-s1', ['2026-12-31']);
      expect(validateDeadlines(objective, [activity], [step], sessions)).toEqual([]);
      // Al adelantar el objetivo, el paso queda fuera del nuevo límite y se informa.
      const earlier = makeObjective({ deadline: '2026-12-15' });
      expect(validateDeadlines(earlier, [activity], [step], sessions).map(c => c.kind)).toEqual([DeadlineConflictKind.STEP_DATES]);
    });

    it('ignora los pasos de otras tareas', () => {
      const activity = makeActivity({ id: 'a1', type: ActivityType.COMPOSITE });
      const foreign = makeStep({ activityId: 'otra' });
      expect(validateDeadlines(objective, [activity], [foreign], makeSessions('p-s1', ['2999-01-01']))).toEqual([]);
    });
  });
});

import { ActivityRecurrence, ActivityType, ExecutionPlanType, WeekDay } from '../models/activity.model';
import { makePlan } from '../../testing/builders';
import { deriveRecurrence } from './recurrence.rules';

describe('deriveRecurrence (RN-47)', () => {
  it('un plan con patrón es WEEKLY_PATTERN', () => {
    const plan = { ...makePlan(['2026-10-19']), type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.MONDAY] };
    expect(deriveRecurrence(ActivityType.SIMPLE, plan)).toBe(ActivityRecurrence.WEEKLY_PATTERN);
  });

  it('una sola fecha específica es SINGLE', () => {
    expect(deriveRecurrence(ActivityType.SIMPLE, makePlan(['2026-10-25']))).toBe(ActivityRecurrence.SINGLE);
  });

  it('dos o más fechas específicas son SPECIFIC_DATES', () => {
    expect(deriveRecurrence(ActivityType.SIMPLE, makePlan(['2026-10-25', '2026-10-26'])))
      .toBe(ActivityRecurrence.SPECIFIC_DATES);
  });

  it('una compuesta no tiene recurrencia', () => {
    expect(deriveRecurrence(ActivityType.COMPOSITE, makePlan(['2026-10-25']))).toBeNull();
  });

  it('sin plan o sin fechas es null', () => {
    expect(deriveRecurrence(ActivityType.SIMPLE, null)).toBeNull();
    expect(deriveRecurrence(ActivityType.SIMPLE, makePlan([]))).toBeNull();
  });
});

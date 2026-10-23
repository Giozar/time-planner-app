import { ActivityRecurrence, ActivityType, ExecutionPlanType, WeekDay } from '../models/activity.model';
import { makePlan } from '../../testing/builders';
import { deriveRecurrence } from './recurrence.rules';

describe('deriveRecurrence (RN-47)', () => {
  it('un plan con patrón es WEEKLY_PATTERN', () => {
    const plan = { ...makePlan(), type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.MONDAY] };
    expect(deriveRecurrence(ActivityType.SIMPLE, plan, 4)).toBe(ActivityRecurrence.WEEKLY_PATTERN);
  });

  it('una sola fecha específica es SINGLE', () => {
    expect(deriveRecurrence(ActivityType.SIMPLE, makePlan(), 1)).toBe(ActivityRecurrence.SINGLE);
  });

  it('dos o más fechas específicas son SPECIFIC_DATES', () => {
    expect(deriveRecurrence(ActivityType.SIMPLE, makePlan(), 2))
      .toBe(ActivityRecurrence.SPECIFIC_DATES);
  });

  it('una compuesta no tiene recurrencia', () => {
    expect(deriveRecurrence(ActivityType.COMPOSITE, makePlan(), 3)).toBeNull();
  });

  it('sin plan o sin fechas es null', () => {
    expect(deriveRecurrence(ActivityType.SIMPLE, null, 0)).toBeNull();
    expect(deriveRecurrence(ActivityType.SIMPLE, makePlan(), 0)).toBeNull();
  });
});

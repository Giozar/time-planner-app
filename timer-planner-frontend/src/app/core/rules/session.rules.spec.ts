import { ExecutionPlanType, WeekDay } from '../models/activity.model';
import { makePlan } from '../../testing/builders';
import { regenerateFutureSessions } from './session.rules';

const TODAY = '2026-10-22'; // jueves

describe('regenerateFutureSessions (RN-21, RN-22, RN-51)', () => {
  it('patrón: genera desde hoy hasta el deadline, ambos incluidos (RN-21)', () => {
    const plan = regenerateFutureSessions(
      null,
      { type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.THURSDAY], durationPerExecutionMin: 30 },
      TODAY, '2026-11-05'
    );
    expect(plan.dates).toEqual(['2026-10-22', '2026-10-29', '2026-11-05']);
    expect(plan.patternDays).toEqual([WeekDay.THURSDAY]);
    expect(plan.completedDates).toEqual([]);
  });

  it('fechas específicas: las ordena y descarta las pasadas (RN-19, RN-22)', () => {
    const plan = regenerateFutureSessions(
      null,
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-11-02', '2026-10-30', '2026-10-01'], durationPerExecutionMin: 45 },
      TODAY, '2026-12-31'
    );
    expect(plan.dates).toEqual(['2026-10-30', '2026-11-02']);
    expect(plan.patternDays).toBeUndefined();
    expect(plan.durationPerExecutionMin).toBe(45);
  });

  it('al editar conserva las sesiones pasadas, completadas o no (RN-51)', () => {
    const previous = makePlan(['2026-10-10', '2026-10-12', '2026-10-23'], ['2026-10-10']);
    const plan = regenerateFutureSessions(
      previous,
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-24'], durationPerExecutionMin: 30 },
      TODAY, '2026-12-31'
    );
    expect(plan.dates).toEqual(['2026-10-10', '2026-10-12', '2026-10-24']);
    expect(plan.completedDates).toEqual(['2026-10-10']);
  });

  it('descarta las ejecuciones completadas de fechas que ya no son del plan', () => {
    const previous = makePlan(['2026-10-22', '2026-10-23'], ['2026-10-22']);
    const plan = regenerateFutureSessions(
      previous,
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-25'], durationPerExecutionMin: 30 },
      TODAY, '2026-12-31'
    );
    expect(plan.dates).toEqual(['2026-10-25']);
    expect(plan.completedDates).toEqual([]);
  });

  it('conserva la ejecución de hoy si hoy sigue en el plan', () => {
    const previous = makePlan(['2026-10-22'], ['2026-10-22']);
    const plan = regenerateFutureSessions(
      previous,
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-22', '2026-10-23'], durationPerExecutionMin: 30 },
      TODAY, '2026-12-31'
    );
    expect(plan.completedDates).toEqual(['2026-10-22']);
  });

  it('un patrón que no produce fechas deja el plan sin sesiones futuras (RN-20)', () => {
    const plan = regenerateFutureSessions(
      null,
      { type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.MONDAY], durationPerExecutionMin: 30 },
      TODAY, '2026-10-23'
    );
    expect(plan.dates).toEqual([]);
  });
});

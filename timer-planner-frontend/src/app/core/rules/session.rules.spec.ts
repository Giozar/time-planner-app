import { ExecutionPlanType, WeekDay } from '../models/activity.model';
import { SessionStatus } from '../models/session.model';
import { makeSessions } from '../../testing/builders';
import { plannedMinutesOf, regenerateFutureSessions } from './session.rules';

const TODAY = '2026-10-22'; // jueves
const dates = (sessions: { scheduledDate: string }[]) => sessions.map(s => s.scheduledDate);

describe('regenerateFutureSessions (RN-21, RN-22, RN-51)', () => {
  it('patrón: genera desde hoy hasta el deadline, ambos incluidos (RN-21)', () => {
    const sessions = regenerateFutureSessions(
      [],
      { type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.THURSDAY], durationPerExecutionMin: 30 },
      TODAY, '2026-11-05', 'p'
    );
    expect(dates(sessions)).toEqual(['2026-10-22', '2026-10-29', '2026-11-05']);
    expect(sessions.every(s => s.planId === 'p' && s.status === SessionStatus.PLANNED && s.plannedMinutes === 30)).toBe(true);
  });

  it('fechas específicas: las ordena y descarta las pasadas (RN-19, RN-22)', () => {
    const sessions = regenerateFutureSessions(
      [],
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-11-02', '2026-10-30', '2026-10-01'], durationPerExecutionMin: 45 },
      TODAY, '2026-12-31', 'p'
    );
    expect(dates(sessions)).toEqual(['2026-10-30', '2026-11-02']);
    expect(sessions[0].plannedMinutes).toBe(45);
  });

  it('al editar conserva las sesiones pasadas, realizadas o no (RN-51)', () => {
    const previous = makeSessions('p', ['2026-10-10', '2026-10-12', '2026-10-23'], ['2026-10-10']);
    const sessions = regenerateFutureSessions(
      previous,
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-24'], durationPerExecutionMin: 30 },
      TODAY, '2026-12-31', 'p'
    );
    expect(dates(sessions)).toEqual(['2026-10-10', '2026-10-12', '2026-10-24']);
    expect(sessions[0].status).toBe(SessionStatus.DONE);
    expect(sessions[1].status).toBe(SessionStatus.PLANNED);
  });

  it('reemplaza la sesión PLANNED de hoy (RN-51)', () => {
    const previous = makeSessions('p', ['2026-10-22'], [], 30);
    const sessions = regenerateFutureSessions(
      previous,
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-22'], durationPerExecutionMin: 90 },
      TODAY, '2026-12-31', 'p'
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0].plannedMinutes).toBe(90);
    expect(sessions[0].id).not.toBe(previous[0].id);
  });

  it('conserva la sesión DONE de hoy sin duplicarla', () => {
    const previous = makeSessions('p', ['2026-10-22'], ['2026-10-22']);
    const sessions = regenerateFutureSessions(
      previous,
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-22', '2026-10-23'], durationPerExecutionMin: 30 },
      TODAY, '2026-12-31', 'p'
    );
    expect(dates(sessions)).toEqual(['2026-10-22', '2026-10-23']);
    expect(sessions[0].id).toBe(previous[0].id);
    expect(sessions[0].status).toBe(SessionStatus.DONE);
  });

  it('descarta las PLANNED futuras que ya no son del plan y no toca otros planes', () => {
    const previous = [...makeSessions('p', ['2026-10-23']), ...makeSessions('otro', ['2026-10-23'])];
    const sessions = regenerateFutureSessions(
      previous,
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-25'], durationPerExecutionMin: 30 },
      TODAY, '2026-12-31', 'p'
    );
    expect(dates(sessions)).toEqual(['2026-10-25']);
    expect(sessions[0].planId).toBe('p');
  });

  it('un patrón que no produce fechas deja el plan sin sesiones futuras (RN-20)', () => {
    const sessions = regenerateFutureSessions(
      [],
      { type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.MONDAY], durationPerExecutionMin: 30 },
      TODAY, '2026-10-23', 'p'
    );
    expect(sessions).toEqual([]);
  });
});

describe('plannedMinutesOf (RN-24)', () => {
  it('suma los minutos previstos de las sesiones', () => {
    expect(plannedMinutesOf(makeSessions('p', ['a', 'b'], [], 45))).toBe(90);
    expect(plannedMinutesOf([])).toBe(0);
  });
});

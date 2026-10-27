import { ExecutionPlanType, WeekDay } from '../models/activity.model';
import { SessionStatus } from '../models/session.model';
import { makeSessions } from '../../testing/builders';
import {
  actualMinutesOf, applySameTime, canPlaceSession, isValidPlannedMinutes, manualSession, moveSessionTo, plannedMinutesOf,
  regenerateFutureSessions, sessionDateRange,
} from './session.rules';

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

  it('una fecha que sigue en el plan conserva su sesión y su tiempo; las nuevas usan el del plan (RN-51)', () => {
    const previous = makeSessions('p', ['2026-10-22'], [], 30);
    const sessions = regenerateFutureSessions(
      previous,
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-22', '2026-10-23'], durationPerExecutionMin: 90 },
      TODAY, '2026-12-31', 'p'
    );
    expect(sessions.map(s => [s.scheduledDate, s.plannedMinutes])).toEqual([['2026-10-22', 30], ['2026-10-23', 90]]);
    expect(sessions[0].id).toBe(previous[0].id);
  });

  it('conserva las sesiones agregadas a mano (RN-83)', () => {
    const added = manualSession('p', '2026-10-24', 20);
    const sessions = regenerateFutureSessions(
      [added],
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-25'], durationPerExecutionMin: 30 },
      TODAY, '2026-12-31', 'p'
    );
    expect(sessions.map(s => s.scheduledDate)).toEqual(['2026-10-24', '2026-10-25']);
    expect(sessions[0]).toMatchObject({ id: added.id, manual: true, plannedMinutes: 20 });
  });

  it('no vuelve a generar las fechas excluidas mientras se edita', () => {
    const sessions = regenerateFutureSessions(
      [],
      { type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.THURSDAY], durationPerExecutionMin: 30 },
      TODAY, '2026-11-05', 'p', new Set(['2026-10-29'])
    );
    expect(dates(sessions)).toEqual(['2026-10-22', '2026-11-05']);
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

describe('editar una sesión (RN-82)', () => {
  it('una no hecha va de hoy al deadline; una hecha, hasta hoy', () => {
    expect(sessionDateRange(false, TODAY, '2026-12-31')).toEqual({ min: TODAY, max: '2026-12-31' });
    expect(sessionDateRange(true, TODAY, '2026-12-31')).toEqual({ min: null, max: TODAY });
    expect(sessionDateRange(true, TODAY, '2026-10-20')).toEqual({ min: null, max: '2026-10-20' });
  });

  it('canPlaceSession aplica ese rango', () => {
    expect(canPlaceSession(false, '2026-10-21', TODAY, '2026-12-31')).toBe(false);
    expect(canPlaceSession(false, '2026-10-30', TODAY, '2026-12-31')).toBe(true);
    expect(canPlaceSession(false, '2027-01-01', TODAY, '2026-12-31')).toBe(false);
    expect(canPlaceSession(true, '2026-10-01', TODAY, '2026-12-31')).toBe(true);
    expect(canPlaceSession(true, '2026-10-23', TODAY, '2026-12-31')).toBe(false);
  });

  it('cambia solo la fecha y recuerda la original; si vuelve a ella deja de estar movida', () => {
    const [monday] = makeSessions('p', ['2026-10-26'], [], 60);
    const sunday = moveSessionTo(monday, '2026-10-25');
    expect(sunday).toMatchObject({ id: monday.id, scheduledDate: '2026-10-25', rescheduledFrom: '2026-10-26', plannedMinutes: 60 });
    expect(moveSessionTo(moveSessionTo(sunday, '2026-10-24'), '2026-10-26').rescheduledFrom).toBeUndefined();
  });

  it('una agregada a mano se mueve sin fecha generada (RN-83)', () => {
    const moved = moveSessionTo(manualSession('p', '2026-10-24', 20), '2026-10-25');
    expect(moved).toMatchObject({ scheduledDate: '2026-10-25', manual: true });
    expect(moved.rescheduledFrom).toBeUndefined();
  });

  it('editar el plan conserva la movida y no vuelve a generar su fecha original (RN-51)', () => {
    const moved = moveSessionTo(makeSessions('p', ['2026-10-26'])[0], '2026-10-25');
    const sessions = regenerateFutureSessions(
      [moved, ...makeSessions('p', ['2026-11-02'])],
      { type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.MONDAY], durationPerExecutionMin: 30 },
      TODAY, '2026-11-02', 'p'
    );
    expect(dates(sessions)).toEqual(['2026-10-25', '2026-11-02']);
    expect(sessions[0].id).toBe(moved.id);
  });
});

describe('plannedMinutesOf (RN-24)', () => {
  it('suma los minutos previstos de las sesiones', () => {
    expect(plannedMinutesOf(makeSessions('p', ['a', 'b'], [], 45))).toBe(90);
    expect(plannedMinutesOf([])).toBe(0);
  });
});

describe('tiempo de cada sesión (RN-15, CU-31)', () => {
  it('el tiempo previsto es un entero de al menos 5 minutos', () => {
    expect(isValidPlannedMinutes(5)).toBe(true);
    expect(isValidPlannedMinutes(4)).toBe(false);
    expect(isValidPlannedMinutes(7.5)).toBe(false);
  });

  it('«mismo tiempo» cambia las pendientes de hoy en adelante; no las pasadas ni las hechas', () => {
    const sessions = [
      ...makeSessions('p', ['2026-10-20', TODAY, '2026-10-29'], [], 30),
      ...makeSessions('p', ['2026-10-30'], ['2026-10-30'], 30),
    ];
    expect(applySameTime(sessions, 45, TODAY).map(s => s.plannedMinutes)).toEqual([30, 45, 45, 30]);
  });
});

describe('actualMinutesOf (RN-71)', () => {
  it('suma el tiempo realizado de las sesiones hechas', () => {
    expect(actualMinutesOf(makeSessions('p', ['a', 'b', 'c'], ['a', 'b'], 45))).toBe(90);
    expect(actualMinutesOf([])).toBe(0);
  });
});

describe('al editar el plan se conserva el tiempo realizado (RN-51)', () => {
  it('la sesión hecha mantiene sus minutos', () => {
    const [done] = makeSessions('p', ['2026-10-10'], ['2026-10-10'], 30);
    const sessions = regenerateFutureSessions(
      [{ ...done, actualMinutes: 50 }],
      { type: ExecutionPlanType.SPECIFIC_DATES, dates: ['2026-10-24'], durationPerExecutionMin: 30 },
      TODAY, '2026-12-31', 'p'
    );
    expect(sessions[0]).toMatchObject({ id: done.id, actualMinutes: 50 });
  });
});

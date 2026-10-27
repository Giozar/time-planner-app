import { ExecutionPlanType, WeekDay } from '../../core/models/activity.model';
import { makeSessions } from '../../testing/builders';
import { PlanSessionsEditor } from './plan-sessions-editor';

const TODAY = '2026-10-22'; // jueves
const thursdays = { type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.THURSDAY], durationPerExecutionMin: 30 };
const datesOf = (editor: PlanSessionsEditor) => editor.sessions().map(s => s.scheduledDate);

describe('PlanSessionsEditor (CU-31)', () => {
  it('genera las sesiones del plan y muestra las de hoy en adelante', () => {
    const editor = new PlanSessionsEditor('p', TODAY);
    editor.load(makeSessions('p', ['2026-10-15'], ['2026-10-15']));
    editor.regenerate(thursdays, '2026-11-05', true);

    expect(datesOf(editor)).toEqual(['2026-10-15', '2026-10-22', '2026-10-29', '2026-11-05']);
    expect(editor.upcoming().map(s => s.scheduledDate)).toEqual(['2026-10-22', '2026-10-29', '2026-11-05']);
  });

  it('una sesión borrada no vuelve al regenerar mientras se edita (RN-83)', () => {
    const editor = new PlanSessionsEditor('p', TODAY);
    editor.regenerate(thursdays, '2026-11-05', true);
    const thursday = editor.sessions().find(s => s.scheduledDate === '2026-10-29')!;

    expect(editor.remove(thursday.id)).toBe('2026-10-29');
    editor.regenerate(thursdays, '2026-11-05', true);
    expect(datesOf(editor)).toEqual(['2026-10-22', '2026-11-05']);

    editor.include('2026-10-29');
    editor.regenerate(thursdays, '2026-11-05', true);
    expect(datesOf(editor)).toContain('2026-10-29');
  });

  it('sin «mismo tiempo» cada sesión conserva su tiempo; con él, todas toman el del plan', () => {
    const editor = new PlanSessionsEditor('p', TODAY);
    editor.regenerate(thursdays, '2026-10-29', true);
    const [first] = editor.sessions();

    expect(editor.setMinutes(first.id, 3)).toBe(false);
    expect(editor.setMinutes(first.id, 50)).toBe(true);
    editor.regenerate({ ...thursdays, durationPerExecutionMin: 40 }, '2026-10-29', false);
    expect(editor.sessions().map(s => s.plannedMinutes)).toEqual([50, 30]);

    editor.applySameTime(40);
    expect(editor.sessions().map(s => s.plannedMinutes)).toEqual([40, 40]);
  });

  it('agrega sesiones sueltas que se conservan al regenerar y se borran sin excluir fechas', () => {
    const editor = new PlanSessionsEditor('p', TODAY);
    editor.add('2026-10-24', 20);
    editor.regenerate(thursdays, '2026-10-29', true);
    const added = editor.sessions().find(s => s.manual)!;

    expect(datesOf(editor)).toEqual(['2026-10-22', '2026-10-24', '2026-10-29']);
    expect(added.plannedMinutes).toBe(30); // «mismo tiempo» también la iguala
    expect(editor.remove(added.id)).toBeNull();
  });
});

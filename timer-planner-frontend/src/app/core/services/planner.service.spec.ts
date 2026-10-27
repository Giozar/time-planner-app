import { TestBed } from '@angular/core/testing';
import { DataProvider } from '../providers/data.provider';
import { PlannerService } from './planner.service';
import { InMemoryDataProvider } from '../../testing/in-memory-data.provider';
import { makeActivity, makeGoal, makeObjective, makePlan, makeSessions, makeStep } from '../../testing/builders';
import {
  Activity, ActivityStatus, ActivityType, ClosureType, ExecutionPlanType, SubActivity, SubActivityStatus, TaskSourceType,
  WeekDay,
} from '../models/activity.model';
import { ExecutionSession, SessionStatus } from '../models/session.model';
import { GoalStatus } from '../models/goal.model';
import { ObjectiveStatus } from '../models/objective.model';
import { DeletableType } from '../models/deletion-impact.model';
import { DeadlineConflictKind } from '../rules';

const TODAY = '2026-10-22';

describe('PlannerService', () => {
  let service: PlannerService;
  let provider: InMemoryDataProvider;

  /** Meta g1 → objetivo o1 (deadline 2999-01-01), listos para colgar tareas. */
  function seedHierarchy() {
    service.addGoal(makeGoal());
    service.addObjective(makeObjective());
  }

  /** Sesiones de cada plan creado con `simple` o `step`; los envuelve `addActivity` y `addStep`. */
  let sessionsOfPlan: Record<string, ExecutionSession[]>;

  const simple = (id: string, dates: string[], completed: string[] = [], extra: Partial<Activity> = {}) => {
    const plan = extra.executionPlan ?? makePlan(`p-${id}`);
    sessionsOfPlan[plan.id] = makeSessions(plan.id, dates, completed, plan.durationPerExecutionMin);
    return makeActivity({ id, title: id, executionPlan: plan, ...extra });
  };

  const step = (overrides: Partial<SubActivity>, dates = ['2026-11-01'], completed: string[] = [], minutes = 30) => {
    const id = overrides.id ?? 's1';
    const plan = makePlan(`p-${id}`, minutes);
    sessionsOfPlan[plan.id] = makeSessions(plan.id, dates, completed, minutes);
    return makeStep({ ...overrides, id, executionPlan: plan });
  };

  const addActivity = (activity: Activity) =>
    service.addActivity(activity, activity.executionPlan ? sessionsOfPlan[activity.executionPlan.id] : []);
  const addStep = (sub: SubActivity) => service.addSubActivity(sub, sessionsOfPlan[sub.executionPlan.id]);

  /** Marca o desmarca la sesión de ese plan en esa fecha (ids de `makeSessions`). */
  const mark = (planId: string, date: string, minutes?: number) => service.toggleSession(`${planId}-${date}`, minutes);

  beforeEach(() => {
    sessionsOfPlan = {};
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`));

    provider = new InMemoryDataProvider();
    TestBed.configureTestingModule({ providers: [{ provide: DataProvider, useValue: provider }] });
    service = TestBed.inject(PlannerService);
  });

  afterEach(() => vi.useRealTimers());

  const doneDates = (planId: string) =>
    service.sessionsOf(planId).filter(s => s.status === SessionStatus.DONE).map(s => s.scheduledDate);

  describe('avance y estados en cascada (RN-30 a RN-36)', () => {
    it('sube de tarea a objetivo y meta tras marcar la sesión de hoy', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      mark('p-a1', TODAY);

      expect(service.activities()[0].progress).toBe(100);
      expect(service.objectives()[0].progress).toBe(100);
      expect(service.goals()[0].progress).toBe(100);
    });

    it('desmarcar baja el avance de toda la cadena', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      mark('p-a1', TODAY);
      mark('p-a1', TODAY);

      expect(service.activities()[0]).toMatchObject({ progress: 0, status: ActivityStatus.OPEN });
      expect(service.goals()[0].progress).toBe(0);
    });

    it('el objetivo suma las sesiones y los minutos de sus tareas, no promedia (RN-33, RN-35)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      addActivity(simple('a2', ['2026-10-27', '2026-10-28', '2026-10-29']));
      mark('p-a1', TODAY);

      expect(service.objectives()[0].progress).toBe(25);
      expect(service.goals()[0].progress).toBe(25);
    });

    it('la compuesta suma las sesiones y los minutos de sus pasos y su tiempo total (RN-32, RN-24)', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY], [], 30));
      addStep(step({ id: 's2', activityId: 'k' }, ['2026-10-30', '2026-10-31'], [], 45));
      mark('p-s1', TODAY);

      const composite = service.activities()[0];
      // Constancia 1 de 3 y productividad 30 de 120 minutos: (33,3 + 25) ÷ 2
      expect(composite.progress).toBe(29);
      expect(composite.status).toBe(ActivityStatus.OPEN);
      expect(composite.totalTimeRequiredMin).toBe(30 + 2 * 45);
      expect(service.subActivities()[0].progress).toBe(100);
    });

    it('guarda en el proveedor después de cada mutación', () => {
      const before = provider.saveCount;
      service.addGoal(makeGoal());
      expect(provider.saveCount).toBeGreaterThan(before);
      expect(provider.goals).toHaveLength(1);
    });
  });

  describe('recurrencia calculada (RN-47)', () => {
    it('la deriva del plan al crear y limpia la de una compuesta', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-25']));
      addActivity(simple('a2', ['2026-10-25', '2026-10-26']));
      addActivity(simple('k', ['2026-10-25'], [], { type: ActivityType.COMPOSITE }));

      const [a1, a2, k] = service.activities();
      expect(a1.recurrence).toBe('SINGLE');
      expect(a2.recurrence).toBe('SPECIFIC_DATES');
      expect(k.recurrence).toBeNull();
      expect(k.executionPlan).toBeNull();
    });

    it('un patrón semanal da WEEKLY_PATTERN', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-26'], [], {
        executionPlan: { ...makePlan('pa1'), type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.MONDAY] },
      }));
      expect(service.activities()[0].recurrence).toBe('WEEKLY_PATTERN');
    });
  });

  describe('cierre a mano (RN-77, RN-79, RN-80)', () => {
    const MONDAYS = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'];

    it('cerrar «Correr» antes del último lunes la deja cerrada con su avance real y oculta ese lunes', () => {
      seedHierarchy();
      addActivity(simple('a1', MONDAYS, MONDAYS.slice(0, 3)));
      expect(service.closeActivity('a1')).toBe(true);

      expect(service.activities()[0]).toMatchObject({
        progress: 75, status: ActivityStatus.CLOSED, closure: { type: ClosureType.MANUAL, closedOn: TODAY },
      });
      service.setSelectedDate('2026-10-26');
      expect(service.agendaTasks()).toEqual([]);
      expect(service.agendaMetrics()).toMatchObject({ total: 0, plannedTimeMin: 0 });
    });

    it('cerrar hoy oculta también la sesión pendiente de hoy', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY, '2026-10-30']));
      service.closeActivity('a1');
      expect(service.agendaTasks()).toEqual([]);
    });

    it('la sesión oculta no se marca, pero sigue contando para la constancia (RN-70, RN-79)', () => {
      seedHierarchy();
      addActivity(simple('a1', MONDAYS, MONDAYS.slice(0, 3)));
      service.closeActivity('a1');
      vi.setSystemTime(new Date('2026-10-27T12:00:00'));

      mark('p-a1', '2026-10-26', 30);
      expect(doneDates('p-a1')).toEqual(MONDAYS.slice(0, 3));
      expect(service.consistency().get('a1')).toBe(75);
    });

    it('cerrar una compuesta la cierra con sus pasos abiertos, sin cambiar su avance', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY], [TODAY]));
      addStep(step({ id: 's2', activityId: 'k' }, ['2026-10-30']));
      service.closeActivity('k');

      expect(service.subActivities().map(s => s.status)).toEqual([SubActivityStatus.CLOSED, SubActivityStatus.CLOSED]);
      expect(service.activities()[0]).toMatchObject({ status: ActivityStatus.CLOSED, progress: 50 });
    });

    it('cerrar un objetivo lo cierra con sus tareas y pasos abiertos', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, ['2026-10-30']));

      expect(service.closeObjective('o1')).toBe(true);
      expect(service.objectives()[0]).toMatchObject({ status: ObjectiveStatus.CLOSED, progress: 0 });
      expect(service.activities().map(a => a.status)).toEqual([ActivityStatus.CLOSED, ActivityStatus.CLOSED]);
      expect(service.subActivities()[0].status).toBe(SubActivityStatus.CLOSED);
      expect(service.closeObjective('o1')).toBe(false);
    });

    it('cerrar un paso lo cierra con su avance real; su compuesta sigue abierta', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY, '2026-10-30'], [TODAY]));
      addStep(step({ id: 's2', activityId: 'k' }, ['2026-10-30']));
      service.closeStep('s1');

      expect(service.subActivities()[0]).toMatchObject({ progress: 50, status: SubActivityStatus.CLOSED });
      expect(service.activities()[0]).toMatchObject({ progress: 33, status: ActivityStatus.OPEN });
    });

    it('lo cerrado conserva su deadline y su plan, pero cambia de título (RN-80)', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30'], [], { deadline: '2026-11-30' }));
      service.closeActivity('a1');
      const closed = service.activities()[0];

      service.updateActivity(
        { ...closed, title: 'Nuevo', deadline: '2026-12-15', executionPlan: makePlan('otro') },
        makeSessions('otro', ['2026-12-01']),
      );
      expect(service.activities()[0]).toMatchObject({
        title: 'Nuevo', deadline: '2026-11-30', executionPlan: { id: 'p-a1' }, status: ActivityStatus.CLOSED,
      });
      expect(service.sessionsOf('p-a1')).toHaveLength(1);
      expect(service.sessionsOf('otro')).toHaveLength(0);
    });

    it('un objetivo cerrado conserva su deadline al editarlo', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      service.closeObjective('o1');
      service.updateObjective({ ...service.objectives()[0], title: 'Otro título', deadline: '3000-01-01' });

      expect(service.objectives()[0]).toMatchObject({ title: 'Otro título', deadline: '2999-01-01' });
    });
  });

  describe('cierre por fecha límite (RN-58, RN-77)', () => {
    beforeEach(() => {
      service.addGoal(makeGoal());
      service.addObjective(makeObjective({ deadline: '2026-10-21' }));
    });

    it('al día siguiente del deadline se cierran la tarea y el objetivo con su avance real', () => {
      addActivity(simple('a1', ['2026-10-20', '2026-10-21'], ['2026-10-20']));

      expect(service.activities()[0]).toMatchObject({
        progress: 50, status: ActivityStatus.CLOSED, closure: { type: ClosureType.DEADLINE, closedOn: TODAY },
      });
      expect(service.objectives()[0]).toMatchObject({
        status: ObjectiveStatus.CLOSED, closure: { type: ClosureType.DEADLINE, closedOn: TODAY },
      });
    });

    it('corregir un olvido recalcula el avance sin reabrir', () => {
      addActivity(simple('a1', ['2026-10-20', '2026-10-21'], ['2026-10-20']));
      mark('p-a1', '2026-10-21', 40);

      expect(service.activities()[0]).toMatchObject({ progress: 100, status: ActivityStatus.CLOSED });
      expect(service.objectives()[0].progress).toBe(100);
    });

    it('un paso vencido y su compuesta se cierran por fecha límite', () => {
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, ['2026-10-21']));

      expect(service.subActivities()[0].status).toBe(SubActivityStatus.CLOSED);
      expect(service.activities()[0]).toMatchObject({ status: ActivityStatus.CLOSED, closure: { type: ClosureType.DEADLINE } });
    });

    it('una tarea pausada también se cierra al vencer', () => {
      addActivity(simple('a1', ['2026-10-21'], [], { pauses: [{ from: '2026-10-01' }] }));
      expect(service.activities()[0].status).toBe(ActivityStatus.CLOSED);
    });
  });

  describe('mover una sesión (RN-82)', () => {
    const sessionOn = (planId: string, date: string) => service.sessionsOf(planId).find(s => s.scheduledDate === date)!;

    it('mueve solo ese lunes al domingo; los demás lunes y el avance no cambian', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-26', '2026-11-02']));
      expect(service.moveSession(sessionOn('p-a1', '2026-10-26').id, '2026-10-25')).toBe(true);

      expect(service.sessionsOf('p-a1').map(s => s.scheduledDate)).toEqual(['2026-10-25', '2026-11-02']);
      expect(sessionOn('p-a1', '2026-10-25').rescheduledFrom).toBe('2026-10-26');
      expect(service.activities()[0].progress).toBe(0);

      service.setSelectedDate('2026-10-25');
      expect(service.agendaTasks()).toMatchObject([{ id: 'a1', canMove: true }]);
      service.setSelectedDate('2026-10-26');
      expect(service.agendaTasks()).toEqual([]);
    });

    it('rechaza fechas pasadas o después del deadline, sesiones hechas y elementos cerrados', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-26', TODAY], [TODAY], { deadline: '2026-11-30' }));
      const monday = sessionOn('p-a1', '2026-10-26').id;

      expect(service.moveSession(monday, '2026-10-21')).toBe(false);
      expect(service.moveSession(monday, '2026-12-01')).toBe(false);
      expect(service.moveSession(sessionOn('p-a1', TODAY).id, '2026-10-25')).toBe(false);

      service.closeActivity('a1');
      expect(service.moveSession(monday, '2026-10-25')).toBe(false);
      expect(sessionOn('p-a1', '2026-10-26')).toBeDefined();
    });

    it('puede caer el mismo día que otra sesión del ítem y cada una se marca por separado', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY, '2026-10-26']));
      const monday = sessionOn('p-a1', '2026-10-26').id;
      expect(service.moveSession(monday, TODAY)).toBe(true);

      expect(service.agendaTasks().map(t => t.sessionId).sort()).toEqual([`p-a1-${TODAY}`, monday].sort());
      service.toggleSession(monday);
      expect(service.sessionsOf('p-a1').filter(s => s.status === SessionStatus.DONE).map(s => s.id)).toEqual([monday]);
      expect(service.activities()[0].progress).toBe(50);
    });

    it('los pasos también se mueven, dentro del deadline de su tarea', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE, deadline: '2026-10-31' }));
      addStep(step({ id: 's1', activityId: 'k' }, ['2026-10-26']));
      const session = sessionOn('p-s1', '2026-10-26').id;

      expect(service.moveSession(session, '2026-11-01')).toBe(false);
      expect(service.moveSession(session, '2026-10-31')).toBe(true);
    });
  });

  describe('cierre automático de días (RN-81)', () => {
    it('al abrir, cierra sin nota los días pasados con sesiones y sin cierre', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-19', '2026-10-20', TODAY], ['2026-10-20']));
      service.closeDay('mías', '2026-10-19');

      const reopened = TestBed.runInInjectionContext(() => new PlannerService());
      const byDate = new Map(reopened.records().map(r => [r.date, r]));

      expect([...byDate.keys()].sort()).toEqual(['2026-10-19', '2026-10-20']);
      expect(byDate.get('2026-10-19')!.notes).toBe('mías');
      expect(byDate.get('2026-10-20')).toMatchObject({ notes: '', completedSessions: 1, plannedSessions: 1, actualMinutes: 30 });
    });
  });

  describe('agenda de hoy (RN-25 a RN-29)', () => {
    it('incluye tareas simples y pasos con sesión hoy', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY, '2026-10-30']));
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY]));
      addActivity(simple('a2', ['2026-10-30']));

      const ids = service.agendaTasks().map(t => t.id).sort();
      expect(ids).toEqual(['a1', 's1']);
      expect(service.agendaTasks().find(t => t.id === 's1')?.parentId).toBe('k');
    });

    it('las métricas incluyen el tiempo previsto y el realizado', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan('pa1', 60) }));
      addActivity(simple('a2', [TODAY], [], { executionPlan: makePlan('pa2', 30) }));
      mark('pa2', TODAY);

      expect(service.agendaMetrics()).toMatchObject({
        total: 2, completed: 1, percentage: 50, plannedTimeMin: 90, executedTimeMin: 30,
      });
    });

    it('oculta metas pausadas y reanudar las devuelve (RN-57)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.pauseGoal('g1');
      expect(service.agendaTasks()).toHaveLength(0);
      expect(service.activities()[0].progress).toBe(0);

      service.resumeGoal('g1');
      expect(service.agendaTasks()).toHaveLength(1);
    });

    it('oculta tareas pausadas y reanudar las abre (RN-59)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY, '2026-10-30']));
      mark('p-a1', TODAY);
      service.pauseActivity('a1');
      expect(service.activities()[0].status).toBe(ActivityStatus.PAUSED);
      expect(service.agendaTasks()).toHaveLength(0);

      service.resumeActivity('a1');
      expect(service.activities()[0]).toMatchObject({ status: ActivityStatus.OPEN, progress: 50 });
    });

    it('una tarea cerrada no se pausa (RN-57)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY, '2026-10-30']));
      service.closeActivity('a1');
      service.pauseActivity('a1');
      expect(service.activities()[0]).toMatchObject({ status: ActivityStatus.CLOSED });
      expect(service.activities()[0].pauses ?? []).toEqual([]);
    });

    it('oculta las ideas (RN-55) y una idea con horizonte y tareas pasa a OPEN', () => {
      service.addGoal(makeGoal({ horizon: null, status: GoalStatus.IDEA }));
      service.addObjective(makeObjective());
      expect(service.goals()[0].status).toBe(GoalStatus.IDEA);

      addActivity(simple('a1', [TODAY]));
      expect(service.agendaTasks()).toHaveLength(0);

      service.updateGoal({ ...service.goals()[0], horizon: 'SHORT_TERM' as never });
      expect(service.goals()[0].status).toBe(GoalStatus.OPEN);
    });

    it('marcar solo afecta a esa sesión (RN-27)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY, '2026-10-30']));
      mark('p-a1', TODAY);
      expect(doneDates('p-a1')).toEqual([TODAY]);
    });
  });

  describe('agenda de días pasados (RN-27, RN-44, RN-75)', () => {
    const PAST = '2026-10-20';

    it('marca una sesión pasada con su tiempo realizado sin tocar la de hoy', () => {
      seedHierarchy();
      addActivity(simple('a1', [PAST, TODAY]));
      service.setSelectedDate(PAST);
      mark('p-a1', PAST, 45);

      expect(doneDates('p-a1')).toEqual([PAST]);
      expect(service.sessionsOf('p-a1')[0].actualMinutes).toBe(45);
      expect(service.agendaMetrics().executedTimeMin).toBe(45);
    });

    it('sin minutos usa los previstos y desmarcar los quita', () => {
      seedHierarchy();
      addActivity(simple('a1', [PAST]));
      service.setSelectedDate(PAST);
      mark('p-a1', PAST);
      expect(service.agendaTasks()[0].executedMinutes).toBe(30);

      mark('p-a1', PAST);
      expect(doneDates('p-a1')).toEqual([]);
      expect(service.agendaTasks()[0].executedMinutes).toBe(0);
    });

    it('ignora fechas futuras y minutos no positivos', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30', PAST]));
      service.setSelectedDate('2026-10-30');
      expect(service.isSelectedDateReadOnly()).toBe(true);
      mark('p-a1', '2026-10-30');
      mark('p-a1', PAST, 0);
      mark('p-a1', PAST, 1.5);

      expect(doneDates('p-a1')).toEqual([]);
    });

    it('syncSelectedDate toma la fecha de la URL y vuelve a hoy si falta o es inválida (RN-75)', () => {
      service.syncSelectedDate(PAST);
      expect(service.selectedDate()).toBe(PAST);
      service.syncSelectedDate('basura');
      expect(service.selectedDate()).toBe(TODAY);
      service.syncSelectedDate(PAST);
      service.syncSelectedDate(null);
      expect(service.selectedDate()).toBe(TODAY);
    });

    it('rechaza fechas inválidas al navegar', () => {
      expect(service.setSelectedDate('2026-02-30')).toBe(false);
      expect(service.selectedDate()).toBe(TODAY);
    });

    it('cierra una fecha pasada y rechaza una futura', () => {
      seedHierarchy();
      addActivity(simple('a1', [PAST]));
      expect(service.closeDay('x', PAST)).toMatchObject({ date: PAST, plannedSessions: 1, completedSessions: 0, adherencePercentage: 0 });
      expect(service.closeDay('x', '2026-10-30')).toBeNull();
    });

    it('un día cerrado no se actualiza solo: se recalcula al volver a cerrarlo (RN-44)', () => {
      seedHierarchy();
      addActivity(simple('a1', [PAST]));
      const closed = service.closeDay('mis notas', PAST)!;
      service.setSelectedDate(PAST);
      mark('p-a1', PAST, 50);
      expect(service.records()[0]).toMatchObject({ completedSessions: 0, actualMinutes: 0 });

      service.closeDay('mis notas', PAST);
      expect(service.records()).toHaveLength(1);
      expect(service.records()[0]).toMatchObject({
        id: closed.id, notes: 'mis notas', completedSessions: 1, actualMinutes: 50,
      });
    });

    it('marcar un día sin cierre no crea registro', () => {
      seedHierarchy();
      addActivity(simple('a1', [PAST]));
      service.setSelectedDate(PAST);
      mark('p-a1', PAST);
      expect(service.records()).toHaveLength(0);
    });
  });

  describe('sesiones y tiempo realizado (RN-27, RN-30, RN-71, RN-74)', () => {
    it('marcar guarda el tiempo previsto como tiempo realizado y fija completedAt', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan('pa1', 60) }));
      mark('pa1', TODAY);

      expect(service.sessionsOf('pa1')[0]).toMatchObject({ status: SessionStatus.DONE, actualMinutes: 60 });
      expect(service.sessionsOf('pa1')[0].completedAt).toBeDefined();
    });

    it('desmarcar vuelve a PLANNED y borra el tiempo realizado', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      mark('p-a1', TODAY);
      mark('p-a1', TODAY);

      const [session] = service.sessionsOf('p-a1');
      expect(session.status).toBe(SessionStatus.PLANNED);
      expect(session.completedAt).toBeUndefined();
      expect(session.actualMinutes).toBeUndefined();
    });

    it('marcar una sesión que no existe no hace nada', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.toggleSession('no-existe', 30);
      expect(doneDates('p-a1')).toEqual([]);
    });

    it('hecha con menos tiempo queda incompleta y no se cierra sola (RN-30, RN-84)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan('pa1', 60) }));
      mark('pa1', TODAY, 30);

      expect(service.activities()[0]).toMatchObject({ progress: 75, status: ActivityStatus.OPEN });
      expect(service.activities()[0].closure).toBeUndefined();
    });

    it('con tiempo de más no queda completa si falta una sesión (RN-30)', () => {
      seedHierarchy();
      const dates = ['2026-10-19', '2026-10-20', '2026-10-21', TODAY];
      addActivity(simple('a1', dates, [], { executionPlan: makePlan('pa1', 60) }));
      dates.slice(0, 3).forEach(date => mark('pa1', date, 100));

      expect(service.activities()[0]).toMatchObject({ progress: 88, status: ActivityStatus.OPEN });
    });

    it('editar el plan reemplaza las sesiones indicadas y recalcula el avance (RN-51)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY, '2026-10-30'], [TODAY]));
      expect(service.activities()[0].progress).toBe(50);

      const kept = service.sessionsOf('p-a1').filter(s => s.status === SessionStatus.DONE);
      service.updateActivity(service.activities()[0], [...kept, ...makeSessions('p-a1', ['2026-11-02', '2026-11-03'])]);

      expect(service.sessionsOf('p-a1')).toHaveLength(3);
      expect(service.activities()[0].progress).toBe(33);
    });

    it('borrar una tarea elimina sus sesiones, no los cierres de día (RN-74)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      mark('p-a1', TODAY);
      service.closeDay('x');
      service.deleteActivity('a1');

      expect(service.sessions()).toEqual([]);
      expect(service.records()).toHaveLength(1);
    });

    it('borrar una compuesta elimina las sesiones de sus pasos', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY]));
      mark('p-s1', TODAY);
      service.deleteActivity('k');

      expect(service.sessions()).toEqual([]);
    });

    it('simple → compuesta con sesiones hechas pide confirmación y las descarta (RN-40)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [TODAY]));

      expect(service.typeChangeImpact('a1', ActivityType.COMPOSITE)).toMatchObject({
        sessionsToLose: 1, completedSessionsToLose: 1, needsConfirmation: true,
      });
      service.updateActivity(makeActivity({ id: 'a1', type: ActivityType.COMPOSITE }));
      expect(service.sessions()).toEqual([]);
    });

    it('el ejemplo de las reglas: 25 % de constancia, 38 % de productividad y 31 % de avance', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'], [], { executionPlan: makePlan('pa1', 60) }));
      mark('pa1', '2026-10-19', 90);

      expect(service.consistency().get('a1')).toBe(25);
      expect(service.productivity().get('a1')).toEqual({ actualMinutes: 90, plannedMinutes: 240, percentage: 38 });
      expect(service.activities()[0].progress).toBe(31);
    });
  });

  describe('constancia (RN-57, RN-70)', () => {
    it('calcula la constancia por tarea, objetivo y meta con todas las sesiones', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-12', '2026-10-19', '2026-10-26'], ['2026-10-19']));
      expect(service.consistency().get('a1')).toBe(33);
      expect(service.consistency().get('o1')).toBe(33);
      expect(service.consistency().get('g1')).toBe(33);
    });

    it('cuenta también las sesiones futuras; sin sesiones no hay datos', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      expect(service.consistency().get('a1')).toBe(0);
      expect(service.consistency().get('k')).toBeNull();
    });

    it('la compuesta usa las sesiones de todos sus pasos', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, ['2026-10-10', '2026-10-11'], ['2026-10-10']));
      addStep(step({ id: 's2', activityId: 'k' }, ['2026-10-12', '2026-10-13'], []));
      expect(service.consistency().get('s1')).toBe(50);
      expect(service.consistency().get('s2')).toBe(0);
      expect(service.consistency().get('k')).toBe(25);
    });

    it('pausar registra el periodo y reanudar lo cierra; las fechas en pausa siguen contando', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-10', '2026-10-21', '2026-10-22']));
      vi.setSystemTime(new Date('2026-10-20T12:00:00'));
      service.pauseActivity('a1');
      vi.setSystemTime(new Date('2026-10-22T12:00:00'));
      service.resumeActivity('a1');

      expect(service.activities()[0].pauses).toEqual([{ from: '2026-10-20', to: '2026-10-21' }]);
      expect(service.consistency().get('a1')).toBe(0);
    });

    it('pausar una meta pausa a todas sus tareas', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-10']));
      vi.setSystemTime(new Date('2026-10-01T12:00:00'));
      service.pauseGoal('g1');
      vi.setSystemTime(new Date(`${TODAY}T12:00:00`));

      expect(service.goals()[0].pauses).toEqual([{ from: '2026-10-01' }]);
      expect(service.activities()[0].status).toBe(ActivityStatus.PAUSED);
    });
  });

  describe('cierre del día (RN-41 a RN-44)', () => {
    it('crea el registro con las métricas y el tiempo realizado', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan('pa1', 60) }));
      mark('pa1', TODAY);
      const record = service.closeDay('buen día')!;

      expect(record).toMatchObject({
        date: TODAY, plannedSessions: 1, completedSessions: 1, adherencePercentage: 100,
        plannedMinutes: 60, actualMinutes: 60, notes: 'buen día',
      });
      expect(record.closedAt).toEqual(expect.any(String));
    });

    it('la constancia del día es null si no tuvo sesiones (RN-72)', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-12']));

      expect(service.closeDay('')).toMatchObject({
        plannedSessions: 0, adherencePercentage: null, plannedMinutes: 0, actualMinutes: 0,
      });
    });

    it('cerrar dos veces el mismo día reemplaza el registro (RN-43)', () => {
      seedHierarchy();
      const first = service.closeDay('uno');
      const second = service.closeDay('dos');

      expect(service.records()).toHaveLength(1);
      expect(service.records()[0].notes).toBe('dos');
      expect(second!.id).toBe(first!.id);
    });

    it('los registros no se ven afectados por los borrados (RN-11)', () => {
      seedHierarchy();
      service.closeDay('x');
      service.deleteGoal('g1');
      expect(service.records()).toHaveLength(1);
    });
  });

  describe('borrado en cascada (RN-07 a RN-10, RN-52)', () => {
    function seedTree() {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }));
      addStep(step({ id: 's2', activityId: 'k' }, [TODAY], [TODAY]));
      addActivity(simple('a1', ['2026-10-30']));
    }

    it('borrar una meta elimina objetivos, tareas y pasos', () => {
      seedTree();
      service.deleteGoal('g1');
      expect(service.goals()).toHaveLength(0);
      expect(service.objectives()).toHaveLength(0);
      expect(service.activities()).toHaveLength(0);
      expect(service.subActivities()).toHaveLength(0);
    });

    it('borrar un objetivo elimina sus tareas y pasos y recalcula la meta', () => {
      seedTree();
      service.deleteObjective('o1');
      expect(service.activities()).toHaveLength(0);
      expect(service.subActivities()).toHaveLength(0);
      expect(service.goals()[0].progress).toBe(0);
    });

    it('borrar una tarea elimina sus pasos', () => {
      seedTree();
      service.deleteActivity('k');
      expect(service.subActivities()).toHaveLength(0);
      expect(service.activities().map(a => a.id)).toEqual(['a1']);
    });

    it('borrar un paso recalcula su tarea', () => {
      seedTree();
      service.deleteSubActivity('s2');
      expect(service.subActivities().map(s => s.id)).toEqual(['s1']);
      expect(service.activities().find(a => a.id === 'k')?.progress).toBe(0);
    });

    it('deletionImpact cuenta los hijos y los ya cerrados (RN-62)', () => {
      seedTree();
      service.closeStep('s2');
      expect(service.deletionImpact(DeletableType.OBJECTIVE, 'o1')).toMatchObject({
        title: 'Objetivo', activities: 2, steps: 2, completed: 1,
      });
      expect(service.deletionImpact(DeletableType.GOAL, 'g1')).toMatchObject({ objectives: 1, activities: 2, steps: 2 });
      expect(service.deletionImpact(DeletableType.STEP, 's2')).toMatchObject({ steps: 0, completed: 1 });
      expect(service.deletionImpact(DeletableType.GOAL, 'no-existe')).toBeNull();
    });
  });

  describe('cambio de tipo de tarea (RN-39, RN-40)', () => {
    it('compuesta → simple con pasos requiere confirmación y los elimina al guardar', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }));

      const impact = service.typeChangeImpact('k', ActivityType.SIMPLE);
      expect(impact).toMatchObject({ stepsToDelete: 1, needsConfirmation: true });

      const conflicts = service.updateActivity(makeActivity({
        id: 'k', type: ActivityType.SIMPLE, executionPlan: makePlan('pk'),
      }), makeSessions('pk', ['2026-10-30']));
      expect(conflicts).toEqual([]);
      expect(service.subActivities()).toHaveLength(0);
      expect(service.activities()[0].recurrence).toBe('SINGLE');
    });

    it('compuesta sin pasos → simple no requiere confirmación', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      expect(service.typeChangeImpact('k', ActivityType.SIMPLE).needsConfirmation).toBe(false);
    });

    it('simple → compuesta con sesiones requiere confirmación y descarta el plan', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-25', '2026-10-26'], ['2026-10-25']));

      expect(service.typeChangeImpact('a1', ActivityType.COMPOSITE)).toMatchObject({
        sessionsToLose: 2, completedSessionsToLose: 1, needsConfirmation: true,
      });
      service.updateActivity(makeActivity({ id: 'a1', type: ActivityType.COMPOSITE }));
      expect(service.activities()[0].executionPlan).toBeNull();
      expect(service.activities()[0].recurrence).toBeNull();
    });

    it('sin cambio de tipo no hay nada que perder', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-25']));
      expect(service.typeChangeImpact('a1', ActivityType.SIMPLE).needsConfirmation).toBe(false);
    });
  });

  describe('cadena de deadlines objetivo → tarea → paso (RN-48, RN-49, RN-65)', () => {
    beforeEach(() => {
      service.addGoal(makeGoal());
      service.addObjective(makeObjective({ deadline: '2026-12-31' }));
    });

    it('rechaza una tarea con deadline mayor que el del objetivo y no la guarda', () => {
      const conflicts = addActivity(simple('a1', ['2026-11-01'], [], { deadline: '2027-01-01' }));
      expect(conflicts[0].kind).toBe(DeadlineConflictKind.ACTIVITY_DEADLINE);
      expect(service.activities()).toHaveLength(0);
    });

    it('la tarea hereda el deadline del objetivo y rechaza sesiones posteriores', () => {
      expect(addActivity(simple('a1', ['2026-12-31']))).toEqual([]);
      const conflicts = addActivity(simple('a2', ['2027-01-02']));
      expect(conflicts[0].kind).toBe(DeadlineConflictKind.ACTIVITY_DATES);
      expect(service.activities().map(a => a.id)).toEqual(['a1']);
    });

    it('permite un deadline más corto que el del padre', () => {
      expect(addActivity(simple('a1', ['2026-11-01'], [], { deadline: '2026-11-30' }))).toEqual([]);
    });

    it('rechaza un paso más allá del deadline efectivo de su tarea', () => {
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE, deadline: '2026-11-30' }));
      const conflicts = addStep(step({ activityId: 'k' }, ['2026-12-01']));
      expect(conflicts[0].kind).toBe(DeadlineConflictKind.STEP_DATES);
      expect(service.subActivities()).toHaveLength(0);
    });

    it('adelantar el objetivo valida sus tareas y pasos y rechaza sin guardar (RN-49)', () => {
      addActivity(simple('a1', ['2026-12-20']));
      const objective = service.objectives()[0];

      const conflicts = service.updateObjective({ ...objective, deadline: '2026-12-15' });
      expect(conflicts.map(c => c.kind)).toEqual([DeadlineConflictKind.ACTIVITY_DATES]);
      expect(service.objectives()[0].deadline).toBe('2026-12-31');
    });

    it('postergar el objetivo siempre se puede (RN-60)', () => {
      addActivity(simple('a1', ['2026-12-20']));
      const objective = service.objectives()[0];
      expect(service.updateObjective({ ...objective, deadline: '2027-06-30' })).toEqual([]);
      expect(service.objectives()[0].deadline).toBe('2027-06-30');
    });
  });

  describe('calendario (RN-66)', () => {
    beforeEach(() => {
      service.addGoal(makeGoal({ title: 'Salud' }));
      service.addObjective(makeObjective({ title: 'Correr', deadline: '2026-12-31' }));
    });

    it('trae la jerarquía y los deadlines de una tarea simple', () => {
      addActivity(simple('a1', ['2026-11-02'], [], { title: 'Trote', deadline: '2026-12-01' }));
      const [entry] = service.calendarEntries().get('2026-11-02')!;

      expect(entry).toMatchObject({
        sourceType: TaskSourceType.ACTIVITY, title: 'Trote', goalTitle: 'Salud', objectiveTitle: 'Correr',
        objectiveDeadline: '2026-12-31', effectiveDeadline: '2026-12-01', isCompleted: false, durationMin: 30,
      });
    });

    it('un paso trae su tarea y hereda el deadline efectivo', () => {
      addActivity(makeActivity({ id: 'k', title: 'Plan', type: ActivityType.COMPOSITE, deadline: '2026-12-10' }));
      addStep(step({ id: 's1', activityId: 'k', title: 'Paso 1' }, ['2026-11-03']));
      const [entry] = service.calendarEntries().get('2026-11-03')!;

      expect(entry).toMatchObject({
        sourceType: TaskSourceType.SUBACTIVITY, title: 'Paso 1', activityTitle: 'Plan', effectiveDeadline: '2026-12-10',
      });
    });

    it('incluye días pasados, ordena por título y refleja lo completado', () => {
      addActivity(simple('b', ['2026-10-01', TODAY], ['2026-10-01'], { title: 'Beta' }));
      addActivity(simple('a', [TODAY], [], { title: 'Alfa' }));

      expect(service.calendarEntries().get('2026-10-01')![0].isCompleted).toBe(true);
      expect(service.calendarEntries().get(TODAY)!.map(e => e.title)).toEqual(['Alfa', 'Beta']);
    });

    it('coincide con la agenda de hoy (misma visibilidad)', () => {
      addActivity(simple('a1', [TODAY]));
      addActivity(simple('a2', [TODAY], [], { pauses: [{ from: TODAY }] }));
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY]));

      const fromCalendar = service.calendarEntries().get(TODAY)!.map(e => e.id).sort();
      const fromAgenda = service.agendaTasks().map(t => t.id).sort();
      expect(fromCalendar).toEqual(fromAgenda);
      expect(fromCalendar).toEqual(['a1', 's1']);
    });

    it('oculta lo de metas pausadas y lo de tareas pausadas', () => {
      addActivity(simple('a1', ['2026-11-02']));
      service.pauseGoal('g1');
      expect(service.calendarEntries().size).toBe(0);

      service.resumeGoal('g1');
      expect(service.calendarEntries().size).toBe(1);
      service.pauseActivity('a1');
      expect(service.calendarEntries().size).toBe(0);
    });

    it('borrar una tarea quita sus entradas', () => {
      addActivity(simple('a1', ['2026-11-02']));
      service.deleteActivity('a1');
      expect(service.calendarEntries().get('2026-11-02')).toBeUndefined();
    });
  });

  describe('cierres automáticos por evento (RN-77, RN-78)', () => {
    const PAST = '2026-10-20';

    /** Tarea con una sesión pasada y una de hoy, ambas por marcar. */
    function seedTwoSessions() {
      seedHierarchy();
      addActivity(simple('a1', [PAST, TODAY]));
    }
    const completeAll = () => {
      mark('p-a1', PAST, 30);
      mark('p-a1', TODAY);
    };

    it('hacer todas sus sesiones con todo su tiempo la cierra al completarse y cierra a sus padres', () => {
      seedTwoSessions();
      completeAll();

      expect(service.activities()[0]).toMatchObject({
        status: ActivityStatus.CLOSED, progress: 100, closure: { type: ClosureType.COMPLETED, closedOn: TODAY },
      });
      expect(service.objectives()[0]).toMatchObject({ status: ObjectiveStatus.CLOSED, closure: { type: ClosureType.CHILDREN_CLOSED } });
      expect(service.goals()[0]).toMatchObject({ status: GoalStatus.CLOSED, closure: { type: ClosureType.CHILDREN_CLOSED } });
    });

    it('desmarcar una sesión deshace ese cierre y el de sus padres', () => {
      seedTwoSessions();
      completeAll();
      mark('p-a1', TODAY);

      expect(service.activities()[0]).toMatchObject({ status: ActivityStatus.OPEN, progress: 50 });
      expect(service.activities()[0].closure).toBeUndefined();
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.OPEN);
      expect(service.goals()[0].status).toBe(GoalStatus.OPEN);
    });

    it('reabrir a mano algo al 100 % no lo vuelve a cerrar solo', () => {
      seedTwoSessions();
      completeAll();
      expect(service.reopenActivity('a1')).toBe('ok');
      service.updateGoal(service.goals()[0]);

      expect(service.activities()[0]).toMatchObject({ status: ActivityStatus.OPEN, progress: 100 });
      expect(service.goals()[0].status).toBe(GoalStatus.OPEN);
    });

    it('si un padre sigue cerrado a mano, desmarcar no reabre la tarea', () => {
      seedTwoSessions();
      addActivity(simple('a2', ['2026-10-30']));
      completeAll();
      service.closeObjective('o1');
      mark('p-a1', TODAY);

      expect(service.activities()[0]).toMatchObject({ status: ActivityStatus.CLOSED, progress: 50 });
    });

    it('cerrar la última tarea abierta cierra el objetivo y la meta; con otra abierta no', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      addActivity(simple('a2', ['2026-10-31']));
      service.closeActivity('a1');
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.OPEN);

      service.closeActivity('a2');
      expect(service.objectives()[0]).toMatchObject({ status: ObjectiveStatus.CLOSED, closure: { type: ClosureType.CHILDREN_CLOSED } });
      expect(service.goals()[0].status).toBe(GoalStatus.CLOSED);
    });

    it('borrar la última tarea abierta cierra el objetivo', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      addActivity(simple('a2', ['2026-10-31']));
      service.closeActivity('a1');
      service.deleteActivity('a2');

      expect(service.objectives()[0]).toMatchObject({ status: ObjectiveStatus.CLOSED, closure: { type: ClosureType.CHILDREN_CLOSED } });
    });

    it('agregar una tarea reabre al objetivo y la meta, pero no a sus hermanas cerradas (RN-53)', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      service.closeObjective('o1');
      addActivity(simple('a2', ['2026-10-31']));

      expect(service.objectives()[0].status).toBe(ObjectiveStatus.OPEN);
      expect(service.goals()[0].status).toBe(GoalStatus.OPEN);
      expect(service.activities().map(a => a.status)).toEqual([ActivityStatus.CLOSED, ActivityStatus.OPEN]);
    });
  });

  describe('cerrar y reabrir (RN-64, RN-77, RN-78, RN-80)', () => {
    it('cerrar la meta cierra todo lo de abajo; una idea no se cierra', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      expect(service.closeGoal('g1')).toBe(true);

      expect(service.goals()[0]).toMatchObject({ status: GoalStatus.CLOSED, closure: { type: ClosureType.MANUAL } });
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.CLOSED);
      expect(service.activities()[0].status).toBe(ActivityStatus.CLOSED);
      expect(service.closeGoal('g1')).toBe(false);

      service.addGoal(makeGoal({ id: 'g2', horizon: null, status: GoalStatus.IDEA }));
      expect(service.closeGoal('g2')).toBe(false);
    });

    it('reabrir un objetivo reabre sus tareas incompletas y no las que ya están completas', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      addActivity(simple('a2', ['2026-10-20'], ['2026-10-20']));
      service.closeObjective('o1');

      expect(service.reopenObjective('o1')).toBe('ok');
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.OPEN);
      expect(service.activities().map(a => a.status)).toEqual([ActivityStatus.OPEN, ActivityStatus.CLOSED]);
    });

    it('reabrir un hijo reabre sus padres cerrados sin reabrir a sus hermanos', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      addActivity(simple('a2', ['2026-10-31']));
      service.closeGoal('g1');

      expect(service.reopenActivity('a1')).toBe('ok');
      expect(service.activities().map(a => a.status)).toEqual([ActivityStatus.OPEN, ActivityStatus.CLOSED]);
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.OPEN);
      expect(service.goals()[0].status).toBe(GoalStatus.OPEN);
    });

    it('reabrir lo vencido exige un deadline nuevo desde hoy y sus hijos lo heredan', () => {
      service.addGoal(makeGoal());
      service.addObjective(makeObjective({ deadline: '2026-10-21' }));
      addActivity(simple('a1', ['2026-10-20']));
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.CLOSED);

      expect(service.reopenObjective('o1')).toBe('needs_deadline');
      expect(service.reopenObjective('o1', '2026-10-01')).toBe('invalid_deadline');
      expect(service.reopenObjective('o1', '2026-11-30')).toBe('ok');
      expect(service.objectives()[0]).toMatchObject({ status: ObjectiveStatus.OPEN, deadline: '2026-11-30' });
      expect(service.activities()[0].status).toBe(ActivityStatus.OPEN);
    });

    it('reabrir una tarea vencida no cabe si el deadline de su objetivo también pasó', () => {
      service.addGoal(makeGoal());
      service.addObjective(makeObjective({ deadline: '2026-10-21' }));
      addActivity(simple('a1', ['2026-10-20']));

      expect(service.reopenActivity('a1', '2026-11-30')).toBe('parent_expired');
    });

    it('lo abierto no se reabre', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      expect(service.reopenActivity('a1')).toBe('not_closed');
    });

    it('al reabrir, las sesiones ocultas por el cierre vuelven a la agenda (RN-79)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.closeActivity('a1');
      expect(service.agendaTasks()).toEqual([]);

      service.reopenActivity('a1');
      expect(service.agendaTasks()).toHaveLength(1);
    });
  });

  describe('pausa heredada (RN-57)', () => {
    it('pausar la tarea, pausar y reanudar la meta deja la tarea pausada', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.pauseActivity('a1');
      service.pauseGoal('g1');
      service.resumeGoal('g1');

      expect(service.activities()[0].status).toBe(ActivityStatus.PAUSED);
      expect(service.agendaTasks()).toEqual([]);

      service.resumeActivity('a1');
      expect(service.agendaTasks()).toHaveLength(1);
    });

    it('pausar un objetivo pausa sus tareas y pasos sin guardarles la pausa', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY]));
      service.pauseObjective('o1');

      expect(service.objectives()[0].status).toBe(ObjectiveStatus.PAUSED);
      expect(service.activities()[0].status).toBe(ActivityStatus.PAUSED);
      expect(service.subActivities()[0].status).toBe(SubActivityStatus.PAUSED);
      expect(service.activities()[0].pauses ?? []).toEqual([]);
      expect(service.agendaTasks()).toEqual([]);

      service.resumeObjective('o1');
      expect(service.subActivities()[0].status).toBe(SubActivityStatus.OPEN);
      expect(service.agendaTasks()).toHaveLength(1);
    });

    it('un paso se pausa solo y sale de la agenda y del calendario', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY]));
      service.pauseStep('s1');

      expect(service.subActivities()[0].status).toBe(SubActivityStatus.PAUSED);
      expect(service.agendaTasks()).toEqual([]);
      expect(service.calendarEntries().get(TODAY)).toBeUndefined();
    });

    it('lo cerrado no se pausa y pausar una idea no hace nada', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30']));
      service.closeObjective('o1');
      service.pauseObjective('o1');
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.CLOSED);
      expect(service.objectives()[0].pauses ?? []).toEqual([]);

      service.addGoal(makeGoal({ id: 'g2', horizon: null, status: GoalStatus.IDEA }));
      service.pauseGoal('g2');
      expect(service.goals()[1].status).toBe(GoalStatus.IDEA);
    });

    it('la constancia cuenta también las fechas en que un padre estaba pausado (RN-70)', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-12', '2026-10-23'], ['2026-10-12']));
      service.pauseObjective('o1'); // desde hoy, 22
      vi.setSystemTime(new Date('2026-10-25T12:00:00'));
      expect(service.consistency().get('a1')).toBe(50);
    });
  });

  describe('productividad (RN-73)', () => {
    it('tiempo realizado sobre el previsto de todas las sesiones', () => {
      seedHierarchy();
      const plan = makePlan('pa1', 60);
      addActivity(simple('a1', ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'], [], { executionPlan: plan }));
      mark('pa1', '2026-10-12', 45);
      mark('pa1', '2026-10-19', 45);

      expect(service.productivity().get('a1')).toEqual({ actualMinutes: 90, plannedMinutes: 240, percentage: 38 });
    });

    it('los padres suman minutos sin promediar y puede pasar de 100 %', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-12'], [], { executionPlan: makePlan('pa1', 60) }));
      addActivity(simple('a2', ['2026-10-30'], [], { executionPlan: makePlan('pa2', 60) }));
      mark('pa1', '2026-10-12', 90);

      expect(service.productivity().get('o1')).toEqual({ actualMinutes: 90, plannedMinutes: 120, percentage: 75 });
      expect(service.productivity().get('g1')?.percentage).toBe(75);
      expect(service.productivity().get('a1')?.percentage).toBe(150);
    });

    it('no cambia al cerrar y es null sin tiempo previsto', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan('pa1', 60) }));
      mark('pa1', TODAY, 30);
      service.closeActivity('a1');
      expect(service.productivity().get('a1')?.percentage).toBe(50);

      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      expect(service.productivity().get('k')?.percentage).toBeNull();
    });
  });
});

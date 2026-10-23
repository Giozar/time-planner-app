import { TestBed } from '@angular/core/testing';
import { DataProvider } from '../providers/data.provider';
import { PlannerService } from './planner.service';
import { InMemoryDataProvider } from '../../testing/in-memory-data.provider';
import { makeActivity, makeGoal, makeObjective, makePlan, makeSessions, makeStep } from '../../testing/builders';
import {
  Activity, ActivityStatus, ActivityType, ExecutionPlanType, SubActivity, SubActivityStatus, TaskSourceType, WeekDay,
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

  describe('progreso y estados en cascada (RN-30 a RN-36)', () => {
    it('sube de tarea a objetivo y meta tras marcar la sesión de hoy', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);

      expect(service.activities()[0].progress).toBe(100);
      expect(service.activities()[0].status).toBe(ActivityStatus.COMPLETED);
      expect(service.objectives()[0].progress).toBe(100);
      expect(service.goals()[0].progress).toBe(100);
    });

    it('desmarcar baja el progreso de toda la cadena', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);

      expect(service.activities()[0].status).toBe(ActivityStatus.PENDING);
      expect(service.goals()[0].progress).toBe(0);
    });

    it('el progreso del objetivo es el promedio simple de sus tareas (RN-33)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      addActivity(simple('a2', ['2026-10-30']));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);

      expect(service.objectives()[0].progress).toBe(50);
    });

    it('la compuesta promedia sus pasos y suma su tiempo total (RN-32, RN-24)', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY], [], 30));
      addStep(step({ id: 's2', activityId: 'k' }, ['2026-10-30', '2026-10-31'], [], 45));
      service.toggleTaskExecution('s1', TaskSourceType.SUBACTIVITY);

      const composite = service.activities()[0];
      expect(composite.progress).toBe(50);
      expect(composite.status).toBe(ActivityStatus.IN_PROGRESS);
      expect(composite.totalTimeRequiredMin).toBe(30 + 2 * 45);
      expect(service.subActivities()[0].status).toBe(SubActivityStatus.COMPLETED);
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

  describe('cierre y reapertura de objetivo (RN-63, RN-64)', () => {
    function completeObjective() {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
    }

    it('llegar a 100% no lo cierra', () => {
      completeObjective();
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.ACTIVE);
    });

    it('closeObjective cierra solo con 100%', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      expect(service.closeObjective('o1')).toBe(false);
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.ACTIVE);

      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      expect(service.closeObjective('o1')).toBe(true);
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.COMPLETED);
    });

    it('agregar una tarea a un objetivo cerrado lo reabre', () => {
      completeObjective();
      service.closeObjective('o1');
      addActivity(simple('a2', ['2026-10-30']));

      expect(service.objectives()[0].status).toBe(ObjectiveStatus.ACTIVE);
      expect(service.objectives()[0].progress).toBe(50);
    });

    it('borrar el hijo completado lo reabre y recalcula', () => {
      completeObjective();
      service.closeObjective('o1');
      service.deleteActivity('a1');

      expect(service.objectives()[0].status).toBe(ObjectiveStatus.ACTIVE);
      expect(service.objectives()[0].progress).toBe(0);
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

    it('las métricas incluyen el tiempo planeado y ejecutado', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan('pa1', 60) }));
      addActivity(simple('a2', [TODAY], [], { executionPlan: makePlan('pa2', 30) }));
      service.toggleTaskExecution('a2', TaskSourceType.ACTIVITY);

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

    it('oculta tareas pausadas y reanudar deriva el estado del progreso (RN-59)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      service.pauseActivity('a1');
      expect(service.activities()[0].status).toBe(ActivityStatus.PAUSED);
      expect(service.agendaTasks()).toHaveLength(0);

      service.resumeActivity('a1');
      expect(service.activities()[0].status).toBe(ActivityStatus.COMPLETED);
    });

    it('oculta las ideas (RN-55) y una idea con horizonte y tareas pasa a ACTIVE', () => {
      service.addGoal(makeGoal({ horizon: null, status: GoalStatus.IDEA }));
      service.addObjective(makeObjective());
      expect(service.goals()[0].status).toBe(GoalStatus.IDEA);

      addActivity(simple('a1', [TODAY]));
      expect(service.agendaTasks()).toHaveLength(0);

      service.updateGoal({ ...service.goals()[0], horizon: 'SHORT_TERM' as never });
      expect(service.goals()[0].status).toBe(GoalStatus.ACTIVE);
    });

    it('marcar solo afecta a hoy (RN-27)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY, '2026-10-30']));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      expect(doneDates('p-a1')).toEqual([TODAY]);
    });
  });

  describe('agenda de días pasados (RN-27, RN-44, RN-75)', () => {
    const PAST = '2026-10-20';

    it('marca una sesión pasada con sus minutos reales sin tocar la de hoy', () => {
      seedHierarchy();
      addActivity(simple('a1', [PAST, TODAY]));
      service.setSelectedDate(PAST);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY, 45);

      expect(doneDates('p-a1')).toEqual([PAST]);
      expect(service.workLogs()).toMatchObject([{ sourceId: 'a1', date: PAST, minutes: 45 }]);
      expect(service.agendaMetrics().executedTimeMin).toBe(45);
    });

    it('sin minutos usa los previstos y desmarcar los quita', () => {
      seedHierarchy();
      addActivity(simple('a1', [PAST]));
      service.setSelectedDate(PAST);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      expect(service.agendaTasks()[0].executedMinutes).toBe(30);

      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      expect(doneDates('p-a1')).toEqual([]);
      expect(service.agendaTasks()[0].executedMinutes).toBe(0);
    });

    it('ignora fechas futuras y minutos no positivos', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-30', PAST]));
      service.setSelectedDate('2026-10-30');
      expect(service.isSelectedDateReadOnly()).toBe(true);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      service.setSelectedDate(PAST);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY, 0);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY, 1.5);

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
      expect(service.closeDay('x', PAST)).toMatchObject({ date: PAST, plannedItems: 1, completedItems: 0 });
      expect(service.closeDay('x', '2026-10-30')).toBeNull();
    });

    it('un día cerrado no se actualiza solo: se recalcula al volver a cerrarlo (RN-44)', () => {
      seedHierarchy();
      addActivity(simple('a1', [PAST]));
      const closed = service.closeDay('mis notas', PAST)!;
      service.setSelectedDate(PAST);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY, 50);
      expect(service.records()[0]).toMatchObject({ completedItems: 0, executedTimeMin: 0 });

      service.closeDay('mis notas', PAST);
      expect(service.records()).toHaveLength(1);
      expect(service.records()[0]).toMatchObject({
        id: closed.id, notes: 'mis notas', completedItems: 1, executedTimeMin: 50,
      });
    });

    it('marcar un día sin cierre no crea registro', () => {
      seedHierarchy();
      addActivity(simple('a1', [PAST]));
      service.setSelectedDate(PAST);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      expect(service.records()).toHaveLength(0);
    });
  });

  describe('sesiones y tiempo real (RN-27, RN-68, RN-71, RN-74, RN-76)', () => {
    it('marcar crea un bloque vinculado con los minutos previstos y fija completedAt', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan('pa1', 60) }));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);

      const [session] = service.sessionsOf('pa1');
      expect(session.status).toBe(SessionStatus.DONE);
      expect(session.completedAt).toBeDefined();
      expect(service.workLogs()).toMatchObject([{ sourceId: 'a1', date: TODAY, minutes: 60, sessionId: session.id }]);
    });

    it('desmarcar vuelve a PLANNED y elimina los minutos vinculados', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);

      expect(service.sessionsOf('p-a1')[0].status).toBe(SessionStatus.PLANNED);
      expect(service.sessionsOf('p-a1')[0].completedAt).toBeUndefined();
      expect(service.workLogs()).toEqual([]);
    });

    it('marcar una fecha sin sesión no hace nada', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.setSelectedDate('2026-10-20');
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY, 30);
      expect(service.workLogs()).toEqual([]);
    });

    it('el tiempo sin sesión no marca sesiones ni cambia el avance (RN-68)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      expect(service.logWork('a1', TaskSourceType.ACTIVITY, 40)).toBe(true);

      expect(service.sessionsOf('p-a1')[0].status).toBe(SessionStatus.PLANNED);
      expect(service.activities()[0].progress).toBe(0);
      expect(service.agendaMetrics().executedTimeMin).toBe(40);
    });

    it('rechaza tiempo en fechas futuras, minutos no válidos o ítems inexistentes', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      expect(service.logWork('a1', TaskSourceType.ACTIVITY, 30, '2026-10-30')).toBe(false);
      expect(service.logWork('a1', TaskSourceType.ACTIVITY, 0)).toBe(false);
      expect(service.logWork('nada', TaskSourceType.ACTIVITY, 30)).toBe(false);
      expect(service.workLogs()).toEqual([]);
    });

    it('se pueden corregir los minutos de un bloque (RN-76)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.logWork('a1', TaskSourceType.ACTIVITY, 40);
      const id = service.workLogs()[0].id;

      expect(service.updateWorkLog(id, 55)).toBe(true);
      expect(service.updateWorkLog(id, -1)).toBe(false);
      expect(service.workLogs()[0].minutes).toBe(55);
    });

    it('borrar el último bloque de una sesión DONE la devuelve a PLANNED (RN-76)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      service.deleteWorkLog(service.workLogs()[0].id);

      expect(service.sessionsOf('p-a1')[0].status).toBe(SessionStatus.PLANNED);
      expect(service.activities()[0].progress).toBe(0);
    });

    it('borrar un bloque sin sesión no toca las sesiones', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [TODAY]));
      service.logWork('a1', TaskSourceType.ACTIVITY, 20);
      service.deleteWorkLog(service.workLogs()[0].id);
      expect(service.sessionsOf('p-a1')[0].status).toBe(SessionStatus.DONE);
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

    it('borrar una tarea elimina sus sesiones y su tiempo, no los cierres (RN-74)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      service.closeDay('x');
      service.deleteActivity('a1');

      expect(service.sessions()).toEqual([]);
      expect(service.workLogs()).toEqual([]);
      expect(service.records()).toHaveLength(1);
    });

    it('borrar una compuesta elimina las sesiones y el tiempo de sus pasos', () => {
      seedHierarchy();
      addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      addStep(step({ id: 's1', activityId: 'k' }, [TODAY]));
      service.toggleTaskExecution('s1', TaskSourceType.SUBACTIVITY);
      service.deleteActivity('k');

      expect(service.sessions()).toEqual([]);
      expect(service.workLogs()).toEqual([]);
    });

    it('simple → compuesta con tiempo registrado pide confirmación y lo descarta (RN-40)', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY]));
      service.logWork('a1', TaskSourceType.ACTIVITY, 30);

      expect(service.typeChangeImpact('a1', ActivityType.COMPOSITE)).toMatchObject({ workLogsToLose: 1, needsConfirmation: true });
      service.updateActivity(makeActivity({ id: 'a1', type: ActivityType.COMPOSITE }));
      expect(service.sessions()).toEqual([]);
      expect(service.workLogs()).toEqual([]);
    });

    it('el ejemplo de las reglas: 25 % de avance, 50 % de constancia y 90 minutos', () => {
      seedHierarchy();
      addActivity(simple('a1', ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'], [], { executionPlan: makePlan('pa1', 60) }));
      service.setSelectedDate('2026-10-19');
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY, 90);

      const sessions = service.sessionsOf('pa1');
      const due = sessions.filter(s => s.scheduledDate <= TODAY);
      const consistency = Math.round(due.filter(s => s.status === SessionStatus.DONE).length / due.length * 100);
      expect(service.activities()[0].progress).toBe(25);
      expect(consistency).toBe(50);
      expect(service.workLogs().reduce((sum, l) => sum + l.minutes, 0)).toBe(90);
    });
  });

  describe('cierre del día (RN-41 a RN-44)', () => {
    it('crea el registro con las métricas y el tiempo real ejecutado', () => {
      seedHierarchy();
      addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan('pa1', 60) }));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      const record = service.closeDay('buen día')!;

      expect(record).toMatchObject({
        date: TODAY, plannedItems: 1, completedItems: 1, plannedTimeMin: 60, executedTimeMin: 60, notes: 'buen día',
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

    it('deletionImpact cuenta los hijos y los completados (RN-62)', () => {
      seedTree(); // s2 ya nace completado
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
      addActivity(simple('a2', [TODAY], [], { status: ActivityStatus.PAUSED }));
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
});

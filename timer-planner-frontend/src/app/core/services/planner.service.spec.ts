import { TestBed } from '@angular/core/testing';
import { DataProvider } from '../providers/data.provider';
import { PlannerService } from './planner.service';
import { InMemoryDataProvider } from '../../testing/in-memory-data.provider';
import { makeActivity, makeGoal, makeObjective, makePlan, makeStep } from '../../testing/builders';
import {
  ActivityStatus, ActivityType, ExecutionPlanType, SubActivityStatus, TaskSourceType, WeekDay,
} from '../models/activity.model';
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

  const simple = (id: string, dates: string[], completed: string[] = [], extra = {}) =>
    makeActivity({ id, title: id, executionPlan: makePlan(dates, completed), ...extra });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`));

    provider = new InMemoryDataProvider();
    TestBed.configureTestingModule({ providers: [{ provide: DataProvider, useValue: provider }] });
    service = TestBed.inject(PlannerService);
  });

  afterEach(() => vi.useRealTimers());

  describe('progreso y estados en cascada (RN-30 a RN-36)', () => {
    it('sube de tarea a objetivo y meta tras marcar la sesión de hoy', () => {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);

      expect(service.activities()[0].progress).toBe(100);
      expect(service.activities()[0].status).toBe(ActivityStatus.COMPLETED);
      expect(service.objectives()[0].progress).toBe(100);
      expect(service.goals()[0].progress).toBe(100);
    });

    it('desmarcar baja el progreso de toda la cadena', () => {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);

      expect(service.activities()[0].status).toBe(ActivityStatus.PENDING);
      expect(service.goals()[0].progress).toBe(0);
    });

    it('el progreso del objetivo es el promedio simple de sus tareas (RN-33)', () => {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY]));
      service.addActivity(simple('a2', ['2026-10-30']));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);

      expect(service.objectives()[0].progress).toBe(50);
    });

    it('la compuesta promedia sus pasos y suma su tiempo total (RN-32, RN-24, B-14)', () => {
      seedHierarchy();
      service.addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      service.addSubActivity(makeStep({ id: 's1', activityId: 'k', executionPlan: makePlan([TODAY], [], 30) }));
      service.addSubActivity(makeStep({ id: 's2', activityId: 'k', executionPlan: makePlan(['2026-10-30', '2026-10-31'], [], 45) }));
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
      service.addActivity(simple('a1', ['2026-10-25']));
      service.addActivity(simple('a2', ['2026-10-25', '2026-10-26']));
      service.addActivity(simple('k', ['2026-10-25'], [], { type: ActivityType.COMPOSITE }));

      const [a1, a2, k] = service.activities();
      expect(a1.recurrence).toBe('SINGLE');
      expect(a2.recurrence).toBe('SPECIFIC_DATES');
      expect(k.recurrence).toBeNull();
      expect(k.executionPlan).toBeNull();
    });

    it('un patrón semanal da WEEKLY_PATTERN', () => {
      seedHierarchy();
      service.addActivity(simple('a1', ['2026-10-26'], [], {
        executionPlan: { ...makePlan(['2026-10-26']), type: ExecutionPlanType.WEEKLY_PATTERN, patternDays: [WeekDay.MONDAY] },
      }));
      expect(service.activities()[0].recurrence).toBe('WEEKLY_PATTERN');
    });
  });

  describe('cierre y reapertura de objetivo (RN-63, RN-64)', () => {
    function completeObjective() {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
    }

    it('llegar a 100% no lo cierra', () => {
      completeObjective();
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.ACTIVE);
    });

    it('closeObjective cierra solo con 100%', () => {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY]));
      expect(service.closeObjective('o1')).toBe(false);
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.ACTIVE);

      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      expect(service.closeObjective('o1')).toBe(true);
      expect(service.objectives()[0].status).toBe(ObjectiveStatus.COMPLETED);
    });

    it('agregar una tarea a un objetivo cerrado lo reabre', () => {
      completeObjective();
      service.closeObjective('o1');
      service.addActivity(simple('a2', ['2026-10-30']));

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
      service.addActivity(simple('a1', [TODAY, '2026-10-30']));
      service.addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      service.addSubActivity(makeStep({ id: 's1', activityId: 'k', executionPlan: makePlan([TODAY]) }));
      service.addActivity(simple('a2', ['2026-10-30']));

      const ids = service.todaysTasks().map(t => t.id).sort();
      expect(ids).toEqual(['a1', 's1']);
      expect(service.todaysTasks().find(t => t.id === 's1')?.parentId).toBe('k');
    });

    it('las métricas incluyen el tiempo planeado y ejecutado', () => {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan([TODAY], [], 60) }));
      service.addActivity(simple('a2', [TODAY], [], { executionPlan: makePlan([TODAY], [], 30) }));
      service.toggleTaskExecution('a2', TaskSourceType.ACTIVITY);

      expect(service.todaysMetrics()).toMatchObject({
        total: 2, completed: 1, percentage: 50, plannedTimeMin: 90, executedTimeMin: 30,
      });
    });

    it('oculta metas pausadas y reanudar las devuelve (RN-57)', () => {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY]));
      service.pauseGoal('g1');
      expect(service.todaysTasks()).toHaveLength(0);
      expect(service.activities()[0].progress).toBe(0);

      service.resumeGoal('g1');
      expect(service.todaysTasks()).toHaveLength(1);
    });

    it('oculta tareas pausadas y reanudar deriva el estado del progreso (RN-59)', () => {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY]));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      service.pauseActivity('a1');
      expect(service.activities()[0].status).toBe(ActivityStatus.PAUSED);
      expect(service.todaysTasks()).toHaveLength(0);

      service.resumeActivity('a1');
      expect(service.activities()[0].status).toBe(ActivityStatus.COMPLETED);
    });

    it('oculta las ideas (RN-55) y una idea con horizonte y tareas pasa a ACTIVE', () => {
      service.addGoal(makeGoal({ horizon: null, status: GoalStatus.IDEA }));
      service.addObjective(makeObjective());
      expect(service.goals()[0].status).toBe(GoalStatus.IDEA);

      service.addActivity(simple('a1', [TODAY]));
      expect(service.todaysTasks()).toHaveLength(0);

      service.updateGoal({ ...service.goals()[0], horizon: 'SHORT_TERM' as never });
      expect(service.goals()[0].status).toBe(GoalStatus.ACTIVE);
    });

    it('marcar solo afecta a hoy (RN-27)', () => {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY, '2026-10-30']));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      expect(service.activities()[0].executionPlan?.completedDates).toEqual([TODAY]);
    });
  });

  describe('cierre del día (RN-41 a RN-44)', () => {
    it('crea el registro con las métricas y el tiempo real ejecutado', () => {
      seedHierarchy();
      service.addActivity(simple('a1', [TODAY], [], { executionPlan: makePlan([TODAY], [], 60) }));
      service.toggleTaskExecution('a1', TaskSourceType.ACTIVITY);
      const record = service.closeDay('buen día');

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
      expect(second.id).toBe(first.id);
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
      service.addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      service.addSubActivity(makeStep({ id: 's1', activityId: 'k' }));
      service.addSubActivity(makeStep({ id: 's2', activityId: 'k', executionPlan: makePlan([TODAY], [TODAY]) }));
      service.addActivity(simple('a1', ['2026-10-30']));
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
      service.addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      service.addSubActivity(makeStep({ id: 's1', activityId: 'k' }));

      const impact = service.typeChangeImpact('k', ActivityType.SIMPLE);
      expect(impact).toMatchObject({ stepsToDelete: 1, needsConfirmation: true });

      const conflicts = service.updateActivity(makeActivity({
        id: 'k', type: ActivityType.SIMPLE, executionPlan: makePlan(['2026-10-30']),
      }));
      expect(conflicts).toEqual([]);
      expect(service.subActivities()).toHaveLength(0);
      expect(service.activities()[0].recurrence).toBe('SINGLE');
    });

    it('compuesta sin pasos → simple no requiere confirmación', () => {
      seedHierarchy();
      service.addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      expect(service.typeChangeImpact('k', ActivityType.SIMPLE).needsConfirmation).toBe(false);
    });

    it('simple → compuesta con sesiones requiere confirmación y descarta el plan', () => {
      seedHierarchy();
      service.addActivity(simple('a1', ['2026-10-25', '2026-10-26'], ['2026-10-25']));

      expect(service.typeChangeImpact('a1', ActivityType.COMPOSITE)).toMatchObject({
        sessionsToLose: 2, completedSessionsToLose: 1, needsConfirmation: true,
      });
      service.updateActivity(makeActivity({ id: 'a1', type: ActivityType.COMPOSITE }));
      expect(service.activities()[0].executionPlan).toBeNull();
      expect(service.activities()[0].recurrence).toBeNull();
    });

    it('sin cambio de tipo no hay nada que perder', () => {
      seedHierarchy();
      service.addActivity(simple('a1', ['2026-10-25']));
      expect(service.typeChangeImpact('a1', ActivityType.SIMPLE).needsConfirmation).toBe(false);
    });
  });

  describe('cadena de deadlines objetivo → tarea → paso (RN-48, RN-49, RN-65)', () => {
    beforeEach(() => {
      service.addGoal(makeGoal());
      service.addObjective(makeObjective({ deadline: '2026-12-31' }));
    });

    it('rechaza una tarea con deadline mayor que el del objetivo y no la guarda', () => {
      const conflicts = service.addActivity(simple('a1', ['2026-11-01'], [], { deadline: '2027-01-01' }));
      expect(conflicts[0].kind).toBe(DeadlineConflictKind.ACTIVITY_DEADLINE);
      expect(service.activities()).toHaveLength(0);
    });

    it('la tarea hereda el deadline del objetivo y rechaza sesiones posteriores', () => {
      expect(service.addActivity(simple('a1', ['2026-12-31']))).toEqual([]);
      const conflicts = service.addActivity(simple('a2', ['2027-01-02']));
      expect(conflicts[0].kind).toBe(DeadlineConflictKind.ACTIVITY_DATES);
      expect(service.activities().map(a => a.id)).toEqual(['a1']);
    });

    it('permite un deadline más corto que el del padre', () => {
      expect(service.addActivity(simple('a1', ['2026-11-01'], [], { deadline: '2026-11-30' }))).toEqual([]);
    });

    it('rechaza un paso más allá del deadline efectivo de su tarea', () => {
      service.addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE, deadline: '2026-11-30' }));
      const conflicts = service.addSubActivity(makeStep({ activityId: 'k', executionPlan: makePlan(['2026-12-01']) }));
      expect(conflicts[0].kind).toBe(DeadlineConflictKind.STEP_DATES);
      expect(service.subActivities()).toHaveLength(0);
    });

    it('adelantar el objetivo valida sus tareas y pasos y rechaza sin guardar (RN-49)', () => {
      service.addActivity(simple('a1', ['2026-12-20']));
      const objective = service.objectives()[0];

      const conflicts = service.updateObjective({ ...objective, deadline: '2026-12-15' });
      expect(conflicts.map(c => c.kind)).toEqual([DeadlineConflictKind.ACTIVITY_DATES]);
      expect(service.objectives()[0].deadline).toBe('2026-12-31');
    });

    it('postergar el objetivo siempre se puede (RN-60)', () => {
      service.addActivity(simple('a1', ['2026-12-20']));
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
      service.addActivity(simple('a1', ['2026-11-02'], [], { title: 'Trote', deadline: '2026-12-01' }));
      const [entry] = service.calendarEntries().get('2026-11-02')!;

      expect(entry).toMatchObject({
        sourceType: TaskSourceType.ACTIVITY, title: 'Trote', goalTitle: 'Salud', objectiveTitle: 'Correr',
        objectiveDeadline: '2026-12-31', effectiveDeadline: '2026-12-01', isCompleted: false, durationMin: 30,
      });
    });

    it('un paso trae su tarea y hereda el deadline efectivo', () => {
      service.addActivity(makeActivity({ id: 'k', title: 'Plan', type: ActivityType.COMPOSITE, deadline: '2026-12-10' }));
      service.addSubActivity(makeStep({ id: 's1', activityId: 'k', title: 'Paso 1', executionPlan: makePlan(['2026-11-03']) }));
      const [entry] = service.calendarEntries().get('2026-11-03')!;

      expect(entry).toMatchObject({
        sourceType: TaskSourceType.SUBACTIVITY, title: 'Paso 1', activityTitle: 'Plan', effectiveDeadline: '2026-12-10',
      });
    });

    it('incluye días pasados, ordena por título y refleja lo completado', () => {
      service.addActivity(simple('b', ['2026-10-01', TODAY], ['2026-10-01'], { title: 'Beta' }));
      service.addActivity(simple('a', [TODAY], [], { title: 'Alfa' }));

      expect(service.calendarEntries().get('2026-10-01')![0].isCompleted).toBe(true);
      expect(service.calendarEntries().get(TODAY)!.map(e => e.title)).toEqual(['Alfa', 'Beta']);
    });

    it('coincide con la agenda de hoy (misma visibilidad)', () => {
      service.addActivity(simple('a1', [TODAY]));
      service.addActivity(simple('a2', [TODAY], [], { status: ActivityStatus.PAUSED }));
      service.addActivity(makeActivity({ id: 'k', type: ActivityType.COMPOSITE }));
      service.addSubActivity(makeStep({ id: 's1', activityId: 'k', executionPlan: makePlan([TODAY]) }));

      const fromCalendar = service.calendarEntries().get(TODAY)!.map(e => e.id).sort();
      const fromAgenda = service.todaysTasks().map(t => t.id).sort();
      expect(fromCalendar).toEqual(fromAgenda);
      expect(fromCalendar).toEqual(['a1', 's1']);
    });

    it('oculta lo de metas pausadas y lo de tareas pausadas', () => {
      service.addActivity(simple('a1', ['2026-11-02']));
      service.pauseGoal('g1');
      expect(service.calendarEntries().size).toBe(0);

      service.resumeGoal('g1');
      expect(service.calendarEntries().size).toBe(1);
      service.pauseActivity('a1');
      expect(service.calendarEntries().size).toBe(0);
    });

    it('borrar una tarea quita sus entradas', () => {
      service.addActivity(simple('a1', ['2026-11-02']));
      service.deleteActivity('a1');
      expect(service.calendarEntries().get('2026-11-02')).toBeUndefined();
    });
  });
});

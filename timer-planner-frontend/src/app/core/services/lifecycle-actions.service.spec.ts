import { TestBed } from '@angular/core/testing';
import { DataProvider } from '../providers/data.provider';
import { PlannerService } from './planner.service';
import { NativeDialogService } from './native-dialog.service';
import { LifecycleActionsService } from './lifecycle-actions.service';
import { InMemoryDataProvider } from '../../testing/in-memory-data.provider';
import { makeActivity, makeGoal, makeObjective, makePlan, makeSessions } from '../../testing/builders';
import { ActivityStatus } from '../models/activity.model';
import { ObjectiveStatus } from '../models/objective.model';

const TODAY = '2026-10-22';

describe('LifecycleActionsService', () => {
  let planner: PlannerService;
  let dialog: NativeDialogService;
  let actions: LifecycleActionsService;

  /** Responde el diálogo abierto en cuanto aparece. */
  const answer = async (result: boolean, input?: string) => {
    await Promise.resolve();
    dialog.close(result, input);
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
    TestBed.configureTestingModule({ providers: [{ provide: DataProvider, useValue: new InMemoryDataProvider() }] });
    planner = TestBed.inject(PlannerService);
    dialog = TestBed.inject(NativeDialogService);
    actions = TestBed.inject(LifecycleActionsService);

    planner.addGoal(makeGoal());
    planner.addObjective(makeObjective());
    planner.addActivity(
      makeActivity({ id: 'a1', title: 'Correr', executionPlan: makePlan('p-a1') }),
      makeSessions('p-a1', ['2026-10-30']),
    );
  });

  afterEach(() => vi.useRealTimers());

  /** Objetivo o2 con la fecha límite ya pasada: se cierra solo por fecha límite (RN-58). */
  function seedExpiredObjective() {
    planner.addObjective(makeObjective({ id: 'o2', deadline: '2026-10-21' }));
    planner.addActivity(
      makeActivity({ id: 'a2', objectiveId: 'o2', executionPlan: makePlan('p-a2') }),
      makeSessions('p-a2', ['2026-10-20']),
    );
    expect(planner.objectives().find(o => o.id === 'o2')?.status).toBe(ObjectiveStatus.CLOSED);
  }
  const objective2 = () => planner.objectives().find(o => o.id === 'o2');

  it('pausar y reanudar según tenga una pausa propia abierta (RN-57)', () => {
    actions.togglePause('activity', 'a1', false);
    expect(planner.activities()[0].status).toBe(ActivityStatus.PAUSED);
    actions.togglePause('activity', 'a1', true);
    expect(planner.activities()[0].status).toBe(ActivityStatus.OPEN);
  });

  it('cerrar pide confirmación y no cierra si se cancela', async () => {
    const cancelled = actions.close('activity', 'a1', 'Correr');
    expect(dialog.state()?.title).toBe('Cerrar tarea');
    await answer(false);
    expect(await cancelled).toBe(false);
    expect(planner.activities()[0].status).toBe(ActivityStatus.OPEN);

    const confirmed = actions.close('activity', 'a1', 'Correr');
    await answer(true);
    expect(await confirmed).toBe(true);
    expect(planner.activities()[0]).toMatchObject({ status: ActivityStatus.CLOSED, progress: 0 });
  });

  it('reabrir algo vigente solo confirma', async () => {
    planner.closeActivity('a1');
    const reopened = actions.reopen('activity', 'a1', 'Correr');
    await answer(true);
    expect(await reopened).toBe(true);
    expect(planner.activities()[0].status).toBe(ActivityStatus.OPEN);
  });

  it('reabrir lo vencido pide un deadline nuevo y lo reintenta si no vale (RN-64)', async () => {
    seedExpiredObjective();

    const reopened = actions.reopen('objective', 'o2', 'Objetivo');
    await answer(true); // confirmar
    await answer(true, '2026-10-01'); // fecha anterior a hoy: inválida
    await Promise.resolve();
    expect(dialog.state()?.title).toBe('Fecha no válida');
    dialog.close(true);
    await answer(true, '2026-11-30');

    expect(await reopened).toBe(true);
    expect(objective2()).toMatchObject({ status: ObjectiveStatus.OPEN, deadline: '2026-11-30' });
  });

  it('cancelar la fecha nueva deja todo cerrado', async () => {
    seedExpiredObjective();
    const reopened = actions.reopen('objective', 'o2', 'Objetivo');
    await answer(true);
    await answer(false);

    expect(await reopened).toBe(false);
    expect(objective2()?.status).toBe(ObjectiveStatus.CLOSED);
  });
});

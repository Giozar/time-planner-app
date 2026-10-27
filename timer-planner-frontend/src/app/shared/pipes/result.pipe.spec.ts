import { TestBed } from '@angular/core/testing';
import { DataProvider } from '../../core/providers/data.provider';
import { PlannerService } from '../../core/services/planner.service';
import { InMemoryDataProvider } from '../../testing/in-memory-data.provider';
import { makeActivity, makeGoal, makeObjective, makePlan, makeSessions } from '../../testing/builders';
import { ResultPipe } from './result.pipe';

describe('ResultPipe (RN-84, RN-85)', () => {
  let planner: PlannerService;
  let pipe: ResultPipe;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-22T12:00:00'));
    TestBed.configureTestingModule({ providers: [{ provide: DataProvider, useValue: new InMemoryDataProvider() }] });
    planner = TestBed.inject(PlannerService);
    pipe = TestBed.runInInjectionContext(() => new ResultPipe());
  });

  afterEach(() => vi.useRealTimers());

  it('usa el género de cada nivel', () => {
    expect(pipe.transform({ id: 'x', progress: 100 }, 'goal')).toBe('Completa');
    expect(pipe.transform({ id: 'x', progress: 40 }, 'objective')).toBe('Incompleto');
    expect(pipe.transform({ id: 'x', progress: 40 }, 'activity')).toBe('Incompleta');
    expect(pipe.transform({ id: 'x', progress: 100 }, 'step')).toBe('Completo');
  });

  it('agrega «Vencida» cuando pasó su fecha sin hacer nada', () => {
    planner.addGoal(makeGoal());
    planner.addObjective(makeObjective({ deadline: '2026-10-21' }));
    planner.addActivity(makeActivity({ executionPlan: makePlan('p1') }), makeSessions('p1', ['2026-10-20']));

    expect(pipe.transform(planner.activities()[0], 'activity')).toBe('Incompleta · Vencida');
    expect(pipe.transform(planner.objectives()[0], 'objective')).toBe('Incompleto · Vencido');
  });
});

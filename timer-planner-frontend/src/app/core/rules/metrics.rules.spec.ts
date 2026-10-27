import { MetricInput, computeLevelMetrics } from './metrics.rules';

const item = (overrides: Partial<MetricInput> = {}): MetricInput => ({
  progress: 0, closed: false, overdue: false, consistency: null, productivity: null, ...overrides,
});

describe('computeLevelMetrics (RN-86)', () => {
  it('el ejemplo de las reglas: de 5 metas, 2 completas, 3 incompletas, 4 cerradas y 1 vencida', () => {
    const goals = [
      item({ progress: 100, closed: true }),
      item({ progress: 100, closed: true }),
      item({ progress: 40, closed: true }),
      item({ progress: 0, closed: true, overdue: true }),
      item({ progress: 10 }),
    ];
    expect(computeLevelMetrics(goals)).toMatchObject({ total: 5, complete: 2, incomplete: 3, closed: 4, overdue: 1 });
  });

  it('promedia constancia y productividad solo entre los que tienen dato', () => {
    const metrics = computeLevelMetrics([
      item({ consistency: 50, productivity: 100 }),
      item({ consistency: 25, productivity: null }),
      item({ consistency: null, productivity: 40 }),
    ]);
    expect(metrics).toMatchObject({ consistency: 38, productivity: 70 });
  });

  it('sin elementos o sin datos, los promedios no tienen dato', () => {
    expect(computeLevelMetrics([])).toEqual({
      total: 0, complete: 0, incomplete: 0, closed: 0, overdue: 0, consistency: null, productivity: null,
    });
    expect(computeLevelMetrics([item()]).consistency).toBeNull();
  });
});

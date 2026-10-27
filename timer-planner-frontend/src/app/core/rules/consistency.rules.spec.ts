import { makeSessions } from '../../testing/builders';
import { computeConsistency } from './consistency.rules';

describe('consistency.rules', () => {
  describe('computeConsistency (RN-70)', () => {
    it('el ejemplo de las reglas: 1 de 4 lunes realizados es 25 %', () => {
      const all = makeSessions('p', ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'], ['2026-10-19']);
      expect(computeConsistency(all)).toBe(25);
    });

    it('cuenta todas las sesiones, también las futuras', () => {
      expect(computeConsistency(makeSessions('p', ['2026-10-20', '2026-11-01'], ['2026-10-20']))).toBe(50);
      expect(computeConsistency(makeSessions('p', ['2026-11-01']))).toBe(0);
    });

    it('es null sin sesiones', () => {
      expect(computeConsistency([])).toBeNull();
    });

    it('agrega sesiones de varios ítems sin promediar porcentajes (RN-35)', () => {
      const a = makeSessions('a', ['2026-10-01'], ['2026-10-01']);
      const b = makeSessions('b', ['2026-10-02', '2026-10-03', '2026-10-04']);
      expect(computeConsistency([...a, ...b])).toBe(25);
    });

    it('no depende del tiempo realizado', () => {
      const [session] = makeSessions('p', ['2026-10-01'], ['2026-10-01'], 60);
      expect(computeConsistency([{ ...session, actualMinutes: 5 }])).toBe(100);
    });
  });
});

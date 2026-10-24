import { makeSessions } from '../../testing/builders';
import { computeProductivity, computeProgress } from './progress.rules';

describe('progress.rules', () => {
  describe('computeProgress (RN-30)', () => {
    it('es sesiones realizadas / sesiones del plan, redondeado', () => {
      expect(computeProgress(makeSessions('p', ['a', 'b', 'c'], ['a']))).toBe(33);
      expect(computeProgress(makeSessions('p', ['a', 'b', 'c'], ['a', 'b']))).toBe(67);
      expect(computeProgress(makeSessions('p', ['a', 'b'], ['a', 'b']))).toBe(100);
    });

    it('es 0 sin sesiones', () => {
      expect(computeProgress([])).toBe(0);
    });

    it('el ejemplo de las reglas: 1 de 4 lunes realizados es 25 %', () => {
      expect(computeProgress(makeSessions('p', ['l1', 'l2', 'l3', 'l4'], ['l2']))).toBe(25);
    });
  });

  describe('avance de los padres (RN-32 a RN-35)', () => {
    it('suma sesiones de sus hijos, no promedia: 1 de 1 y 0 de 9 dan 10 %', () => {
      const a = makeSessions('a', ['d1'], ['d1']);
      const b = makeSessions('b', ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']);
      expect(computeProgress([...a, ...b])).toBe(10);
    });
  });

  describe('computeProductivity (RN-73)', () => {
    it('es minutos reales / previstos, redondeado', () => {
      expect(computeProductivity(90, 240)).toBe(38);
      expect(computeProductivity(300, 300)).toBe(100);
    });

    it('puede pasar de 100 %', () => {
      expect(computeProductivity(120, 100)).toBe(120);
    });

    it('es null sin minutos previstos', () => {
      expect(computeProductivity(30, 0)).toBeNull();
    });
  });
});

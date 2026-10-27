import { makeSessions } from '../../testing/builders';
import { ExecutionSession } from '../models/session.model';
import { computeProductivity, computeProgress, isComplete, isOverdue, sessionProgress } from './progress.rules';

const TODAY = '2026-10-22';

/** Cambia el tiempo realizado de las sesiones hechas, en orden. */
const withActual = (sessions: ExecutionSession[], minutes: number[]): ExecutionSession[] => {
  let i = 0;
  return sessions.map(s => s.actualMinutes === undefined ? s : { ...s, actualMinutes: minutes[i++] });
};

describe('progress.rules', () => {
  describe('computeProgress (RN-30)', () => {
    it('hechas con todo su tiempo, es la proporción de sesiones realizadas', () => {
      expect(computeProgress(makeSessions('p', ['a', 'b', 'c'], ['a']))).toBe(33);
      expect(computeProgress(makeSessions('p', ['a', 'b', 'c'], ['a', 'b']))).toBe(67);
      expect(computeProgress(makeSessions('p', ['a', 'b'], ['a', 'b']))).toBe(100);
    });

    it('promedia constancia y productividad sin redondear las partes', () => {
      // El ejemplo de las reglas: 1 de 4 lunes de 60 min, hecho con 90 → (25 + 37,5) ÷ 2
      const sessions = withActual(makeSessions('p', ['l1', 'l2', 'l3', 'l4'], ['l2'], 60), [90]);
      expect(computeProgress(sessions)).toBe(31);
    });

    it('topa la productividad en 100 %: el tiempo de más no compensa sesiones sin hacer', () => {
      const done = makeSessions('p', ['a', 'b', 'c', 'd'], ['a', 'b', 'c'], 60);
      expect(computeProgress(done)).toBe(75);
      expect(computeProgress(withActual(done, [100, 100, 100]))).toBe(88);
    });

    it('todas hechas con menos tiempo no llega a 100 %', () => {
      const sessions = withActual(makeSessions('p', ['a', 'b'], ['a', 'b'], 60), [60, 30]);
      expect(computeProgress(sessions)).toBe(88);
    });

    it('es 0 sin sesiones', () => {
      expect(computeProgress([])).toBe(0);
    });
  });

  describe('avance de los padres (RN-32 a RN-35)', () => {
    it('suma sesiones de sus hijos, no promedia: 1 de 1 y 0 de 9 dan 10 %', () => {
      const a = makeSessions('a', ['d1'], ['d1']);
      const b = makeSessions('b', ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']);
      expect(computeProgress([...a, ...b])).toBe(10);
    });
  });

  describe('sessionProgress (RN-69)', () => {
    it('0 % si no se hizo; si se hizo, promedio de 100 % y su productividad', () => {
      const [planned] = makeSessions('p', ['a'], [], 45);
      const [done] = makeSessions('p', ['a'], ['a'], 45);
      expect(sessionProgress(planned)).toBe(0);
      expect(sessionProgress(done)).toBe(100);
      expect(sessionProgress({ ...done, actualMinutes: 30 })).toBe(83);
      expect(sessionProgress({ ...done, actualMinutes: 90 })).toBe(100);
    });
  });

  describe('computeProductivity (RN-73)', () => {
    it('es tiempo realizado / previsto, redondeado', () => {
      expect(computeProductivity(90, 240)).toBe(38);
      expect(computeProductivity(300, 300)).toBe(100);
    });

    it('puede pasar de 100 %', () => {
      expect(computeProductivity(120, 100)).toBe(120);
    });

    it('es null sin tiempo previsto', () => {
      expect(computeProductivity(30, 0)).toBeNull();
    });
  });

  describe('isComplete (RN-84)', () => {
    it('solo al llegar a 100 %', () => {
      expect(isComplete(100)).toBe(true);
      expect(isComplete(99)).toBe(false);
    });
  });

  describe('isOverdue (RN-85)', () => {
    it('pasó su deadline con 0 %', () => {
      expect(isOverdue('2026-10-21', 0, TODAY)).toBe(true);
    });

    it('no vence si se hizo algo, si su deadline no ha pasado o si no tiene', () => {
      expect(isOverdue('2026-10-21', 40, TODAY)).toBe(false);
      expect(isOverdue(TODAY, 0, TODAY)).toBe(false);
      expect(isOverdue(undefined, 0, TODAY)).toBe(false);
      expect(isOverdue(null, 0, TODAY)).toBe(false);
    });
  });
});

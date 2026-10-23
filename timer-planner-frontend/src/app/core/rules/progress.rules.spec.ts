import { ActivityStatus, SubActivityStatus } from '../models/activity.model';
import { makeSessions } from '../../testing/builders';
import { averageProgress, computeProgress, deriveStatus, deriveSubActivityStatus } from './progress.rules';

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

  describe('averageProgress (RN-32 a RN-35)', () => {
    it('es el promedio simple redondeado', () => {
      expect(averageProgress([100, 0])).toBe(50);
      expect(averageProgress([100, 50, 0])).toBe(50);
      expect(averageProgress([33, 33, 34])).toBe(33);
    });

    it('es 0 si no hay hijos', () => {
      expect(averageProgress([])).toBe(0);
    });
  });

  describe('deriveStatus (RN-31, RN-32)', () => {
    it('deriva del progreso', () => {
      expect(deriveStatus(0)).toBe(ActivityStatus.PENDING);
      expect(deriveStatus(40)).toBe(ActivityStatus.IN_PROGRESS);
      expect(deriveStatus(100)).toBe(ActivityStatus.COMPLETED);
    });

    it('conserva PAUSED (RN-59) y nunca devuelve OVERDUE (RN-58)', () => {
      expect(deriveStatus(50, ActivityStatus.PAUSED)).toBe(ActivityStatus.PAUSED);
      expect(deriveStatus(50, ActivityStatus.OVERDUE)).toBe(ActivityStatus.IN_PROGRESS);
    });
  });

  describe('deriveSubActivityStatus (RN-31)', () => {
    it('deriva del progreso', () => {
      expect(deriveSubActivityStatus(0)).toBe(SubActivityStatus.PENDING);
      expect(deriveSubActivityStatus(1)).toBe(SubActivityStatus.IN_PROGRESS);
      expect(deriveSubActivityStatus(100)).toBe(SubActivityStatus.COMPLETED);
    });
  });
});

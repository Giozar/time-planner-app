import { ClosureType } from '../models/activity.model';
import { GoalStatus } from '../models/goal.model';
import { ObjectiveStatus } from '../models/objective.model';
import { makeSessions } from '../../testing/builders';
import {
  autoClosure, closedProgress, deriveGoalStatus, deriveObjectiveStatus, isClosed, isCoveredByClosure,
} from './closure.rules';

const TODAY = '2026-10-22';
const manual = { type: ClosureType.MANUAL, closedOn: '2026-10-25' };
const automatic = { type: ClosureType.AUTOMATIC, closedOn: '2026-10-22' };

describe('closure.rules', () => {
  describe('isClosed (RN-77)', () => {
    it('completado y vencido están cerrados; lo demás no', () => {
      expect(isClosed({ status: 'COMPLETED' })).toBe(true);
      expect(isClosed({ status: 'OVERDUE' })).toBe(true);
      expect(isClosed({ status: 'IN_PROGRESS' })).toBe(false);
      expect(isClosed({ status: 'PAUSED' })).toBe(false);
    });
  });

  describe('autoClosure (RN-77)', () => {
    it('cierra al día siguiente del deadline con el avance que tenga', () => {
      expect(autoClosure(undefined, 50, '2026-10-21', TODAY)).toEqual(automatic);
    });

    it('no cierra el mismo día del deadline, al 100 % ni lo ya cerrado', () => {
      expect(autoClosure(undefined, 50, TODAY, TODAY)).toBeUndefined();
      expect(autoClosure(undefined, 100, '2026-10-21', TODAY)).toBeUndefined();
      expect(autoClosure(manual, 50, '2026-10-21', TODAY)).toBe(manual);
    });
  });

  describe('closedProgress (RN-79)', () => {
    it('el cierre manual deja 100 %; el automático conserva el avance', () => {
      expect(closedProgress(75, manual)).toBe(100);
      expect(closedProgress(75, automatic)).toBe(75);
      expect(closedProgress(75, undefined)).toBe(75);
    });
  });

  describe('isCoveredByClosure (RN-79)', () => {
    it('cubre las sesiones no realizadas posteriores al cierre manual', () => {
      const [before, onDay, after, afterDone] = [
        ...makeSessions('p', ['2026-10-19', '2026-10-25', '2026-10-26']),
        ...makeSessions('q', ['2026-10-27'], ['2026-10-27']),
      ];
      expect(isCoveredByClosure(before, manual)).toBe(false);
      expect(isCoveredByClosure(onDay, manual)).toBe(false);
      expect(isCoveredByClosure(after, manual)).toBe(true);
      expect(isCoveredByClosure(afterDone, manual)).toBe(false);
      expect(isCoveredByClosure(after, { ...automatic, closedOn: '2026-10-20' })).toBe(false);
    });
  });

  describe('deriveObjectiveStatus (RN-78)', () => {
    it('se cierra cuando todas sus tareas están cerradas: completado al 100 % y vencido si no', () => {
      expect(deriveObjectiveStatus(ObjectiveStatus.ACTIVE, 100, [{ status: 'COMPLETED' }])).toBe(ObjectiveStatus.COMPLETED);
      expect(deriveObjectiveStatus(ObjectiveStatus.ACTIVE, 60, [{ status: 'COMPLETED' }, { status: 'OVERDUE' }]))
        .toBe(ObjectiveStatus.OVERDUE);
    });

    it('se reabre con una tarea abierta y sin tareas no se cierra', () => {
      expect(deriveObjectiveStatus(ObjectiveStatus.COMPLETED, 50, [{ status: 'COMPLETED' }, { status: 'PENDING' }]))
        .toBe(ObjectiveStatus.ACTIVE);
      expect(deriveObjectiveStatus(ObjectiveStatus.COMPLETED, 0, [])).toBe(ObjectiveStatus.ACTIVE);
    });
  });

  describe('deriveGoalStatus (RN-78)', () => {
    it('una meta activa queda finalizada con todos sus objetivos cerrados y se reabre con uno abierto', () => {
      expect(deriveGoalStatus(GoalStatus.ACTIVE, [{ status: 'COMPLETED' }, { status: 'OVERDUE' }])).toBe(GoalStatus.FINISHED);
      expect(deriveGoalStatus(GoalStatus.FINISHED, [{ status: 'COMPLETED' }, { status: 'ACTIVE' }])).toBe(GoalStatus.ACTIVE);
      expect(deriveGoalStatus(GoalStatus.ACTIVE, [])).toBe(GoalStatus.ACTIVE);
    });

    it('no cambia ideas ni metas pausadas', () => {
      expect(deriveGoalStatus(GoalStatus.PAUSED, [{ status: 'COMPLETED' }])).toBe(GoalStatus.PAUSED);
      expect(deriveGoalStatus(GoalStatus.IDEA, [{ status: 'COMPLETED' }])).toBe(GoalStatus.IDEA);
    });
  });
});

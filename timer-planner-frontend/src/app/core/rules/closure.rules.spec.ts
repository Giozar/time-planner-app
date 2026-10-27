import { ActivityStatus, ClosureType } from '../models/activity.model';
import { GoalStatus } from '../models/goal.model';
import { makeSessions } from '../../testing/builders';
import {
  completedClosure, deadlineClosure, deriveStatus, hasOpenPause, isClosed, isEffectivelyPaused, isHiddenByClosure,
  reopensWithParent,
} from './closure.rules';

const TODAY = '2026-10-22';
const manual = { type: ClosureType.MANUAL, closedOn: '2026-10-25' };

describe('closure.rules', () => {
  describe('isClosed (RN-31)', () => {
    it('solo CLOSED está cerrado', () => {
      expect(isClosed({ status: 'CLOSED' })).toBe(true);
      expect(isClosed({ status: 'OPEN' })).toBe(false);
      expect(isClosed({ status: 'PAUSED' })).toBe(false);
    });
  });

  describe('deriveStatus (RN-31)', () => {
    it('cerrado si tiene cierre, aunque esté pausado; si no, pausado o abierto', () => {
      expect(deriveStatus(manual, true, ActivityStatus)).toBe(ActivityStatus.CLOSED);
      expect(deriveStatus(undefined, true, ActivityStatus)).toBe(ActivityStatus.PAUSED);
      expect(deriveStatus(undefined, false, ActivityStatus)).toBe(ActivityStatus.OPEN);
    });

    it('usa los valores del nivel que se le pasa', () => {
      expect(deriveStatus(undefined, false, GoalStatus)).toBe(GoalStatus.OPEN);
    });
  });

  describe('pausa efectiva (RN-57)', () => {
    it('una pausa abierta del ítem o de un padre lo pausa; una terminada no', () => {
      const ended = [{ from: '2026-10-01', to: '2026-10-05' }];
      const open = [{ from: '2026-10-10' }];
      expect(hasOpenPause(ended)).toBe(false);
      expect(hasOpenPause(open)).toBe(true);
      expect(isEffectivelyPaused([undefined, ended, open])).toBe(true);
      expect(isEffectivelyPaused([undefined, ended])).toBe(false);
    });

    it('pausar la tarea, pausar y reanudar la meta deja la tarea pausada', () => {
      const task = [{ from: '2026-10-10' }];
      const goal = [{ from: '2026-10-12', to: '2026-10-14' }];
      expect(isEffectivelyPaused([goal, task])).toBe(true);
    });
  });

  describe('deadlineClosure (RN-58, RN-77)', () => {
    it('cierra al día siguiente del deadline, aunque esté al 100 %', () => {
      expect(deadlineClosure(undefined, '2026-10-21', TODAY)).toEqual({ type: ClosureType.DEADLINE, closedOn: TODAY });
    });

    it('no cierra el mismo día del deadline ni cambia un cierre existente', () => {
      expect(deadlineClosure(undefined, TODAY, TODAY)).toBeUndefined();
      expect(deadlineClosure(manual, '2026-10-01', TODAY)).toBe(manual);
    });
  });

  describe('completedClosure (RN-77)', () => {
    it('llegar a 100 % lo cierra al completarse', () => {
      expect(completedClosure(undefined, 75, 100, TODAY)).toEqual({ type: ClosureType.COMPLETED, closedOn: TODAY });
    });

    it('no vuelve a cerrar lo que ya estaba al 100 % (reabierto a mano)', () => {
      expect(completedClosure(undefined, 100, 100, TODAY)).toBeUndefined();
    });

    it('bajar de 100 % deshace solo el cierre al completarse', () => {
      const done = { type: ClosureType.COMPLETED, closedOn: '2026-10-20' };
      expect(completedClosure(done, 100, 75, TODAY)).toBeUndefined();
      expect(completedClosure(manual, 100, 75, TODAY)).toBe(manual);
      const deadline = { type: ClosureType.DEADLINE, closedOn: '2026-10-20' };
      expect(completedClosure(deadline, 100, 75, TODAY)).toBe(deadline);
    });
  });

  describe('reopensWithParent (RN-64)', () => {
    it('se reabre si sigue dentro de su deadline y está incompleto', () => {
      expect(reopensWithParent(TODAY, 50, TODAY)).toBe(true);
      expect(reopensWithParent('2026-10-21', 50, TODAY)).toBe(false);
      expect(reopensWithParent('2026-12-01', 100, TODAY)).toBe(false);
    });
  });

  describe('isHiddenByClosure (RN-79)', () => {
    it('oculta las no realizadas desde el día del cierre, incluido; nunca las realizadas', () => {
      const [before, onDay, after] = makeSessions('p', ['2026-10-19', '2026-10-25', '2026-10-26']);
      const [afterDone] = makeSessions('q', ['2026-10-27'], ['2026-10-27']);
      expect(isHiddenByClosure(before, manual)).toBe(false);
      expect(isHiddenByClosure(onDay, manual)).toBe(true);
      expect(isHiddenByClosure(after, manual)).toBe(true);
      expect(isHiddenByClosure(afterDone, manual)).toBe(false);
      expect(isHiddenByClosure(after, undefined)).toBe(false);
    });
  });
});

import { ActivityStatus } from '../models/activity.model';
import { ObjectiveStatus } from '../models/objective.model';
import { canCloseObjective, isOverdue, reopenIfBelowComplete } from './objective.rules';

describe('objective.rules', () => {
  describe('isOverdue (RN-58)', () => {
    it('es vencida si no está completada y su deadline efectivo ya pasó', () => {
      expect(isOverdue({ status: ActivityStatus.PENDING }, '2026-10-21', '2026-10-22')).toBe(true);
      expect(isOverdue({ status: ActivityStatus.PAUSED }, '2026-10-21', '2026-10-22')).toBe(true);
    });

    it('no vence el mismo día del deadline ni si está completada', () => {
      expect(isOverdue({ status: ActivityStatus.PENDING }, '2026-10-22', '2026-10-22')).toBe(false);
      expect(isOverdue({ status: ActivityStatus.COMPLETED }, '2026-10-21', '2026-10-22')).toBe(false);
    });
  });

  describe('canCloseObjective (RN-63)', () => {
    it('solo con estado ACTIVE y progreso 100', () => {
      expect(canCloseObjective({ status: ObjectiveStatus.ACTIVE, progress: 100 })).toBe(true);
      expect(canCloseObjective({ status: ObjectiveStatus.ACTIVE, progress: 99 })).toBe(false);
      expect(canCloseObjective({ status: ObjectiveStatus.COMPLETED, progress: 100 })).toBe(false);
      expect(canCloseObjective({ status: ObjectiveStatus.PAUSED, progress: 100 })).toBe(false);
    });
  });

  describe('reopenIfBelowComplete (RN-64)', () => {
    it('reabre un objetivo COMPLETED que bajó de 100', () => {
      expect(reopenIfBelowComplete({ status: ObjectiveStatus.COMPLETED, progress: 80 })).toBe(ObjectiveStatus.ACTIVE);
    });

    it('no cambia un COMPLETED al 100 ni los demás estados (RN-63: llegar a 100 no cierra)', () => {
      expect(reopenIfBelowComplete({ status: ObjectiveStatus.COMPLETED, progress: 100 })).toBe(ObjectiveStatus.COMPLETED);
      expect(reopenIfBelowComplete({ status: ObjectiveStatus.ACTIVE, progress: 100 })).toBe(ObjectiveStatus.ACTIVE);
      expect(reopenIfBelowComplete({ status: ObjectiveStatus.PAUSED, progress: 10 })).toBe(ObjectiveStatus.PAUSED);
    });
  });
});

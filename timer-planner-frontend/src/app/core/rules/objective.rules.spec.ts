import { ActivityStatus } from '../models/activity.model';
import { isOverdue } from './objective.rules';

describe('objective.rules', () => {
  describe('isOverdue (RN-58)', () => {
    it('es vencida si no está completada y su deadline efectivo ya pasó', () => {
      expect(isOverdue({ status: ActivityStatus.PENDING }, '2026-10-21', '2026-10-22')).toBe(true);
      expect(isOverdue({ status: ActivityStatus.OVERDUE }, '2026-10-21', '2026-10-22')).toBe(true);
    });

    it('no vence el mismo día del deadline ni si está completada', () => {
      expect(isOverdue({ status: ActivityStatus.PENDING }, '2026-10-22', '2026-10-22')).toBe(false);
      expect(isOverdue({ status: ActivityStatus.COMPLETED }, '2026-10-21', '2026-10-22')).toBe(false);
    });
  });
});

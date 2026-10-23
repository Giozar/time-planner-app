import { WeekDay } from '../models/activity.model';
import { addDays, generateDatesFromPattern, isFutureDate, isValidISODate, weekDayOf } from './calendar.rules';

describe('calendar.rules', () => {
  describe('isFutureDate', () => {
    it('compara fechas calendario, incluso cruzando mes y año', () => {
      expect(isFutureDate('2026-10-23', '2026-10-22')).toBe(true);
      expect(isFutureDate('2027-01-01', '2026-12-31')).toBe(true);
      expect(isFutureDate('2026-10-22', '2026-10-22')).toBe(false);
      expect(isFutureDate('2026-09-30', '2026-10-01')).toBe(false);
    });
  });

  describe('weekDayOf', () => {
    it('calcula el día de la semana sin depender de la zona horaria', () => {
      expect(weekDayOf('2026-10-19')).toBe(WeekDay.MONDAY);
      expect(weekDayOf('2026-10-22')).toBe(WeekDay.THURSDAY);
      expect(weekDayOf('2026-10-25')).toBe(WeekDay.SUNDAY);
      expect(weekDayOf('1970-01-01')).toBe(WeekDay.THURSDAY);
    });
  });

  describe('addDays', () => {
    it('cruza meses, años y años bisiestos', () => {
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
      expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
      expect(addDays('2026-10-22', 0)).toBe('2026-10-22');
    });
  });

  describe('isValidISODate', () => {
    it('acepta fechas reales y rechaza el resto', () => {
      expect(isValidISODate('2026-02-28')).toBe(true);
      expect(isValidISODate('2028-02-29')).toBe(true);
      expect(isValidISODate('2026-02-29')).toBe(false);
      expect(isValidISODate('2026-02-30')).toBe(false);
      expect(isValidISODate('2026-13-01')).toBe(false);
      expect(isValidISODate('22/10/2026')).toBe(false);
    });

    it('lanza error al operar con una cadena inválida', () => {
      expect(() => addDays('no-es-fecha', 1)).toThrow();
    });
  });

  describe('generateDatesFromPattern (RN-21)', () => {
    it('incluye el inicio y el deadline, y solo los días elegidos', () => {
      const dates = generateDatesFromPattern('2026-10-19', '2026-11-02', [WeekDay.MONDAY]);
      expect(dates).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
    });

    it('no incluye el día anterior al inicio ni excluye el deadline', () => {
      const dates = generateDatesFromPattern('2026-10-17', '2026-10-24', [
        WeekDay.SATURDAY, WeekDay.SUNDAY, WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY,
        WeekDay.THURSDAY, WeekDay.FRIDAY,
      ]);
      expect(dates[0]).toBe('2026-10-17');
      expect(dates[dates.length - 1]).toBe('2026-10-24');
      expect(dates).toHaveLength(8);
    });

    it('devuelve varios días ordenados', () => {
      const dates = generateDatesFromPattern('2026-10-19', '2026-10-25', [WeekDay.FRIDAY, WeekDay.MONDAY]);
      expect(dates).toEqual(['2026-10-19', '2026-10-23']);
    });

    it('devuelve vacío si el inicio es posterior al fin o no hay días', () => {
      expect(generateDatesFromPattern('2026-10-25', '2026-10-19', [WeekDay.MONDAY])).toEqual([]);
      expect(generateDatesFromPattern('2026-10-19', '2026-10-25', [])).toEqual([]);
    });

    it('cuenta bien los días de un mes completo', () => {
      expect(generateDatesFromPattern('2026-03-01', '2026-03-31', [WeekDay.SUNDAY])).toHaveLength(5);
    });
  });
});

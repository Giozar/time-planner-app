import { buildMonthGrid, daysInMonth, shiftMonth, shiftYear } from './calendar-view.rules';

describe('calendar-view.rules (RN-66)', () => {
  describe('daysInMonth', () => {
    it('respeta meses de 28, 29, 30 y 31 días', () => {
      expect(daysInMonth(2026, 2)).toBe(28);
      expect(daysInMonth(2028, 2)).toBe(29);
      expect(daysInMonth(2100, 2)).toBe(28);
      expect(daysInMonth(2000, 2)).toBe(29);
      expect(daysInMonth(2026, 4)).toBe(30);
      expect(daysInMonth(2026, 12)).toBe(31);
    });
  });

  describe('buildMonthGrid', () => {
    it('siempre tiene 42 celdas', () => {
      for (const [year, month] of [[2026, 2], [2026, 10], [2028, 2], [2026, 3]]) {
        expect(buildMonthGrid(year, month)).toHaveLength(42);
      }
    });

    it('empieza en lunes: octubre 2026 (1.º es jueves) arranca el 28 de septiembre', () => {
      const grid = buildMonthGrid(2026, 10);
      expect(grid[0]).toEqual({ date: '2026-09-28', inMonth: false });
      expect(grid[3]).toEqual({ date: '2026-10-01', inMonth: true });
      expect(grid[41].date).toBe('2026-11-08');
    });

    it('un mes que empieza en domingo lo coloca en la última columna', () => {
      expect(buildMonthGrid(2026, 3)[6]).toEqual({ date: '2026-03-01', inMonth: true });
    });

    it('un mes que empieza en lunes no tiene relleno previo', () => {
      expect(buildMonthGrid(2025, 9)[0]).toEqual({ date: '2025-09-01', inMonth: true });
    });

    it('marca como del mes exactamente sus días', () => {
      expect(buildMonthGrid(2026, 10).filter(c => c.inMonth)).toHaveLength(31);
      expect(buildMonthGrid(2028, 2).filter(c => c.inMonth)).toHaveLength(29);
    });

    it('diciembre incluye días de enero del año siguiente como relleno', () => {
      const grid = buildMonthGrid(2026, 12);
      expect(grid.some(c => c.date === '2027-01-01' && !c.inMonth)).toBe(true);
    });
  });

  describe('shiftMonth', () => {
    it('cruza de año en ambos sentidos', () => {
      expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
      expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    });

    it('acepta saltos de varios meses y delta 0', () => {
      expect(shiftMonth(2026, 10, -22)).toEqual({ year: 2024, month: 12 });
      expect(shiftMonth(2026, 10, 15)).toEqual({ year: 2028, month: 1 });
      expect(shiftMonth(2026, 3, 0)).toEqual({ year: 2026, month: 3 });
    });
  });

  describe('shiftYear', () => {
    it('mueve solo el año', () => {
      expect(shiftYear(2026, 10, -3)).toEqual({ year: 2023, month: 10 });
      expect(shiftYear(2026, 2, 5)).toEqual({ year: 2031, month: 2 });
    });
  });
});

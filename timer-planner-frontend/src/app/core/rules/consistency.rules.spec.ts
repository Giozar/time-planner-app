import { makeSessions } from '../../testing/builders';
import { ConsistencyEntry, computeConsistency, endPause, isPausedOn, startPause } from './consistency.rules';

const TODAY = '2026-10-22';
const entries = (dates: string[], done: string[] = [], pauses: ConsistencyEntry['pauses'] = []): ConsistencyEntry[] =>
  makeSessions('p', dates, done).map(session => ({ session, pauses }));

describe('consistency.rules', () => {
  describe('computeConsistency (RN-70)', () => {
    it('el ejemplo de las reglas: 1 de 2 sesiones exigibles es 50 %', () => {
      const all = entries(['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'], ['2026-10-19']);
      expect(computeConsistency(all, TODAY, false)).toBe(50);
    });

    it('es null si no hay sesiones exigibles', () => {
      expect(computeConsistency([], TODAY, false)).toBeNull();
      expect(computeConsistency(entries(['2026-10-30']), TODAY, false)).toBeNull();
    });

    it('la PLANNED de hoy solo cuenta al cerrar el día', () => {
      const all = entries(['2026-10-21', TODAY], ['2026-10-21']);
      expect(computeConsistency(all, TODAY, false)).toBe(100);
      expect(computeConsistency(all, TODAY, true)).toBe(50);
    });

    it('una DONE de hoy cuenta aunque el día siga abierto', () => {
      expect(computeConsistency(entries([TODAY], [TODAY]), TODAY, false)).toBe(100);
    });

    it('excluye las sesiones futuras', () => {
      expect(computeConsistency(entries(['2026-10-20', '2026-11-01'], ['2026-10-20']), TODAY, false)).toBe(100);
    });

    it('no cuenta las PLANNED de fechas con pausa, pero sí las DONE', () => {
      const pauses = [{ from: '2026-10-10', to: '2026-10-15' }];
      const all = entries(['2026-10-05', '2026-10-12', '2026-10-14', '2026-10-19'], ['2026-10-14'], pauses);
      // 10-05 no realizada, 10-12 pausada (no cuenta), 10-14 DONE, 10-19 no realizada → 1 de 3
      expect(computeConsistency(all, TODAY, false)).toBe(33);
    });

    it('agrega sesiones de varios ítems sin promediar porcentajes', () => {
      const a = entries(['2026-10-01'], ['2026-10-01']);
      const b = entries(['2026-10-02', '2026-10-03', '2026-10-04'], []);
      expect(computeConsistency([...a, ...b], TODAY, false)).toBe(25);
    });
  });

  describe('pausas', () => {
    it('un periodo abierto cubre desde su inicio en adelante', () => {
      expect(isPausedOn([{ from: '2026-10-10' }], '2026-10-09')).toBe(false);
      expect(isPausedOn([{ from: '2026-10-10' }], '2026-12-01')).toBe(true);
    });

    it('pausar abre un periodo y no duplica uno abierto', () => {
      const once = startPause(undefined, TODAY);
      expect(once).toEqual([{ from: TODAY }]);
      expect(startPause(once, '2026-10-25')).toEqual([{ from: TODAY }]);
    });

    it('reanudar cierra el periodo el día anterior', () => {
      expect(endPause([{ from: '2026-10-10' }], TODAY)).toEqual([{ from: '2026-10-10', to: '2026-10-21' }]);
    });

    it('pausar y reanudar el mismo día no deja periodo', () => {
      expect(endPause([{ from: TODAY }], TODAY)).toEqual([]);
    });
  });
});

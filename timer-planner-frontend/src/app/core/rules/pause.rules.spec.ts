import { endPause, startPause } from './pause.rules';

const TODAY = '2026-10-22';

describe('pause.rules (RN-57)', () => {
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

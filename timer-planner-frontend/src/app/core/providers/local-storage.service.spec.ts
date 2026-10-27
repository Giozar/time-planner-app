import { makeActivity, makeSessions } from '../../testing/builders';
import { ClosureType, ItemClosure } from '../models/activity.model';
import { SessionStatus } from '../models/session.model';
import { closureFromV3, sessionsFromV3 } from './local-storage.service';

describe('migración de la versión 3 (RN-71, RN-77)', () => {
  it('los minutos de los bloques ligados pasan al tiempo realizado de su sesión', () => {
    const [done, planned] = makeSessions('p', ['2026-10-10', '2026-10-11'], ['2026-10-10'], 30)
      .map(({ actualMinutes, ...session }) => session);
    const logs = [
      { sessionId: done.id, minutes: 20 },
      { sessionId: done.id, minutes: 25 },
      { minutes: 60 }, // sin sesión: se descarta
    ];

    const [migratedDone, migratedPlanned] = sessionsFromV3([done, planned], logs);
    expect(migratedDone).toMatchObject({ status: SessionStatus.DONE, actualMinutes: 45 });
    expect(migratedPlanned.actualMinutes).toBeUndefined();
  });

  it('una sesión hecha sin bloques toma su tiempo previsto', () => {
    const [done] = makeSessions('p', ['2026-10-10'], ['2026-10-10'], 30).map(({ actualMinutes, ...session }) => session);
    expect(sessionsFromV3([done], [])[0].actualMinutes).toBe(30);
  });

  it('el cierre por sesiones completas pasa a ser al completarse; los demás no cambian', () => {
    const legacy = { type: 'SESSIONS_DONE', closedOn: '2026-10-20' } as unknown as ItemClosure;
    expect(closureFromV3(makeActivity({ closure: legacy })).closure).toEqual({ type: ClosureType.COMPLETED, closedOn: '2026-10-20' });

    const manual = { type: ClosureType.MANUAL, closedOn: '2026-10-20' };
    expect(closureFromV3(makeActivity({ closure: manual })).closure).toBe(manual);
    expect(closureFromV3(makeActivity()).closure).toBeUndefined();
  });
});

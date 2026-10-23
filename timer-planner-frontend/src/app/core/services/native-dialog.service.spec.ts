import { NativeDialogService } from './native-dialog.service';
import { DeletableType, DeletionImpact } from '../models/deletion-impact.model';
import { DeadlineConflictKind } from '../rules';

describe('NativeDialogService', () => {
  let dialog: NativeDialogService;
  beforeEach(() => { dialog = new NativeDialogService(); });

  it('confirm se resuelve con el resultado al cerrar', async () => {
    const pending = dialog.confirm('t', 'm');
    expect(dialog.state()?.type).toBe('confirm');
    dialog.close(true);
    expect(await pending).toBe(true);
    expect(dialog.state()).toBeNull();
  });

  it('promptMinutes devuelve los minutos al confirmar y null al cancelar (RN-71)', async () => {
    const ok = dialog.promptMinutes('t', 'm', 30);
    expect(dialog.state()?.numberDefault).toBe(30);
    dialog.close(true, 45);
    expect(await ok).toBe(45);

    const cancelled = dialog.promptMinutes('t', 'm', 30);
    dialog.close(false);
    expect(await cancelled).toBeNull();
  });

  it('confirmDelete exige escribir el título y resume el impacto (RN-62)', async () => {
    const impact: DeletionImpact = { title: 'Mi meta', objectives: 2, activities: 5, steps: 3, completed: 4 };
    const pending = dialog.confirmDelete(DeletableType.GOAL, impact);
    const state = dialog.state()!;

    expect(state.requireText).toBe('Mi meta');
    expect(state.isDanger).toBe(true);
    expect(state.message).toContain('2 objetivo(s)');
    expect(state.message).toContain('5 tarea(s)');
    expect(state.message).toContain('3 paso(s)');
    expect(state.message).toContain('completados que se perderán: 4');
    dialog.close(false);
    expect(await pending).toBe(false);
  });

  it('confirmDelete de un elemento sin hijos no menciona hijos', () => {
    dialog.confirmDelete(DeletableType.STEP, { title: 'Paso', objectives: 0, activities: 0, steps: 0, completed: 0 });
    expect(dialog.state()!.message).not.toContain('También se eliminarán');
    dialog.close(false);
  });

  it('alertDeadlineConflicts lista las fechas en conflicto (RN-49)', () => {
    dialog.alertDeadlineConflicts([
      { kind: DeadlineConflictKind.STEP_DATES, id: 's1', title: 'Paso 1', dates: ['2027-01-02', '2027-01-03'] },
    ]);
    const state = dialog.state()!;
    expect(state.type).toBe('alert');
    expect(state.message).toContain('Paso 1');
    expect(state.message).toContain('2027-01-02, 2027-01-03');
    dialog.close(true);
  });
});

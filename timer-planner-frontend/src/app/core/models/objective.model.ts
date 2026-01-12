export type ObjectiveNature = 'personal' | 'profesional' | 'salud' | 'finanzas' | 'aprendizaje' | 'habito' | 'bienestar' | 'otro';
export type ObjectiveStatus = 'activa' | 'pausada' | 'completada';

export const OBJECTIVE_NATURE_OPTIONS: { value: ObjectiveNature; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'profesional', label: 'Profesional' },
  { value: 'salud', label: 'Salud' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'aprendizaje', label: 'Aprendizaje' },
  { value: 'habito', label: 'Hábito' },
  { value: 'bienestar', label: 'Bienestar' },
  { value: 'otro', label: 'Otro' },
];

export const OBJECTIVE_STATUS_OPTIONS: { value: ObjectiveStatus; label: string }[] = [
  { value: 'activa', label: 'Activa' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'completada', label: 'Completada' },
];

/**
 * Representa un OBJETIVO en el sistema V2.
 * Cuelga de una Goal (Meta).
 */
export interface Objective {
  id: string;
  goalId: string;
  title: string;
  nature: ObjectiveNature;
  progress: number;
  status: ObjectiveStatus;
  createdAt: Date;
}

/** Periodo en que una meta o tarea estuvo pausada, ambos extremos incluidos (RN-70). `to` falta mientras sigue pausada. */
export interface PausePeriod {
  from: string; // 'YYYY-MM-DD'
  to?: string; // 'YYYY-MM-DD'
}

export class DateUtils {
  
  // Obtener fecha actual en formato ISO 'YYYY-MM-DD' (Local)
  static getTodayISO(): string {
    const d = new Date();
    // Ajuste para zona horaria local simple
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];
  }

  // Calcular progreso matemático
  static calculateProgress(totalExecutions: number, completedExecutions: number): number {
    if (totalExecutions <= 0) return 0;
    const pct = Math.round((completedExecutions / totalExecutions) * 100);
    return Math.min(pct, 100); // Nunca más de 100
  }
}
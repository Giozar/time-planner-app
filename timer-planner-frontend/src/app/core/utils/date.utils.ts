export class DateUtils {
  
  // Obtener fecha actual en formato ISO 'YYYY-MM-DD' (Local)
  static getTodayISO(): string {
    const d = new Date();
    // Ajuste para zona horaria local simple
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];
  }
}
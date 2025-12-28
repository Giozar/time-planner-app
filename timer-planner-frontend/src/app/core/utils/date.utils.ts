import { WeekDay } from "../models/activity.model";

export class DateUtils {
  
  // Obtener fecha actual en formato ISO 'YYYY-MM-DD' (Local)
  static getTodayISO(): string {
    const d = new Date();
    // Ajuste para zona horaria local simple
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];
  }

  // Generar lista de fechas desde HOY hasta DEADLINE según días de la semana
  static generateDatesFromPattern(startStr: string, endStr: string, days: WeekDay[]): string[] {
    const dates: string[] = [];
    const start = new Date(startStr); // Ojo: Asegurar que startStr sea YYYY-MM-DD
    const end = new Date(endStr);
    
    // Mapa de JS Day (0=Domingo) a nuestro WeekDay
    const jsDayMap: Record<number, WeekDay> = {
      0: 'D', 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S'
    };

    // Iterar día por día
    const current = new Date(start);
    // Ajustamos horas para evitar problemas de horario de verano/invierno en la iteración
    current.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);

    while (current <= end) {
      const dayOfWeek = jsDayMap[current.getDay()];
      if (days.includes(dayOfWeek)) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  // Calcular progreso matemático
  static calculateProgress(totalExecutions: number, completedExecutions: number): number {
    if (totalExecutions <= 0) return 0;
    const pct = Math.round((completedExecutions / totalExecutions) * 100);
    return Math.min(pct, 100); // Nunca más de 100
  }
}
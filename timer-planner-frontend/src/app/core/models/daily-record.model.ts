export interface DailyRecord {
  id: string;
  date: string;
  plannedItems: number;
  completedItems: number;
  executionPercentage: number;
  plannedTimeMin: number;
  executedTimeMin: number;
  notes?: string;
  createdAt: Date;
}
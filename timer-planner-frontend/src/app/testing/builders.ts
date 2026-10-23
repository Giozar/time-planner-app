import {
  Activity, ActivityComplexity, ActivityCriticality, ActivityPriority, ActivityStatus, ActivityType,
  ExecutionPlan, ExecutionPlanType, SubActivity, SubActivityStatus,
} from '../core/models/activity.model';
import { ExecutionSession, SessionStatus } from '../core/models/session.model';
import { Goal, GoalHorizon, GoalStatus } from '../core/models/goal.model';
import { Objective, ObjectiveNature, ObjectiveStatus } from '../core/models/objective.model';

/** Constructores de datos para pruebas: valores válidos por defecto, sobrescribibles. */

export const makePlan = (id = 'p1', durationPerExecutionMin = 30): ExecutionPlan => ({
  id,
  type: ExecutionPlanType.SPECIFIC_DATES,
  durationPerExecutionMin,
});

/** Sesiones de un plan: una por fecha, `PLANNED` salvo las de `done`. */
export const makeSessions = (planId: string, dates: string[], done: string[] = [], plannedMinutes = 30): ExecutionSession[] =>
  dates.map(scheduledDate => ({
    id: `${planId}-${scheduledDate}`,
    planId,
    scheduledDate,
    plannedMinutes,
    status: done.includes(scheduledDate) ? SessionStatus.DONE : SessionStatus.PLANNED,
    ...(done.includes(scheduledDate) ? { completedAt: `${scheduledDate}T12:00:00.000Z` } : {}),
  }));

export const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  title: 'Meta',
  horizon: GoalHorizon.SHORT_TERM,
  progress: 0,
  status: GoalStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

export const makeObjective = (overrides: Partial<Objective> = {}): Objective => ({
  id: 'o1',
  goalId: 'g1',
  title: 'Objetivo',
  nature: ObjectiveNature.OTHER,
  progress: 0,
  status: ObjectiveStatus.ACTIVE,
  deadline: '2999-01-01',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

export const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'a1',
  objectiveId: 'o1',
  title: 'Tarea',
  type: ActivityType.SIMPLE,
  priority: ActivityPriority.MEDIUM,
  criticality: ActivityCriticality.FLEXIBLE,
  complexity: ActivityComplexity.MEDIUM,
  recurrence: null,
  executionPlan: null,
  progress: 0,
  status: ActivityStatus.PENDING,
  ...overrides,
});

export const makeStep = (overrides: Partial<SubActivity> = {}): SubActivity => ({
  id: 's1',
  activityId: 'a1',
  title: 'Paso',
  complexity: ActivityComplexity.MEDIUM,
  status: SubActivityStatus.PENDING,
  executionPlan: makePlan('p-s1'),
  progress: 0,
  ...overrides,
});

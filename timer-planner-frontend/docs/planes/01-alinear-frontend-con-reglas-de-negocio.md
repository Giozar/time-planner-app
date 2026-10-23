# Plan 01: alinear el frontend con las reglas de negocio

**Estado: ✅ Completado** (Fases 0 a 5). Lo que sigue pendiente está al final.

## Contexto

La app Time Planner (Angular 21, signals, standalone) guardaba todo en `localStorage` y su lógica de negocio vivía en `PlannerService`. Antes de construir el backend se dejó el **frontend funcional** según `../../../docs/analisis-reglas-de-negocio.md` (RN-01 a RN-66, CU-01 a CU-26, bugs B-01 a B-14) y se creó un **agente planificador** en `timer-planner-frontend/Agents/`.

Decisiones del usuario:
- El agente es un archivo Markdown de instrucciones dentro de `Agents/funcionalidad/`.
- El plan se hizo por fases, con todas las reglas del documento.
- Los datos de `localStorage` empezaron de cero (sin migración).
- El agente lee el documento de reglas como referencia de solo lectura. Solo se edita con autorización explícita del usuario.

Fuera de alcance: backend, historial (CU-21), estado `ARCHIVED`, respaldos, autenticación.

## Estado de las fases

| Fase | Alcance | Estado | Commit |
|------|---------|--------|--------|
| Base | Documentación en `docs/` | ✅ Completada | — |
| 0 | Agente planificador | ✅ Completada | — |
| 1 | Modelos, enums y etiquetas | ✅ Completada | `5cfb234` |
| 2 | Motor de reglas puro (`core/rules`) | ✅ Completada | `0b550f4` |
| 3 | Reescribir `PlannerService` | ✅ Completada | `242b792` |
| 4 | Formularios, pantallas y diálogo | ✅ Completada | `0cc1496` |
| 4b | Deadline del objetivo (cambio de regla RN-65) | ✅ Completada | `4322799` |
| 5 | Pruebas y verificación | ✅ Completada | `53081be` |

## Qué se hizo

**Base y Fase 0.** Documentación en `docs/` (funcionalidad, arquitectura, buenas prácticas). Estructura `Agents/` con orquestador, `reglas/`, `tecnologia/` y `funcionalidad/`, y el agente `Agents-planner.md`, que planifica por feature con el formato: contexto, RN/CU cubiertas, archivos, pasos y verificación.

**Fase 1: modelos, enums y etiquetas.**
- Enums de TypeScript en inglés `UPPER_SNAKE_CASE` según la tabla 4.2 del documento, y `TaskSourceType`.
- Se eliminaron los arreglos `*_OPTIONS`. Las etiquetas en español están en `core/i18n/labels.ts` y se muestran con el pipe `label` (`shared/pipes`).
- `Goal` con horizonte nullable y estado `IDEA | ACTIVE | PAUSED`. `Activity` con `recurrence` y `executionPlan` en `null` para las compuestas. `SubActivity` con deadline opcional.
- Claves de `localStorage` nuevas para ignorar los datos viejos.

**Fase 2: motor de reglas puro (`core/rules`).** Fechas como cadenas `YYYY-MM-DD` con aritmética de días sin `new Date(string)` (corrige B-01), `deriveRecurrence`, `computeProgress`, `deriveStatus`, `effectiveDeadline`, `validateDeadlines`, `regenerateFutureSessions`, `isOverdue`, `canCloseObjective` y `reopenIfBelowComplete`. `DateUtils` conserva `getTodayISO` y `calculateProgress`.

**Fase 3: `PlannerService`.**
- Una sola cascada de recálculo (`cascade()` + `commit()`) tras cada mutación; se quitó la migración y los `setTimeout`.
- Agenda sin metas `PAUSED`/`IDEA` ni tareas `PAUSED`.
- Acciones nuevas: `pauseGoal`/`resumeGoal`, `pauseActivity`/`resumeActivity`, `closeObjective` y reapertura automática.
- Borrado en cascada con `deletionImpact`, cambio de tipo con `typeChangeImpact`, y `closeDay` con upsert por fecha y tiempo real ejecutado.
- Las operaciones que guardan tareas y pasos devuelven los conflictos de deadline y no guardan si hay alguno.

**Fase 4: formularios, pantallas y diálogo.**
- Diálogo con `requireText` (confirmación escrita del título), `confirmDelete` y `alertDeadlineConflicts`.
- Metas: horizonte opcional (crea `IDEA`), pausar y reanudar. Objetivos: botón "Cerrar objetivo", estado `OVERDUE` derivado y pausa de tareas.
- Tareas: sin selector de recurrencia (B-02), duración mínima siempre validada (B-12), plan con sesiones pasadas conservadas, confirmación de cambio de tipo solo si hay datos que perder. Pasos: título mínimo 3 (RN-13).
- Agenda con `isCompleted` (B-11) y resumen con tiempo real (B-07).

**Fase 4b: deadline del objetivo.** Cambio de regla pedido por el usuario durante la revisión de la Fase 4: la meta no tiene fecha y el objetivo tiene deadline obligatorio que topa a sus tareas y pasos (RN-65). Se registró primero en el documento de reglas (RN-14, RN-48, RN-49, RN-56, RN-65, modelo, casos de uso, diagrama y API) y luego en el código: `Objective.deadline`, `Activity.deadline` opcional, `validateDeadlines` sobre la cadena objetivo → tarea → paso, y claves `planner_v4_*`.

**Fase 5: pruebas.** 101 pruebas con Vitest: una spec por archivo de `core/rules` (incluye la regresión de B-01), `PlannerService`, `NativeDialogService`, `LabelPipe` y `App` (se reemplazó la prueba vieja, que esperaba un texto que ya no existe). Helpers en `src/app/testing/`.

## Decisiones tomadas durante la ejecución

- La meta no tiene fecha (RN-56); el objetivo tiene deadline obligatorio (RN-65). Tarea y paso heredan el deadline de su padre y pueden tener uno más corto, nunca más largo (confirmado por el usuario).
- Una meta nueva con horizonte nace `ACTIVE`; sin horizonte nace `IDEA`. `cascade()` pasa una `IDEA` con horizonte a `ACTIVE` cuando tiene al menos una tarea. Está pendiente de definir (sección 10, punto 8 del documento de reglas).
- `deriveStatus` conserva `PAUSED`; `resumeActivity` solo actúa sobre tareas pausadas y deriva el estado del progreso.
- `updateActivity` elimina los pasos al pasar a simple, por eso se quitó `deleteSubActivitiesByActivityId`.
- Al editar, los formularios muestran solo las fechas específicas futuras; las pasadas se conservan solas (RN-51). Un deadline anterior a hoy se rechaza si es nuevo o fue modificado.

## Verificación realizada

- 101 pruebas pasan con `TZ=UTC`, `America/Mexico_City` y `Pacific/Auckland`.
- `pnpm ng build` compila sin errores de tipos.
- Sin valores de enum en español ni en `snake_case` fuera de `core/i18n/labels.ts`.
- Una mutación deliberada de `weekDayOf` fue detectada por 7 pruebas.

## Pendiente

- Recorrido manual en el navegador por CU-01 a CU-26, en particular: crear una idea y promoverla, un patrón semanal que no se desfasa, el bloqueo de un deadline mayor al del padre, la pausa de una meta que oculta la agenda, el cierre de un objetivo al 100% y su reapertura, el borrado con confirmación escrita y el cierre del día repetido.
- Aviso de presupuesto de CSS en `objective-detail` (5,6 kB sobre 4 kB).
- Decisiones por definir: sección 10 del documento de reglas.

## Registro de avances

| Fecha | Cambio |
|-------|--------|
| 2026-10-20 | Plan aprobado y documentación base creada. |
| 2026-10-21 | Fase 0 completada: estructura `Agents/` y agente planificador. |
| 2026-10-22 | Fases 1 a 5 completadas, incluida la Fase 4b (cambio de regla RN-65). |
| 2026-10-23 | Revisión de la documentación: se quitan los estados intermedios y las inconsistencias. |

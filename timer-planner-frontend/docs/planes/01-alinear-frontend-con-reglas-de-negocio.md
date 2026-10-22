# Plan: agente planificador y frontend funcional según las reglas de negocio

## Context

La app Time Planner (Angular 21, signals, standalone) hoy guarda todo en `localStorage` y su lógica de negocio vive en `PlannerService`. Ya existe un documento de reglas de negocio validado con el usuario, en la raíz del monorepo: `docs/analisis-reglas-de-negocio.md` (RN-01 a RN-64, CU-01 a CU-25, bugs B-01 a B-14). Antes de construir el backend, el usuario quiere dejar el **frontend funcional** según esas reglas, y tener un **agente planificador** en `timer-planner-frontend/Agents/` que sepa planificar por feature.

Decisiones ya tomadas por el usuario:
- Formato del agente: archivo Markdown de instrucciones (como `Agents-angular.md`), dentro de `Agents/funcionalidad/`.
- Plan por fases con todas las reglas del documento.
- Datos actuales de `localStorage`: **empezar de cero** (sin migración de valores viejos).
- El agente lee `../docs/analisis-reglas-de-negocio.md` como **referencia de solo lectura**, declarada como excepción explícita en su archivo.
- El plan está aprobado; ninguna fase se ha iniciado (ver Estado de avance).

Fuera de alcance: backend, historial (CU-21), estado `ARCHIVED`, respaldos, autenticación.

## Estado de avance

Se actualiza al terminar cada fase. Estados: ⏳ Pendiente · 🔄 En curso · ✅ Completada.

| Fase | Alcance | Estado | Última actualización |
|------|---------|--------|----------------------|
| Base | Documentación en `docs/` (README, funcionalidad, arquitectura, buenas prácticas) | ✅ Completada | 2026-10-20 |
| 0 | Agente planificador (`Agents/funcionalidad/Agents-planner.md`) | ✅ Completada | 2026-10-21 |
| 1 | Modelos, enums y etiquetas | ✅ Completada (commit `5cfb234`) | 2026-10-22 |
| 2 | Motor de reglas puro (`core/rules`) | ✅ Completada (commit `0b550f4`) | 2026-10-22 |
| 3 | Reescribir `PlannerService` | 🔄 En revisión (pendiente de validación del usuario) | 2026-10-22 |
| 4 | Formularios, pantallas y diálogo | ⏳ Pendiente | — |
| 5 | Pruebas y verificación | ⏳ Pendiente | — |

**Regla:** una fase no se da por terminada hasta que su documentación esté al día (ver "Al terminar" en cada fase y `docs/README.md`).

## Fase 0 — Agente planificador

Crear la estructura `timer-planner-frontend/Agents/` (orquestador `Agents.md` y carpetas `reglas/`, `tecnologia/` y `funcionalidad/`) y el agente `funcionalidad/Agents-planner.md` con:
- **Rol:** planifica por feature cómo llevar el frontend a cumplir las reglas del documento; no implementa salvo que se le pida.
- **Fuente de verdad:** `../docs/analisis-reglas-de-negocio.md`, solo lectura. Declara la excepción al "entorno cerrado" en `Agents/reglas/Agents-alcance.md`.
- **Restricciones heredadas de `Agents/reglas/Agents-alcance.md` y `Agents/tecnologia/Agents-angular.md`:** trabajar dentro del frontend, usar `pnpm`/`ng`, mostrar comandos `ng generate` con su atajo, pedir permiso y explicar brevemente antes de ejecutar comandos, respuestas breves.
- **Mapa de features:** parte de `docs/funcionalidad.md`, con las RN/CU que le aplican a cada feature.
- **Formato de salida de un plan:** contexto, RN/CU cubiertas, archivos a tocar, pasos ordenados, verificación.
- **Arquitectura:** se basa en `docs/arquitectura.md` y `docs/buenas-practicas.md`. El agente no inventa decisiones de arquitectura fuera de ellos.
- **Mantenimiento de la documentación:** al terminar una fase, actualiza los documentos que correspondan según `docs/README.md` y marca el estado de la fase en este plan.

**Al terminar:** `docs/README.md` (estado general) y la tabla de Estado de avance de este plan.

## Fase 1 — Modelos, enums y etiquetas

Archivos: `src/app/core/models/{goal,objective,activity,daily-record}.model.ts`.
- Enums en inglés `UPPER_SNAKE_CASE` según la tabla 4.2 del documento (`SHORT_TERM`, `IN_PROGRESS`, `WEEKLY_PATTERN`, `MONDAY`…). Agregar `TaskSourceType` (`ACTIVITY` | `SUBACTIVITY`).
- Eliminar los arreglos `*_OPTIONS` (valor + etiqueta). Crear `src/app/core/i18n/labels.ts` con diccionarios `Record<Enum, string>` en español, y un pipe `label` en `src/app/shared/pipes/` para usarlos en plantillas.
- `Goal`: `horizon` nullable, `status` `IDEA|ACTIVE|PAUSED`, `targetDate` opcional, quitar `type` legacy.
- `Activity`: `recurrence` y `executionPlan` `null` en compuestas; `status` incluye `PAUSED`; `OVERDUE` solo derivado.
- `SubActivity`: `deadline` opcional (hereda el efectivo de la tarea).
- Claves de `localStorage` nuevas (`planner_v3_*`) en `LocalStorageService` para ignorar los datos viejos.

**Al terminar:** `docs/arquitectura.md` (estructura actual: `core/i18n`, `shared/pipes`), `docs/funcionalidad.md` (estado) y la tabla de Estado de avance de este plan.

## Fase 2 — Motor de reglas puro (sin Angular)

Nueva carpeta `src/app/core/rules/`, funciones puras y probables en aislamiento:
- Fechas calendario como cadenas `YYYY-MM-DD` con aritmética de días sin `new Date(string)` (corrige B-01). Reemplaza `generateDatesFromPattern` de `core/utils/date.utils.ts`; se conserva `calculateProgress`.
- `deriveRecurrence` (RN-47), `computeProgress` y `deriveStatus` (RN-30 a RN-34, RN-31/32), `effectiveDeadline` y `validateDeadlines` (RN-48, RN-49), `regenerateFutureSessions` (RN-51), `isOverdue` (RN-58), `canCloseObjective` (RN-63).

**Al terminar:** `docs/arquitectura.md` (estructura actual: `core/rules`), `docs/funcionalidad.md` (estado de progreso, fechas y estados) y la tabla de Estado de avance de este plan.

## Fase 3 — Reescribir `PlannerService`

Archivo: `src/app/core/services/planner.service.ts` (se mantiene `DataProvider`).
- Quitar `checkAndMigrate` y los `setTimeout` de `toggleTaskExecution`; una sola función de recálculo en cascada tras cada mutación (RN-36).
- Agenda: excluir metas `PAUSED`/`IDEA` y tareas `PAUSED` (RN-29, RN-57, RN-59).
- Borrado en cascada con recálculo (RN-07 a RN-10, RN-52); el borrado de un hijo completado reabre el objetivo (RN-64).
- Acciones nuevas: `pauseGoal`/`resumeGoal`, `pauseActivity`/`resumeActivity`, `closeObjective` (RN-63), reapertura automática (RN-64).
- Cambio de tipo de tarea con confirmación solo si hay datos que perder (RN-39, RN-40).
- `closeDay` con upsert por fecha (RN-43) y `executedTimeMin` real.

**Al terminar:** `docs/funcionalidad.md` (funcionalidad transversal y estados) y la tabla de Estado de avance de este plan. Si cambió alguna regla, también `../docs/analisis-reglas-de-negocio.md`.

## Fase 4 — Formularios, pantallas y diálogo

- `NativeDialogService` y `global-dialog`: agregar opción `requireText` para confirmación escrita del título (RN-62), con conteo de hijos y completados a borrar.
- `goals-form`: horizonte opcional (crea `IDEA`), `targetDate`. Listado y detalle con botones pausar/reanudar.
- `objective-form` / `objective-detail`: botón "Cerrar objetivo" (solo con 100%), etiqueta `OVERDUE`.
- `activity-form`: quitar el selector de recurrencia (B-02), validar duración mínima siempre (B-12), fechas específicas ≤ deadline, bloqueo con lista de fechas en conflicto (RN-49), confirmación según RN-39/RN-40.
- `structure-form`: título mínimo 3 (RN-13), deadline opcional con herencia y tope en el de la tarea (RN-48).
- `daily-dashboard`: corregir la clase `completed` para usar `isCompleted` (B-11).
- `daily-summary`: mostrar `executedTimeMin` real en lugar de `completados × 45` (B-07).

**Al terminar:** `docs/funcionalidad.md` (estado por feature) y la tabla de Estado de avance de este plan.

## Fase 5 — Pruebas y verificación

- Reemplazar `src/app/app.spec.ts`: su prueba espera el texto "Hello, timer-planner-frontend", que la app ya no muestra.
- Pruebas unitarias del motor de reglas (Vitest, vía `ng test`): recurrencia, progreso, estados, deadlines, sesiones futuras, y la regresión de B-01 ejecutada con `TZ=America/Mexico_City`.
- Pruebas del `PlannerService`: cascada de borrado, reapertura automática, upsert de cierre.

**Al terminar:** `docs/buenas-practicas.md` (si cambió el flujo de pruebas), `docs/README.md` (estado general) y la tabla de Estado de avance de este plan.

## Archivos críticos

- Nuevo: `timer-planner-frontend/Agents/funcionalidad/Agents-planner.md`, `src/app/core/rules/*`, `src/app/core/i18n/labels.ts`, `src/app/shared/pipes/label.pipe.ts`.
- Modificados: `core/models/*.ts`, `core/services/planner.service.ts`, `core/services/native-dialog.service.ts`, `core/providers/local-storage.service.ts`, `core/utils/date.utils.ts`, `shared/components/global-dialog/*`, y los formularios y detalles de `features/{goals,objectives,activities,daily}`.

## Verificación

1. `pnpm ng test` (con y sin `TZ=America/Mexico_City`): todas las pruebas pasan.
2. `pnpm ng build`: compila sin errores de tipos.
3. `pnpm ng serve` y recorrido manual en el navegador por los casos de uso CU-01 a CU-25 del documento, en particular: crear idea y promoverla, patrón semanal que no se desfasa un día, bloqueo de deadline de paso mayor al de la tarea, pausa de meta que oculta la agenda, cierre de objetivo con 100% y reapertura al agregar tarea, borrado con confirmación escrita, cierre del día repetido que reemplaza el registro.
4. Revisar que no queden valores en español en el código (`grep` de `en_progreso`, `patron_`, etc.) fuera de `labels.ts`.
5. Confirmar que `docs/` refleja el estado real: carpetas existentes, estado por feature y estado de cada fase.

## Registro de avances

| Fecha | Cambio |
|-------|--------|
| 2026-10-20 | Plan aprobado. Documentación base creada en `docs/`. |
| 2026-10-21 | Se agregan el Estado de avance, las líneas "Al terminar" por fase y la regla de mantenimiento. Ninguna fase iniciada. |
| 2026-10-21 | Fase 0 completada en la rama `chore/organize-agents-structure`: estructura `Agents/` con orquestador, reglas, tecnología y el agente planificador. `AGENTS-angular.md` se movió a `Agents/tecnologia/Agents-angular.md`. |
| 2026-10-22 | Fase 1 implementada en la rama `feat/align-frontend-business-rules`, a la espera de validación. Enums en inglés (`enum` de TypeScript) en los 3 modelos, `TaskSourceType`, `core/i18n/labels.ts`, `shared/pipes/label.pipe.ts` y claves `planner_v3_*`. Se eliminan los `*_OPTIONS` y `WEEK_DAYS`. `daily-record.model.ts` no necesitó cambios. **Estado de compilación:** `tsc` falla a propósito en `planner.service.ts`, `date.utils.ts` y los formularios (usan valores viejos); se corrige en las Fases 2 a 4. |
| 2026-10-22 | Fase 1 validada y confirmada con commit `5cfb234`. |
| 2026-10-22 | Fase 2 implementada, a la espera de validación. Nueva carpeta `core/rules` (`calendar`, `progress`, `recurrence`, `deadline`, `session`, `objective` + `index.ts`). `DateUtils.generateDatesFromPattern` se elimina (reemplazada por la versión sin `new Date(string)`, corrige B-01); `getTodayISO` y `calculateProgress` se conservan. Verificado con un script temporal (25 comprobaciones) bajo `TZ=America/Mexico_City` y `Pacific/Auckland`; las pruebas formales van en la Fase 5. `tsc` sigue fallando solo en `planner.service.ts` y los formularios. |
| 2026-10-22 | Fase 2 validada y confirmada con commit `0b550f4`. |
| 2026-10-22 | Fase 3 implementada, a la espera de validación. `PlannerService` reescrito: se quitan `checkAndMigrate`, los `setTimeout` y las funciones de progreso sueltas; una sola `cascade()` + `commit()` tras cada mutación. Agenda sin metas `PAUSED`/`IDEA` ni tareas `PAUSED`. Acciones nuevas: `pauseGoal`/`resumeGoal`, `pauseActivity`/`resumeActivity`, `closeObjective`, reapertura automática, `deletionImpact` (datos para la confirmación escrita, Fase 4) y `typeChangeImpact` (RN-39/40). `addActivity`, `updateActivity`, `addSubActivity` y `updateSubActivity` ahora devuelven los conflictos de deadline y no guardan si hay alguno. `closeDay` hace upsert por fecha. Modelos nuevos: `agenda-item.model.ts` y `deletion-impact.model.ts`. Se elimina `deleteSubActivitiesByActivityId` (el servicio borra los pasos al pasar a simple). Verificado con un script temporal de 16 comprobaciones; `tsc` ya no falla en `core/`, solo en los formularios y `daily-dashboard` (Fase 4). |

Decisiones de la Fase 3 no explícitas en las reglas: `cascade()` pasa una meta `IDEA` a `ACTIVE` cuando tiene horizonte y al menos una tarea (RN-55); `resumeActivity` solo actúa sobre tareas `PAUSED` y el estado se deriva del progreso; `totalTimeRequiredMin` se recalcula en cada cascada (RN-24, B-14).

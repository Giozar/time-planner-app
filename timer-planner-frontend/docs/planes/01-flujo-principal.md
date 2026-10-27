# Plan 01 — Flujo principal simplificado

## Contexto

Llevar el frontend al flujo acordado y ya escrito en `docs/analisis-reglas-de-negocio.md`: meta con fecha límite, estado, resultado y vencido en todos los niveles, sesiones con su tiempo realizado y su nota, registro diario en la agenda y métricas.

## RN y CU cubiertas

RN-14, RN-27, RN-41, RN-48, RN-49, RN-51, RN-55, RN-56, RN-58, RN-63, RN-65, RN-69, RN-72, RN-75, RN-76, RN-82 a RN-86; CU-02 a CU-04, CU-17 a CU-19, CU-28, CU-30 a CU-32.

## Conflictos con reglas existentes

Ninguno: las reglas ya describen el flujo acordado.

## Archivos a tocar

- **Modelos y reglas:** `core/models` (`goal`, `session`, `daily-record`), `core/rules` (`deadline`, `session`, `progress` y una regla de métricas).
- **Servicio:** `core/services/planner.service.ts` y sus pruebas.
- **Pantallas:** `features/goals`, `features/objectives`, `features/activities`, `features/daily`; se borra `features/history` y se crea `features/metrics`.
- **Compartido:** `core/i18n/labels.ts`, `shared/layout/main-layout` (menú), `app.routes.ts`.

## Pasos ordenados

### Fase 2 — Meta con fecha límite, resultado y vencido
1. `Goal.deadline` opcional; la cadena de topes empieza en la meta: `validateDeadlines` rechaza objetivos que la superen y `effectiveDeadlineOf('goal')` la devuelve, así la meta se cierra por fecha límite y se reabre con un deadline nuevo.
2. Formulario de meta: fecha límite obligatoria cuando tiene horizonte, desde hoy; si la meta ya tenía objetivos, se validan (RN-49). Formulario de objetivo: su fecha no pasa la de la meta.
3. Servicio: resultado y vencido por id para meta, objetivo, tarea y paso con `isComplete` e `isOverdue`.
4. Listas y detalles muestran el resultado («Completa» o «Incompleta», con su género) y «Vencida» junto al estado.

### Fase 3 — Editar, agregar y borrar sesiones
1. `ExecutionSession.manual`; reglas para editar la fecha y el tiempo previsto de una sesión (no hecha: de hoy al deadline; hecha: hasta hoy), agregar una suelta y borrar una dejando al menos una. `regenerateFutureSessions` conserva las agregadas.
2. Servicio: `editSession`, `addSession` y `deleteSession`; `editSession` reemplaza a `moveSession`.
3. Formularios de tarea simple y paso: check «mismo tiempo»; sin marcar, la lista de sesiones muestra el tiempo de cada una y permite agregar y borrar.

### Fase 4 — Agenda y registro diario
1. `ExecutionSession.notes` y `DailyRecord.sessionIds`.
2. Agenda: marcar (también hoy) pide tiempo realizado y nota; cada sesión se edita con fecha, tiempo previsto, tiempo realizado y nota (CU-30) y muestra su estado, su resultado y si está vencida (RN-69).
3. Cierre del día: guarda sus sesiones y la nota del día.
4. La agenda muestra el registro diario de la fecha elegida. Se borran `features/history`, su ruta y su entrada del menú.

### Fase 5 — Métricas
1. Regla de métricas por nivel: completos, incompletos, cerrados, vencidos y promedios de constancia y productividad (RN-86).
2. Pantalla `features/metrics` en `/metrics` y entrada en el menú.

## Verificación

En cada fase: `pnpm ng test --watch=false`, `pnpm ng build` y el recorrido manual de lo que cambió.

## Documentos a actualizar

En cada fase se quitan sus filas de «Comparación con el código» de `docs/estado-y-pendientes.md` y de la columna «Falta» de `timer-planner-frontend/docs/funcionalidad.md`, y se ajustan sus «Notas». La fase 4 y la 5 actualizan también el mapa de features y «Estructura actual» de `timer-planner-frontend/docs/arquitectura.md`. La fase 5 borra este plan.

## Decisiones que lo bloquean

Ninguna.

## Pendiente

Nada por definir.

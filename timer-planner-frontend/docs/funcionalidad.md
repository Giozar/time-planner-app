# Funcionalidad por feature

Mapa de qué reglas y casos de uso corresponden a cada parte del frontend. **No duplica el contenido**: el detalle vive en `../../docs/analisis-reglas-de-negocio.md` (RN = regla de negocio, CU = caso de uso). La comparación entre reglas y código está en `../../docs/estado-y-pendientes.md`.

## Mapa de features

| Feature | Carpeta | Casos de uso | Reglas principales | Estado | Fases |
|---------|---------|--------------|--------------------|--------|-------|
| Metas e ideas | `features/goals` | CU-01 a CU-05, CU-22, CU-23 | RN-07, RN-12, RN-55 a RN-57, RN-62, RN-68 | ⏳ Pendiente | Plan 03 |
| Objetivos | `features/objectives` | CU-06 a CU-09, CU-24, CU-25 | RN-08, RN-33, RN-52 a RN-54, RN-63 a RN-65, RN-68 | ⏳ Pendiente | Plan 03 |
| Tareas | `features/activities` (`activity-form`) | CU-10 a CU-13, CU-20, CU-24 | RN-03, RN-04, RN-14 a RN-20, RN-30, RN-39, RN-40, RN-47 a RN-51, RN-67 a RN-74 | ⏳ Pendiente | Plan 03 |
| Pasos | `features/activities` (`structure-form`) | CU-14 a CU-16, CU-20 | RN-05, RN-13, RN-30, RN-48, RN-49, RN-67 a RN-74 | ⏳ Pendiente | Plan 03 |
| Agenda diaria | `features/daily` (`daily-dashboard`) | CU-17, CU-18, CU-27, CU-28 | RN-25 a RN-29, RN-69 a RN-72 | ⏳ Pendiente | Plan 03 |
| Cierre del día | `features/daily` (`daily-summary`) | CU-19 | RN-41 a RN-44, RN-72 | ⏳ Pendiente | Plan 03 |
| Calendario | `features/calendar` (`calendar-view`) | CU-26 | RN-25, RN-26, RN-29, RN-48, RN-66, RN-73 | ⏳ Pendiente | Plan 03 |
| Historial | Por crear | CU-21, CU-28 | RN-11, RN-43, RN-70, RN-72, RN-74 | ⏳ Pendiente | Plan 03, Fase 4 |

**Estado:** ⏳ Pendiente · ✅ Completada. Las pantallas existentes funcionan con el modelo anterior (planes [01](planes/01-alinear-frontend-con-reglas-de-negocio.md) y [02](planes/02-calendario.md)). «Pendiente» indica su adaptación al modelo de avance, constancia y tiempo real del [plan 03](planes/03-avance-constancia-tiempo-real.md). Última revisión: 2026-10-23.

## Funcionalidad transversal

Reglas que no pertenecen a una pantalla sino a la lógica compartida.

| Tema | Dónde vive | Reglas | Estado |
|------|------------|--------|--------|
| Progreso y estados en cascada | `core/rules` y `core/services/planner.service.ts` | RN-30 a RN-37, RN-67, RN-68 | ⏳ Pendiente |
| Plan de ejecución y fechas | `core/rules` y formularios | RN-21 a RN-24, RN-47 a RN-51, RN-69, RN-73 | ⏳ Pendiente |
| Deadlines objetivo → tarea → paso | `core/rules/deadline.rules.ts` y `planner.service.ts` | RN-14, RN-48, RN-49, RN-65 | ✅ Completada |
| Visibilidad de sesiones (agenda y calendario) | `core/services/planner.service.ts` | RN-29, RN-57, RN-59, RN-66, RN-73 | ⏳ Pendiente |
| Borrado y confirmaciones | `core/services/planner.service.ts`, `native-dialog.service.ts` | RN-07 a RN-11, RN-52, RN-62, RN-74 | ⏳ Pendiente |
| Persistencia | `core/providers/local-storage.service.ts` | ExecutionSession, WorkLog, DailyRecord | ⏳ Pendiente |

## Notas

- **Deadlines (RN-65):** la meta no tiene fecha; el objetivo tiene deadline obligatorio y es el tope de sus tareas y pasos. Tarea y paso heredan el deadline de su padre si no tienen uno propio, y pueden tener uno más corto, nunca más largo.
- La pantalla de **historial** (CU-21) se crea en la Fase 4 del plan 03.
- El estado `ARCHIVED` no existe en el MVP.

## Pendiente por definir

Las decisiones abiertas (`D-xx`) y las correcciones propuestas a las reglas (`C-xx`) están en [estado-y-pendientes.md](../../docs/estado-y-pendientes.md). El plan 03 indica qué decisiones bloquean cada fase.

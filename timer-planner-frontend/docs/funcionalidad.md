# Funcionalidad por feature

Mapa de qué reglas y casos de uso corresponden a cada parte del frontend. **No duplica el contenido**: el detalle vive en `../../docs/analisis-reglas-de-negocio.md` (RN = regla de negocio, CU = caso de uso, B = bug detectado).

## Mapa de features

| Feature | Carpeta | Casos de uso | Reglas principales | Estado | Fases |
|---------|---------|--------------|--------------------|--------|-------|
| Metas e ideas | `features/goals` | CU-01 a CU-05, CU-22, CU-23 | RN-07, RN-12, RN-55, RN-56 (la meta no tiene fecha), RN-57, RN-62 | ✅ Alineado | 1, 3, 4 |
| Objetivos | `features/objectives` | CU-06 a CU-09, CU-24, CU-25 | RN-08, RN-33, RN-52 a RN-54, RN-63 a RN-65 (deadline del objetivo) | ✅ Alineado | 1, 3, 4, 4b |
| Tareas | `features/activities` (`activity-form`) | CU-10 a CU-13, CU-24 | RN-03, RN-04, RN-14 a RN-20, RN-39, RN-40, RN-47 a RN-51, RN-58 a RN-60 | ✅ Alineado | 1 a 4, 4b |
| Pasos | `features/activities` (`structure-form`) | CU-14 a CU-16 | RN-05, RN-13, RN-48, RN-49 | ✅ Alineado | 1 a 4, 4b |
| Agenda diaria | `features/daily` (`daily-dashboard`) | CU-17, CU-18 | RN-25 a RN-29 | ✅ Alineado | 3, 4 |
| Cierre del día | `features/daily` (`daily-summary`) | CU-19 | RN-41 a RN-44 | ✅ Alineado | 3, 4 |
| Calendario | `features/calendar` (`calendar-view`) | CU-26 | RN-25, RN-26, RN-29, RN-48, RN-66 | ✅ Alineado | 1 a 3 del plan 02 |

**Estado:** ⏳ Por alinear · ✅ Alineado con las reglas. "Fases" son las del plan [01](planes/01-alinear-frontend-con-reglas-de-negocio.md) y, donde se indica, las del plan [02](planes/02-calendario.md). Última revisión: 2026-10-23.

## Funcionalidad transversal

Reglas que no pertenecen a una pantalla sino a la lógica compartida.

| Tema | Dónde vive | Reglas | Estado |
|------|------------|--------|--------|
| Progreso y estados en cascada | `core/rules` (reglas) y `core/services/planner.service.ts` (aplicación) | RN-30 a RN-37 | ✅ Alineado |
| Plan de ejecución y fechas | `core/rules` y formularios | RN-21 a RN-24, RN-47 a RN-51 | ✅ Alineado |
| Deadlines objetivo → tarea → paso | `core/rules/deadline.rules.ts` y `planner.service.ts` | RN-14, RN-48, RN-49, RN-65 | ✅ Alineado |
| Visibilidad de sesiones (agenda y calendario) | `core/services/planner.service.ts` (`visibleActivityIds`, `todaysTasks`, `calendarEntries`) | RN-29, RN-57, RN-59, RN-66 | ✅ Alineado |
| Borrado y confirmaciones | `core/services/planner.service.ts` (cascada e impacto), `native-dialog.service.ts`, `shared/components/global-dialog` | RN-07 a RN-11, RN-52, RN-62 | ✅ Alineado |
| Persistencia | `core/providers/local-storage.service.ts` (claves `planner_v4_*`) | — | ✅ Alineado |

## Notas

- **Deadlines (RN-65):** la meta no tiene fecha; el objetivo tiene deadline obligatorio y es el tope de sus tareas y pasos. Tarea y paso heredan el deadline de su padre si no tienen uno propio, y pueden tener uno más corto, nunca más largo.
- **RN-38** y **RN-23** están marcadas como superadas en el documento de reglas; no se implementan tal como estaban.
- **CU-20** (migración V1 → V2) se eliminó del frontend: los datos empezaron de cero con las claves `planner_v4_*`.
- La pantalla de **historial** (CU-21) queda fuera del alcance actual.
- El estado `ARCHIVED` no existe en el MVP.

## Pendiente por definir

Las decisiones que afectan a la funcionalidad están en la sección 10 del documento de reglas. Las que tocan al frontend son: sesiones atrasadas y marcar días pasados, destino tras cerrar el día, objetivo vencido, pausa de objetivo, ideas con objetivos y tareas, y edición de elementos completados.

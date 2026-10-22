# Funcionalidad por feature

Mapa de qué reglas y casos de uso corresponden a cada parte del frontend. **No duplica el contenido**: el detalle vive en `../../docs/analisis-reglas-de-negocio.md` (RN = regla de negocio, CU = caso de uso, B = bug detectado).

## Mapa de features

| Feature | Carpeta | Casos de uso | Reglas principales | Estado | Fases |
|---------|---------|--------------|--------------------|--------|-------|
| Metas e ideas | `features/goals` | CU-01 a CU-05, CU-22, CU-23 | RN-07, RN-12, RN-55, RN-56 (la meta no tiene fecha), RN-57, RN-62 | 🔄 Alineado en código, en revisión | 1, 3, 4 |
| Objetivos | `features/objectives` | CU-06 a CU-09, CU-24, CU-25 | RN-08, RN-33, RN-52 a RN-54, RN-63 a RN-65 (deadline del objetivo) | 🔄 Alineado en código, en revisión | 1, 3, 4, 4b |
| Tareas | `features/activities` (`activity-form`) | CU-10 a CU-13, CU-24 | RN-03, RN-04, RN-14 a RN-20, RN-39, RN-40, RN-47 a RN-51, RN-58 a RN-60 | 🔄 Alineado en código, en revisión | 1 a 4, 4b |
| Pasos | `features/activities` (`structure-form`) | CU-14 a CU-16 | RN-05, RN-13, RN-48, RN-49 | 🔄 Alineado en código, en revisión | 1 a 4, 4b |
| Agenda diaria | `features/daily` (`daily-dashboard`) | CU-17, CU-18 | RN-25 a RN-29 | 🔄 Alineado en código, en revisión | 3, 4 |
| Calendario | `features/calendar` (`calendar-view`) | CU-26 | RN-25, RN-26, RN-29, RN-48, RN-66 | 🔄 Alineado en código (Fases 1 a 3 del plan [02](planes/02-calendario.md)), la 3 en revisión; falta el recorrido manual | 1 a 3 del plan 02 |
| Cierre del día | `features/daily` (`daily-summary`) | CU-19 | RN-41 a RN-44 | 🔄 Alineado en código, en revisión | 3, 4 |

**Estado:** ⏳ Por alinear · 🔄 En curso · ✅ Alineado con las reglas. Última revisión: 2026-10-22. Fases 1 a 4 hechas; la 4b (deadline del objetivo) está en revisión y falta el recorrido manual en el navegador y las pruebas (Fase 5). "Fases" son las del plan [01](planes/01-alinear-frontend-con-reglas-de-negocio.md).

## Funcionalidad transversal

Reglas que no pertenecen a una pantalla sino a la lógica compartida.

| Tema | Dónde vive hoy | Reglas | Estado | Fases |
|------|----------------|--------|--------|-------|
| Progreso y estados en cascada | `core/rules` (reglas) y `core/services/planner.service.ts` (aplicación) | RN-30 a RN-37 | ✅ Alineado (Fases 2 y 3) | 2, 3 |
| Plan de ejecución y fechas | `core/rules` y formularios | RN-21 a RN-24, RN-47 a RN-51 | 🔄 Alineado en código (Fases 2 y 4), en revisión | 2, 4, 4b |
| Visibilidad de sesiones (agenda y calendario) | `core/services/planner.service.ts` (`visibleActivityIds`, `todaysTasks`, `calendarEntries`) | RN-29, RN-57, RN-59, RN-66 | ✅ Alineado (Fase 2 del plan [02](planes/02-calendario.md)) | 2 del plan 02 |
| Borrado y confirmaciones | `core/services/planner.service.ts` (cascada e impacto), `native-dialog.service.ts`, `shared/components/global-dialog` | RN-07 a RN-11, RN-52, RN-62 | 🔄 Alineado en código (Fases 3 y 4), en revisión | 3, 4 |

## Notas

- **Deadlines (RN-65):** la meta no tiene fecha; el objetivo tiene deadline obligatorio y es el tope de sus tareas y pasos. Tarea y paso heredan el deadline de su padre si no tienen uno propio.
- **RN-38** y **RN-23** están marcadas como superadas en el documento de reglas; no se implementan tal como estaban.
- La pantalla de **historial** (CU-21) queda fuera del alcance actual.
- El estado `ARCHIVED` no existe en el MVP.

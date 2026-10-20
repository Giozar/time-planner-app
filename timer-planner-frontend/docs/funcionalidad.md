# Funcionalidad por feature

Mapa de qué reglas y casos de uso corresponden a cada parte del frontend. **No duplica el contenido**: el detalle vive en `../../docs/analisis-reglas-de-negocio.md` (RN = regla de negocio, CU = caso de uso, B = bug detectado).

## Mapa de features

| Feature | Carpeta | Casos de uso | Reglas principales |
|---------|---------|--------------|--------------------|
| Metas e ideas | `features/goals` | CU-01 a CU-05, CU-22, CU-23 | RN-07, RN-12, RN-55, RN-56, RN-57, RN-62 |
| Objetivos | `features/objectives` | CU-06 a CU-09, CU-25 | RN-08, RN-33, RN-52 a RN-54, RN-63, RN-64 |
| Tareas | `features/activities` (`activity-form`) | CU-10 a CU-13, CU-24 | RN-03, RN-04, RN-14 a RN-20, RN-39, RN-40, RN-47 a RN-51, RN-58 a RN-60 |
| Pasos | `features/activities` (`structure-form`) | CU-14 a CU-16 | RN-05, RN-13, RN-48, RN-49 |
| Agenda diaria | `features/daily` (`daily-dashboard`) | CU-17, CU-18 | RN-25 a RN-29 |
| Cierre del día | `features/daily` (`daily-summary`) | CU-19 | RN-41 a RN-44 |

## Funcionalidad transversal

Reglas que no pertenecen a una pantalla sino a la lógica compartida.

| Tema | Dónde vive hoy | Reglas |
|------|----------------|--------|
| Progreso y estados en cascada | `core/services/planner.service.ts` | RN-30 a RN-37 |
| Plan de ejecución y fechas | `core/utils/date.utils.ts` y formularios | RN-21 a RN-24, RN-47 a RN-51 |
| Borrado y confirmaciones | `core/services/native-dialog.service.ts`, `shared/components/global-dialog` | RN-07 a RN-11, RN-52, RN-62 |

## Notas

- **RN-38** y **RN-23** están marcadas como superadas en el documento de reglas; no se implementan tal como estaban.
- La pantalla de **historial** (CU-21) queda fuera del alcance actual.
- El estado `ARCHIVED` no existe en el MVP.

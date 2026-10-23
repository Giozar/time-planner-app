# Plan 03: constancia, tiempo real y cierre diario en pantalla

## Contexto

El servicio ya trabaja con `ExecutionSession` y `WorkLog` (avance por sesiones, minutos reales vinculados, borrado en cascada, corrección de bloques). Falta mostrarlo y completar el cierre diario. La diferencia exacta está en la [comparación con el código](../../../docs/estado-y-pendientes.md#comparación-con-el-código).

Decisiones ya tomadas:
- Los datos locales de prueba se reinician al cambiar el modelo; no se implementa migración.
- Se conserva la arquitectura actual: reglas puras en `core/rules` y estado en `PlannerService` (ver `../arquitectura.md`).

## RN y CU cubiertas

RN-41 a RN-44, RN-57, RN-59, RN-70 a RN-72 y RN-76. CU-19, CU-21, CU-27 y CU-28. Entidad `DailyRecord` (sección 3.8).

## Archivos a tocar

- `core/models`: `pauses` en meta y tarea; `core/services`: registrar el periodo al pausar y reanudar.
- `core/rules`: constancia de un ítem, de un padre y de un día (RN-70), excluyendo los periodos de pausa, con su spec.
- `core/models/daily-record.model.ts`: resumen con sesiones planeadas y realizadas, porcentaje de constancia, minutos planeados y reales y `closedAt`.
- `core/services/planner.service.ts`: `saveRecord` con el resumen nuevo.
- `features/objectives/objective-detail`, `features/goals` y `features/daily`: constancia en cada nivel, registro de tiempo sin sesión y corrección de bloques.
- `features/daily/daily-summary`: al cerrar, volver a la agenda de esa fecha.
- Pantalla de historial (nueva) en la Fase 2.

## Fases

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Constancia (regla y pantalla) y registro de tiempo: sin sesión, corregir y borrar bloques | ⏳ Pendiente |
| 2 | `DailyRecord` con sesiones y minutos reales; pantalla de historial | ⏳ Pendiente |

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Las pruebas citan las RN que cubren.
- Recorrido manual con el ejemplo de la sección 2 del documento de reglas. Debe dar 25 % de avance, 50 % de constancia y 90 minutos reales.

## Documentos a actualizar en cada fase

- La tabla de fases de este plan.
- La fila correspondiente de «Comparación con el código» en `../../../docs/estado-y-pendientes.md`. Al resolverse una decisión, también se quita de esa lista.
- La columna Falta de `../funcionalidad.md` y la sección «Pendiente» de `../README.md`.

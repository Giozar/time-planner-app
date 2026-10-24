# Plan 03: cierre diario e historial

## Contexto

El servicio y las pantallas ya muestran la constancia y permiten registrar, corregir y borrar tiempo. Falta que el resumen del cierre diario (`DailyRecord`) guarde lo que definen las reglas, y la pantalla de historial. La diferencia exacta está en la [comparación con el código](../../../docs/estado-y-pendientes.md#comparación-con-el-código).

Decisiones ya tomadas:
- Los datos locales de prueba se reinician al cambiar el modelo; no se implementa migración.
- Se conserva la arquitectura actual: reglas puras en `core/rules` y estado en `PlannerService` (ver `../arquitectura.md`).

## RN y CU cubiertas

RN-41 a RN-44, RN-72 y RN-74. CU-19, CU-21 y CU-28. Entidad `DailyRecord` (sección 3.8).

## Archivos a tocar

- `core/models/daily-record.model.ts`: `plannedSessions`, `completedSessions`, `adherencePercentage` (nulo si no hubo sesiones), `plannedMinutes`, `actualMinutes`, `notes` y `closedAt`.
- `core/services/planner.service.ts`: `saveRecord` con el resumen nuevo; la constancia del día usa `computeConsistency`.
- `features/daily/daily-summary`: mostrar el porcentaje de constancia del día y los minutos reales.
- Pantalla de historial (nueva): lista de resúmenes diarios.

## Fases

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | `DailyRecord` con sesiones, constancia y minutos reales | ⏳ Pendiente |
| 2 | Pantalla de historial | ⏳ Pendiente |

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Las pruebas citan las RN que cubren.

## Documentos a actualizar en cada fase

- La tabla de fases de este plan.
- La fila correspondiente de «Comparación con el código» en `../../../docs/estado-y-pendientes.md`.
- La columna Falta de `../funcionalidad.md` y la sección «Pendiente» de `../README.md`.

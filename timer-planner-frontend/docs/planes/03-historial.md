# Plan 03: historial

## Contexto

El cierre diario ya guarda el resumen de la fecha (sesiones, constancia, minutos previstos y reales, notas y `closedAt`). Falta la pantalla que lista esos resúmenes. La diferencia exacta está en la [comparación con el código](../../../docs/estado-y-pendientes.md#comparación-con-el-código).

Decisiones ya tomadas:
- Los datos locales de prueba se reinician al cambiar el modelo; no se implementa migración.
- Se conserva la arquitectura actual: reglas puras en `core/rules` y estado en `PlannerService` (ver `../arquitectura.md`).

## RN y CU cubiertas

RN-11, RN-43, RN-72 y RN-74. CU-21 y CU-28. Entidad `DailyRecord` (sección 3.8).

## Archivos a tocar

- `features/history` (nueva): lista de resúmenes diarios, uno por fecha, del más reciente al más antiguo; cada fila abre la agenda de esa fecha (`/daily?date=`).
- `app.routes.ts` y el menú: ruta y entrada «Historial».
- `core/services/planner.service.ts`: selector de registros ordenados por fecha, si hace falta.

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Las pruebas citan las RN que cubren.

## Documentos a actualizar al terminar

- Quitar este plan y su fila de «Comparación con el código» en `../../../docs/estado-y-pendientes.md`.
- Quitar la fila de `../funcionalidad.md` y la sección «Pendiente» de `../README.md`; describir la pantalla en `../funcionalidad.md`.

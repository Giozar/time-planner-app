# Plan 03: avance, constancia y tiempo real

**Estado: ⏳ Pendiente.** No hay código asociado todavía; cada fase se detalla al iniciarla.

## Contexto

El modelo definido en el [documento de reglas](../../../docs/analisis-reglas-de-negocio.md) separa tres medidas de cada tarea simple o paso:
- **Avance del resultado:** porcentaje que indica el usuario.
- **Constancia:** sesiones exigibles realizadas.
- **Tiempo real:** minutos registrados en `WorkLog`.

Hoy el frontend mezcla las tres. Calcula el avance contando fechas marcadas en `completedDates` y toma como tiempo ejecutado la duración prevista. La diferencia exacta está en la [comparación con el código](../../../docs/estado-y-pendientes.md#comparación-con-el-código).

Decisiones ya tomadas:
- Los datos locales de prueba se reinician al cambiar el modelo; no se implementa migración.
- Se conserva la arquitectura actual: reglas puras en `core/rules` y estado en `PlannerService` (ver `../arquitectura.md`).

## RN y CU cubiertas

RN-24 a RN-37, RN-39 a RN-44, RN-51, RN-66 y RN-67 a RN-74. CU-17 a CU-21, CU-26, CU-27 y CU-28. Entidades `ExecutionSession`, `WorkLog` y `DailyRecord` (secciones 3.6 a 3.9).

## Archivos a tocar

- `core/models`: plan de ejecución sin `dates` ni `completedDates`; modelos nuevos de sesión y registro de trabajo; `DailyRecord` con el resumen nuevo; enum `SessionStatus` y sus etiquetas en `core/i18n`.
- `core/rules`: generación y regeneración de sesiones, constancia, avance manual y `NOT_NEEDED`, con sus specs.
- `core/providers`: contrato `DataProvider` y `LocalStorageService` para sesiones y registros de trabajo.
- `core/services/planner.service.ts`: acciones de avance, marcar y desmarcar, registro de minutos y cierre del día.
- `features/activities`, `features/daily`, `features/calendar` y, en la Fase 4, la pantalla de historial.
- `src/app/testing`: builders para sesiones y registros de trabajo.

## Fases

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Modelos, persistencia y reglas de `ExecutionSession` y `WorkLog` | ⏳ Pendiente |
| 2 | Avance manual de tareas simples y pasos, agregación de padres y sesiones `NOT_NEEDED` | ⏳ Pendiente |
| 3 | Agenda, calendario, registro de minutos reales y constancia | ⏳ Pendiente |
| 4 | `DailyRecord` con sesiones y minutos reales; historial y pruebas de reglas | ⏳ Pendiente |

## Decisiones que lo bloquean

Están en [estado-y-pendientes.md](../../../docs/estado-y-pendientes.md#decisiones-abiertas):

| Fase | Decisiones |
|------|------------|
| 1 | D-11 (sesión de hoy al editar el plan) y D-14 (corregir `WorkLog` o registrar días pasados) |
| 2 | D-10 (sesión de hoy al llegar a 100 %), D-16 (avance al cambiar de tipo) y D-18 (avance o trabajo en ítems pausados o al 100 %) |
| 3 | D-12 (constancia durante una pausa), D-15 (volver a marcar una sesión) y D-17 (constancia de los padres) |
| 4 | D-02 (destino tras cerrar el día) y D-13 (marcar después de cerrar) |

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Las pruebas citan las RN que cubren (`RN-67` a `RN-74`).
- Recorrido manual con el ejemplo de la sección 2 del documento de reglas. Debe dar 100 % de avance, 50 % de constancia y 120 minutos reales.

## Documentos a actualizar en cada fase

- La tabla de fases de este plan y su registro de avances.
- La fila correspondiente de «Comparación con el código» en `../../../docs/estado-y-pendientes.md`. Al resolverse una decisión, también se quita de esa lista.
- La columna Estado de `../funcionalidad.md` y el estado general de `../README.md`.
- `../arquitectura.md` si se agregan carpetas o modelos.

## Registro de avances

| Fecha | Cambio |
|-------|--------|
| 2026-10-23 | Plan creado. Se agregan contexto, archivos, decisiones que lo bloquean y verificación. |
| 2026-10-23 | Se aplican al documento de reglas las correcciones C-01 a C-12 que afectaban a este plan. |

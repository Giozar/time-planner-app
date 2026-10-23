# Plan 03: avance, constancia y tiempo real

**Estado: ⏳ Pendiente.** No hay código asociado todavía; cada fase se detalla al iniciarla.

## Contexto

El modelo definido en el [documento de reglas](../../../docs/analisis-reglas-de-negocio.md) separa tres medidas de cada tarea simple o paso:
- **Avance:** sesiones realizadas sobre todas las del plan. El frontend ya lo calcula así.
- **Constancia:** sesiones exigibles realizadas. No existe todavía.
- **Tiempo real:** minutos registrados en `WorkLog`. Hoy se guarda junto a la fecha marcada (`minutesByDate` en el plan de ejecución).

Lo que falta es pasar de `dates` y `completedDates` a `ExecutionSession` y `WorkLog`, y agregar la constancia. La diferencia exacta está en la [comparación con el código](../../../docs/estado-y-pendientes.md#comparación-con-el-código).

Decisiones ya tomadas:
- Reutiliza la fecha seleccionada de la agenda y el diálogo de minutos (`promptMinutes`), y pasa `minutesByDate` a `WorkLog`.
- Los datos locales de prueba se reinician al cambiar el modelo; no se implementa migración.
- Se conserva la arquitectura actual: reglas puras en `core/rules` y estado en `PlannerService` (ver `../arquitectura.md`).

## RN y CU cubiertas

RN-24 a RN-37, RN-39 a RN-44, RN-51, RN-66, RN-67 a RN-72 y RN-74. CU-17 a CU-19, CU-21, CU-26, CU-27 y CU-28. Entidades `ExecutionSession`, `WorkLog` y `DailyRecord` (secciones 3.6 a 3.9).

## Archivos a tocar

- `core/models`: plan de ejecución sin `dates` ni `completedDates`; modelos nuevos de sesión y registro de trabajo; `DailyRecord` con el resumen nuevo; enum `SessionStatus` y sus etiquetas en `core/i18n`.
- `core/rules`: generación y regeneración de sesiones, avance y constancia con sesiones, con sus specs.
- `core/providers`: contrato `DataProvider` y `LocalStorageService` para sesiones y registros de trabajo.
- `core/services/planner.service.ts`: marcar y desmarcar, registro de minutos y cierre del día.
- `features/activities`, `features/daily`, `features/calendar` y, en la Fase 3, la pantalla de historial.
- `src/app/testing`: builders para sesiones y registros de trabajo.

## Fases

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Modelos, persistencia y reglas de `ExecutionSession` y `WorkLog`; avance calculado con sesiones | ⏳ Pendiente |
| 2 | Agenda, calendario, registro de minutos reales y constancia | ⏳ Pendiente |
| 3 | `DailyRecord` con sesiones y minutos reales; historial y pruebas de reglas | ⏳ Pendiente |

## Decisiones que lo bloquean

Están en [estado-y-pendientes.md](../../../docs/estado-y-pendientes.md#decisiones-abiertas):

| Fase | Decisiones |
|------|------------|
| 1 | Ninguna |
| 2 | D-12 (constancia durante una pausa), D-17 (constancia de los padres) y D-18 (trabajo sin sesión en ítems pausados o al 100 %) |
| 3 | D-02 (destino tras cerrar el día) |

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Las pruebas citan las RN que cubren (`RN-67` a `RN-72` y `RN-74`).
- Recorrido manual con el ejemplo de la sección 2 del documento de reglas. Debe dar 25 % de avance, 50 % de constancia y 90 minutos reales.

## Documentos a actualizar en cada fase

- La tabla de fases de este plan.
- La fila correspondiente de «Comparación con el código» en `../../../docs/estado-y-pendientes.md`. Al resolverse una decisión, también se quita de esa lista.
- La columna Estado de `../funcionalidad.md` y el estado general de `../README.md`.
- `../arquitectura.md` si se agregan carpetas o modelos.

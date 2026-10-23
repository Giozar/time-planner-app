# Plan 04: agenda de días pasados

**Estado: ⏳ Pendiente.**

## Contexto

El usuario necesita recuperar lo que no marcó en días anteriores: navegar la agenda a otra fecha, marcar o desmarcar sus sesiones y cerrar ese día. Las reglas ya lo definen (RN-27, RN-44, RN-75).

Se implementa **sobre el modelo actual** (`completedDates` dentro del plan), recibiendo la fecha como parámetro para que el [plan 03](03-avance-constancia-tiempo-real.md) lo adapte a `ExecutionSession` y `WorkLog` sin rehacer las pantallas.

Decisiones tomadas por el usuario:
- Sin límite hacia atrás; las fechas futuras son de solo lectura.
- Marcar hoy registra los minutos previstos, sin preguntar. Marcar un día pasado pide los minutos, con los previstos como valor inicial.
- Desmarcar quita los minutos de esa sesión; volver a marcarla los registra de nuevo.
- El cierre no se recalcula solo: volver a cerrar un día lo sobrescribe (RN-43).
- El avance se calcula con las sesiones marcadas (RN-30), así que marcar días pasados también lo sube.

Los minutos de cada sesión marcada se guardan en el plan junto a su fecha (`completedMinutes`), para que el cierre los sume aunque el día no estuviera cerrado al marcarlo.

## RN y CU cubiertas

RN-25, RN-27, RN-28, RN-42 a RN-44 y RN-75. RN-71 y RN-72 en parte: el trabajo sin sesión y la constancia `null` llegan con el plan 03. CU-17, CU-18 y CU-19.

## Archivos a tocar

- `core/utils/date.utils.ts` y `core/rules`: validar fecha no futura, comparar fechas como texto `YYYY-MM-DD` y formatear la fecha para mostrarla, sin `new Date(string)` (RN-28), con sus specs.
- `core/models/activity.model.ts`: `completedMinutes` en el plan de ejecución.
- `core/services/planner.service.ts`: signal `selectedDate`; `todaysTasks` y `todaysMetrics` pasan a depender de ella (y se renombran, porque ya no son solo de hoy); `toggleTaskExecution` recibe la fecha y los minutos; `closeDay` recibe la fecha y suma `completedMinutes` en `executedTimeMin`.
- `features/daily/daily-dashboard`: barra de navegación (anterior, siguiente, selector de fecha, «Hoy»), fecha en el título, lectura de `?date=` (si no es válida, se usa hoy) y enlace al resumen con la misma fecha.
- `features/daily/daily-summary`: lee `?date=` y cierra esa fecha.
- `core/services/native-dialog.service.ts` y `shared/components/global-dialog`: entrada numérica para los minutos; el diálogo devuelve el número o nada si se cancela.
- `app.routes.ts`: sin rutas nuevas; la fecha viaja en `?date=`.

## Fases

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Reglas de fecha, `completedMinutes` y `PlannerService` con fecha seleccionada, marcado de días pasados y cierre de cualquier fecha, con pruebas | ⏳ Pendiente |
| 2 | Pantallas: navegación de fechas, diálogo de minutos y cierre de la fecha elegida | ⏳ Pendiente |

## Decisiones que lo bloquean

Ninguna. D-02 (destino tras cerrar el día) sigue abierta: mientras no se decida, se mantiene la redirección actual.

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Pruebas: marcar hoy registra los minutos previstos; marcar un día pasado registra los minutos indicados; rechazar un día futuro; desmarcar quita los minutos; volver a cerrar un día sobrescribe su cierre; `?date=` inválido muestra hoy; pasar de un mes a otro sin desfase de día.
- Recorrido manual: en `/daily`, ir tres días atrás, marcar una sesión con otros minutos, cerrar ese día y volver a hoy.

## Documentos a actualizar al terminar

- Tabla de fases de este plan.
- Fila «Agenda de días pasados» de «Comparación con el código» en `../../../docs/estado-y-pendientes.md`, y quitar el plan de «Trabajo pendiente».
- Columna Estado de `../funcionalidad.md` y estado general de `../README.md`.

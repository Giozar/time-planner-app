# Plan 04: agenda de días pasados

**Estado: ⏳ Pendiente.**

## Contexto

El usuario necesita recuperar lo que no marcó en días anteriores: navegar la agenda a otra fecha y marcar o desmarcar sus sesiones, y cerrar o actualizar el cierre de ese día. Las reglas ya lo definen (RN-27, RN-44, RN-71, RN-72, RN-75).

Se implementa **sobre el modelo actual** (`completedDates` dentro del plan), recibiendo la fecha como parámetro para que el [plan 03](03-avance-constancia-tiempo-real.md) lo adapte a `ExecutionSession` y `WorkLog` sin rehacer las pantallas. Mientras exista el modelo actual, los minutos reales de un día se guardan en `executedTimeMin` del `DailyRecord`.

Decisiones tomadas por el usuario:
- Sin límite hacia atrás; las fechas futuras son de solo lectura.
- Si un día cerrado cambia, su cierre se recalcula solo y conserva las notas.
- Al marcar un día pasado se piden minutos, con los previstos como valor inicial.

## RN y CU cubiertas

RN-25, RN-27, RN-28, RN-42 a RN-44, RN-71, RN-72, RN-75. CU-17, CU-18 y CU-19.

## Archivos a tocar

- `core/utils/date.utils.ts` y `core/rules`: validar fecha no futura y comparar fechas como texto `YYYY-MM-DD`, sin `new Date(string)` (B-01), con sus specs.
- `core/services/planner.service.ts`: signal `selectedDate`; `todaysTasks` y `todaysMetrics` pasan a depender de ella; `toggleTaskExecution` y `closeDay` reciben la fecha; recálculo automático del cierre existente.
- `features/daily/daily-dashboard`: barra de navegación (anterior, siguiente, selector de fecha, «Hoy»), fecha en el título y lectura de `?date=`.
- `features/daily/daily-summary`: cerrar la fecha elegida.
- `shared/components/global-dialog` y `native-dialog.service.ts`: entrada numérica para los minutos.
- `app.routes.ts`: sin rutas nuevas; la fecha viaja en `?date=`.

## Fases

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Reglas de fecha y `PlannerService` con fecha seleccionada, marcado de días pasados y recálculo del cierre, con pruebas | ⏳ Pendiente |
| 2 | Pantallas: navegación de fechas, diálogo de minutos y cierre de la fecha elegida | ⏳ Pendiente |

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Pruebas: marcar un día pasado, rechazar un día futuro, desmarcar, recalcular un cierre existente conservando las notas, y navegar por mes sin desfase de día.
- Recorrido manual: en `/daily`, ir tres días atrás, marcar una sesión, cerrar ese día y volver a hoy.

## Documentos a actualizar al terminar

- Tabla de fases de este plan.
- Fila «Agenda de días pasados» de «Comparación con el código» en `../../../docs/estado-y-pendientes.md`, y quitar el plan de «Trabajo pendiente».
- Columna Estado de `../funcionalidad.md` y estado general de `../README.md`.

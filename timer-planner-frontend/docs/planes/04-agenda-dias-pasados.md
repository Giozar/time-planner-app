# Plan 04: agenda de días pasados

## Contexto

El usuario necesita recuperar lo que no marcó en días anteriores: navegar la agenda a otra fecha, marcar o desmarcar sus sesiones con minutos reales y cerrar ese día. Las reglas están en RN-27, RN-44, RN-71, RN-72 y RN-75.

Se hace **sobre el modelo actual** (`completedDates` y `minutesByDate` dentro del plan) para que el [plan 03](03-avance-constancia-tiempo-real.md) lo reemplace por `ExecutionSession` y `WorkLog` sin rehacer las pantallas. El servicio ya recibe la fecha: `selectedDate`, `setSelectedDate`, `isSelectedDateReadOnly`, `agendaTasks`, `agendaMetrics`, `toggleTaskExecution(id, tipo, minutos?, fecha?)` y `closeDay(notas, fecha?)` (devuelve `null` si la fecha es futura).

## RN y CU cubiertas

RN-25, RN-27, RN-44, RN-71, RN-72, RN-75. CU-17, CU-18 y CU-19.

## Archivos a tocar

- `features/daily/daily-dashboard`: barra de navegación (día anterior, siguiente, selector de fecha, «Hoy»), fecha elegida en el título, lectura y escritura de `?date=` y solo lectura en fechas futuras.
- `features/daily/daily-summary`: cerrar la fecha de `?date=` y mostrar sus métricas; desactivar el cierre en fechas futuras.
- `shared/components/global-dialog` y `core/services/native-dialog.service.ts`: entrada numérica de minutos, con los previstos como valor inicial.
- `app.routes.ts`: sin rutas nuevas.

## Fases

| Fase | Alcance | Estado |
|------|---------|--------|
| 2 | Pantallas: navegación de fechas, diálogo de minutos y cierre de la fecha elegida | ⏳ Pendiente |

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Recorrido manual: en `/daily`, ir tres días atrás, marcar una sesión con minutos, cerrar ese día, volver a marcar y comprobar que el resumen se actualiza; abrir una fecha futura y ver que no se puede marcar.

## Documentos a actualizar al terminar

- Quitar este plan y la fila «Agenda de días pasados» de `../../../docs/estado-y-pendientes.md`.
- Quitar la referencia al plan 04 de `../funcionalidad.md` y `../README.md`.
- Dejar en `../funcionalidad.md` el comportamiento de la barra de fechas si no es una regla.

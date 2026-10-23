# Plan 02: calendario de sesiones

**Estado: ✅ Completado** (Fases 1 a 3). Lo que sigue pendiente está al final.

Este plan registra el calendario existente. Su adaptación a `ExecutionSession` se contempla en el [plan 03](03-avance-constancia-tiempo-real.md).

## Contexto

El usuario pidió una vista de **calendario** en el menú para ver, día por día, qué tareas y pasos se deben ejecutar, navegar a meses y años anteriores o posteriores, y al pasar el cursor sobre una sesión ver a qué meta, objetivo, tarea y paso pertenece. Se hizo después de las Fases 0 a 4b del plan 01 y antes de su Fase 5, para que las pruebas lo cubrieran.

Decisiones del usuario:
- **Visibilidad:** igual que la agenda de hoy (RN-29): se ocultan ítems de metas `PAUSED`/`IDEA` y de tareas `PAUSED`.
- **Solo consulta:** no se marca ejecución desde el calendario (RN-27).
- **Hover:** además de la jerarquía, muestra el **deadline del objetivo** y el **deadline efectivo de la tarea o del paso**. Los deadlines de los objetivos no se marcan como eventos aparte.
- **Regla registrada** en `../../../docs/analisis-reglas-de-negocio.md`: **RN-66** y **CU-26**.

Fuera de alcance: marcar ejecución desde el calendario, vista semanal o diaria, arrastrar para reprogramar, eventos de deadline de objetivos, historial (CU-21).

## RN y CU cubiertas

CU-26. RN-25, RN-26, RN-29 (visibilidad y estado), RN-27 (solo se marca hoy), RN-48 (deadline efectivo), RN-51 (las sesiones pasadas se conservan, así que se ven), RN-66.

## Estado de las fases

| Fase | Alcance | Estado | Commit |
|------|---------|--------|--------|
| Plan | Definición y registro de RN-66 / CU-26 | ✅ Completada | `f2706fd` |
| 1 | Reglas puras de calendario y modelo `CalendarEntry` | ✅ Completada | `2410c77` |
| 2 | Servicio: sesiones por fecha | ✅ Completada | `ec2e348` |
| 3 | Pantalla, ruta y menú | ✅ Completada | `44972ba` |

Las pruebas del calendario se escribieron en la Fase 5 del plan 01 (`53081be`).

## Qué se hizo

**Fase 1: reglas y modelo.**
- `core/rules/calendar-view.rules.ts`: `daysInMonth`, `buildMonthGrid` (6 semanas × 7 días, semana desde el lunes, celdas `{ date, inMonth }`), `shiftMonth` (cruza de año) y `shiftYear`. Sin Angular y sin `new Date(string)`.
- `core/models/calendar-entry.model.ts` y `MONTH_LABELS` en `core/i18n/labels.ts`.

**Fase 2: servicio.** En `PlannerService`, la visibilidad de RN-29 pasó a una sola señal privada, `visibleActivityIds`, que comparten `todaysTasks` y la nueva `calendarEntries`. Esta devuelve un `Map<fecha, CalendarEntry[]>` con las sesiones de tareas simples y pasos visibles, con meta, objetivo, deadline del objetivo, tarea y deadline efectivo, ordenadas por título dentro del día. La agenda no cambió de comportamiento.

**Fase 3: pantalla, ruta y menú.**
- `features/calendar/calendar-view`: cuadrícula mensual con hasta 3 sesiones por celda y "+N más", día actual resaltado, días de otros meses atenuados y sesiones completadas tachadas.
- Navegación con botones de año y mes anterior y siguiente, y "Hoy".
- Tarjeta con meta › objetivo (límite) › tarea › paso (límite) al pasar el cursor, enfocar con teclado o tocar. Al elegir un día, un panel lista el detalle de todas sus sesiones.
- En pantallas de 700 px o menos las sesiones se muestran como puntos y el panel del día muestra todo.
- Ruta `/calendar` y entrada "Calendario" (`calendar_month`) en el menú, entre "Agenda Hoy" y "Mis Metas".

## Verificación realizada

- `pnpm ng build` compila sin errores de tipos.
- Pruebas de `core/rules/calendar-view.rules.spec.ts` (febrero bisiesto y 2100, mes que empieza en domingo o lunes, cruce de año, saltos de varios meses) y del servicio (jerarquía, deadlines heredado y propio, orden, coincidencia con la agenda de hoy, completadas, pausas e ideas ocultas, borrado), con `TZ=UTC`, `America/Mexico_City` y `Pacific/Auckland`.

## Pendiente

- Recorrido manual en el navegador: una tarea con patrón semanal aparece solo en sus días; navegar a otro mes y año y volver con "Hoy"; pausar la meta y ver que desaparecen sus sesiones; hover, foco y toque muestran la jerarquía y los deadlines; el calendario y la agenda coinciden hoy.
- Decisiones por definir que lo afectan (D-03, D-04, D-09 y D-12): [estado-y-pendientes.md](../../../docs/estado-y-pendientes.md).

## Registro de avances

| Fecha | Cambio |
|-------|--------|
| 2026-10-22 | Plan definido y RN-66 / CU-26 registrados. Fases 1 a 3 completadas. |
| 2026-10-23 | Revisión de la documentación: se quitan los estados intermedios. |

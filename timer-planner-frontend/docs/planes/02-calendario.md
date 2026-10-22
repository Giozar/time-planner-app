# Plan: calendario de sesiones

## Context

El usuario quiere una vista de **calendario** en el menú para ver, día por día, qué tareas y pasos se deben ejecutar, poder navegar a meses y años anteriores o posteriores, y al pasar el cursor sobre una sesión ver a qué meta, objetivo, tarea y paso pertenece. Se hace después del plan 01 (Fases 0 a 4b) y antes de su Fase 5, para que las pruebas cubran también el calendario.

Decisiones tomadas por el usuario:
- **Visibilidad:** igual que la agenda de hoy (RN-29): se ocultan ítems de metas `PAUSED`/`IDEA` y de tareas `PAUSED`.
- **Solo consulta:** no se marca ejecución desde el calendario (RN-27).
- **Hover:** además de la jerarquía, se muestra el **deadline del objetivo** y el **deadline efectivo de la tarea o del paso**. Las fechas límite de los objetivos no se marcan como eventos aparte.
- **Regla registrada** en `../../docs/analisis-reglas-de-negocio.md`, con autorización del usuario: **RN-66** y **CU-26**.

Fuera de alcance: marcar ejecución desde el calendario, vista semanal o diaria, arrastrar para reprogramar, eventos de deadline de objetivos, historial (CU-21).

## Estado de avance

Estados: ⏳ Pendiente · 🔄 En curso · ✅ Completada.

| Fase | Alcance | Estado | Última actualización |
|------|---------|--------|----------------------|
| Plan | Definición y registro de RN-66 / CU-26 | ✅ Completada | 2026-10-22 |
| 1 | Reglas puras de calendario y modelo `CalendarEntry` | ✅ Completada (commit confirmado por el usuario) | 2026-10-22 |
| 2 | Servicio: sesiones por fecha | ✅ Completada (commit confirmado por el usuario) | 2026-10-22 |
| 3 | Pantalla, ruta y menú | ✅ Completada (commit confirmado por el usuario) | 2026-10-22 |

Las pruebas unitarias se escriben en la Fase 5 del plan 01.

**Regla:** una fase no se da por terminada hasta que su documentación esté al día (ver `docs/README.md`).

## RN y CU cubiertas

CU-26 (nuevo). RN-25, RN-26, RN-29 (visibilidad y estado), RN-27 (solo se marca hoy), RN-48 (deadline efectivo), RN-51 (las sesiones pasadas se conservan, así que se ven), RN-66 (nueva).

## Fase 1 — Reglas puras y modelo

- `src/app/core/rules/calendar-view.rules.ts` (sin Angular, sobre `calendar.rules.ts`, sin `new Date(string)`):
  - `daysInMonth(year, month)` y `buildMonthGrid(year, month)`: 6 semanas × 7 días, semana desde el lunes, cada celda `{ date, inMonth }`.
  - `shiftMonth(year, month, delta)` (cruza de año) y `shiftYear(year, month, delta)`.
- `src/app/core/models/calendar-entry.model.ts`: `CalendarEntry` con `date`, `sourceType` (`TaskSourceType`), `id`, `title`, `isCompleted`, `durationMin`, `goalTitle`, `objectiveTitle`, `objectiveDeadline`, `activityTitle`, `effectiveDeadline`.
- Etiquetas de mes en `core/i18n/labels.ts` (`MONTH_LABELS`).

**Al terminar:** `docs/arquitectura.md` (estructura actual), `docs/funcionalidad.md` y la tabla de este plan.

## Fase 2 — Servicio

Archivo: `core/services/planner.service.ts`.
- Extraer el filtro de visibilidad de `todaysTasks` a una función privada compartida, para que la agenda y el calendario nunca se desincronicen (RN-29, RN-66).
- Nueva señal `calendarEntries`: `Map<fecha, CalendarEntry[]>` con todas las sesiones de tareas simples y pasos visibles, ordenadas por título dentro del día. Resuelve meta, objetivo, tarea y deadline efectivo (`effectiveActivityDeadline`, `effectiveDeadline`).

**Al terminar:** `docs/funcionalidad.md` (transversal) y la tabla de este plan.

## Fase 3 — Pantalla, ruta y menú

- `src/app/features/calendar/calendar-view/` (componente standalone): cuadrícula del mes con las sesiones de cada día (máximo 3 visibles y "+N más"), día actual resaltado, días de otros meses atenuados, sesiones completadas tachadas.
- Navegación: botones de año anterior/siguiente, mes anterior/siguiente y "Hoy".
- Detalle: tooltip con meta › objetivo (límite) › tarea (límite) › paso (límite), visible al pasar el cursor y también al enfocar con teclado o al tocar. Al elegir un día, un panel lista el detalle de todas sus sesiones.
- Ruta `calendar` en `app.routes.ts` y entrada "Calendario" (icono `calendar_month`) en el menú de `main-layout`, entre "Agenda Hoy" y "Mis Metas".
- Etiquetas y textos solo mediante `core/i18n`; sin valores de enum en español en el código.

**Al terminar:** `docs/funcionalidad.md` (estado de la feature), `docs/README.md` (estado general), `docs/arquitectura.md` y la tabla de este plan.

## Archivos críticos

- Nuevos: `core/rules/calendar-view.rules.ts`, `core/models/calendar-entry.model.ts`, `features/calendar/calendar-view/*`.
- Modificados: `core/rules/index.ts`, `core/i18n/labels.ts`, `core/services/planner.service.ts`, `app.routes.ts`, `shared/layout/main-layout/main-layout.component.html`.

## Verificación

1. `pnpm ng build`: compila sin errores de tipos.
2. Pruebas (Fase 5 del plan 01): `buildMonthGrid` (febrero bisiesto, mes que empieza en domingo, cruce de año con `shiftMonth`), y que `calendarEntries` excluya metas `PAUSED`/`IDEA` y tareas `PAUSED`, con `TZ=America/Mexico_City`.
3. `pnpm ng serve` y recorrido manual: crear una tarea con patrón semanal y comprobar que aparece solo en sus días; navegar a otro mes y otro año y volver con "Hoy"; pausar la meta y ver que desaparecen sus sesiones; hover, foco y toque sobre una sesión muestran la jerarquía y los deadlines; el calendario y la agenda coinciden en el día de hoy.

## Registro de avances

| Fecha | Cambio |
|-------|--------|
| 2026-10-22 | Plan creado. Se registran RN-66 y CU-26 en `../../docs/analisis-reglas-de-negocio.md`. Ninguna fase iniciada. |
| 2026-10-22 | Fase 1 implementada, a la espera de validación. `core/rules/calendar-view.rules.ts` (`daysInMonth`, `buildMonthGrid` de 42 celdas con semana desde el lunes, `shiftMonth`, `shiftYear`), exportado en `core/rules/index.ts`; `core/models/calendar-entry.model.ts`; `MONTH_LABELS` en `core/i18n/labels.ts`. `tsc` pasa. Script temporal de 20 comprobaciones (febrero bisiesto y 2100, meses que empiezan en domingo y lunes, cruce de año, saltos de varios meses) pasa con `TZ=America/Mexico_City` y `Pacific/Auckland`; las pruebas formales van en la Fase 5 del plan 01. |
| 2026-10-22 | Fase 1 validada y confirmada con commit por el usuario. |
| 2026-10-22 | Fase 2 implementada, a la espera de validación. En `PlannerService`: la visibilidad (RN-29) pasa a una sola señal privada `visibleActivityIds`, compartida por `todaysTasks` y la nueva `calendarEntries` (`Map<fecha, CalendarEntry[]>`, tareas simples y pasos con meta, objetivo, deadline del objetivo, tarea y deadline efectivo; ordenadas por título dentro del día). Comportamiento de la agenda sin cambios. `tsc` pasa. Script temporal de 35 comprobaciones del servicio (23 previas + 12 del calendario: jerarquía, deadline heredado y propio, orden, coincidencia con la agenda de hoy, completadas, pausa de tarea y de meta, idea oculta, borrado) pasa con `TZ=America/Mexico_City` y `Pacific/Auckland`; las pruebas formales van en la Fase 5 del plan 01. |
| 2026-10-22 | Fase 2 validada y confirmada con commit por el usuario. |
| 2026-10-22 | Fase 3 implementada, a la espera de validación. Nuevo `features/calendar/calendar-view` (cuadrícula mensual de 42 celdas, semana desde el lunes; navegación de año y mes con botones y "Hoy"; hasta 3 sesiones por celda y "+N más"; tooltip con meta › objetivo (límite) › tarea › paso (límite) al pasar el cursor o enfocar con teclado; panel con el detalle del día al elegirlo; en pantallas ≤ 700 px las sesiones son puntos y el detalle del día muestra todo). Ruta `/calendar` en `app.routes.ts` y entrada "Calendario" (`calendar_month`) en el menú, entre "Agenda Hoy" y "Mis Metas". `pnpm ng build` pasa; el CSS del componente se recortó para quedar dentro del presupuesto de 4 kB. **Falta el recorrido manual en el navegador**; las pruebas formales van en la Fase 5 del plan 01. |
| 2026-10-22 | Fase 3 validada y confirmada con commit por el usuario. Las pruebas del calendario (reglas y servicio) se escribieron en la Fase 5 del plan 01. Queda el recorrido manual en el navegador. |

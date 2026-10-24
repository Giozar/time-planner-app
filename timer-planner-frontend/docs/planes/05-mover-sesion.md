# Plan 05 — Mover una sola sesión a otra fecha

## Contexto

Acordado con el usuario (antes P-02): una sesión de hoy o futura se puede mover a otra fecha sin tocar el resto del plan. Ejemplo: «Correr» es cada lunes; este lunes no se puede y esa sesión pasa al domingo. Los demás lunes siguen igual.

Decisiones tomadas:
- La fecha nueva es hoy o futura y no pasa el deadline efectivo. Puede coincidir con otra sesión del mismo ítem.
- Solo se mueven sesiones `PLANNED` de hoy o futuras de elementos abiertos.
- Al editar el plan, la sesión movida se conserva y su fecha original no se vuelve a generar.
- No hace falta una nota de «movida» en el calendario.

## RN y CU cubiertas

RN-82 y CU-30 (nuevas); cambian RN-27, RN-51, RN-69 y §3.6.

## Archivos a tocar

- `core/models`: `session.model` (`rescheduledFrom`), `agenda-item` y `calendar-entry` (id de sesión).
- `core/rules`: `session.rules` (mover y regenerar conservando las movidas).
- `core/services/planner.service`: `moveSession`, marcar por id de sesión.
- `features/daily/daily-dashboard`, `features/calendar/calendar-view`: botón «Mover» y listas por sesión.
- `features/activities` (formularios de tarea y paso): las sesiones movidas no aparecen como fechas editables.

## Fases

| Fase | Contenido | Estado |
|------|-----------|--------|
| 3 | Verificación: `pnpm ng test --watch=false`, `pnpm ng build` y recorrido manual (mover un lunes al domingo, intentar una fecha pasada o después del deadline, dos sesiones del mismo ítem en un día, editar el plan después de mover) | ⏳ Pendiente; la ejecuta el usuario |

## Documentos a actualizar

Al terminar cada fase: este plan y `funcionalidad.md`. Al terminar el plan, se borra según `Agents/funcionalidad/Agents-documentacion.md`.

## Decisiones que lo bloquean

Ninguna.

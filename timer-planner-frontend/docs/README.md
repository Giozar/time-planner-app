# Documentación del frontend

Esta carpeta reúne la documentación del frontend: funcionalidad, arquitectura y buenas prácticas. Es documentación de referencia; no contiene código.

## Índice

| Documento | Para qué sirve |
|-----------|----------------|
| [funcionalidad.md](funcionalidad.md) | Mapa de features: qué casos de uso y reglas de negocio aplican a cada carpeta. |
| [arquitectura.md](arquitectura.md) | Cómo está organizado el código, qué responsabilidad tiene cada capa y cómo evolucionará. |
| [buenas-practicas.md](buenas-practicas.md) | SOLID y Clean Code aplicados de forma ligera, convención de nombres y pruebas. |
| [planes/](planes/) | Planes de trabajo numerados. Hoy: `01-alinear-frontend-con-reglas-de-negocio.md` y `02-calendario.md`. |

## Cómo se relaciona con el resto del repositorio

- **Reglas de negocio (fuente de verdad):** `../../docs/analisis-reglas-de-negocio.md`, en la raíz del monorepo. Los documentos de esta carpeta la **referencian**; no la copian, para que no haya dos versiones que se desincronicen.
- **Planes de trabajo:** [planes/](planes/). Cada plan describe un bloque de trabajo concreto, como alinear el frontend con las reglas de negocio.
- **Agentes:** `../Agents/`. Empieza por el orquestador `../Agents/Agents.md`; el agente planificador está en `../Agents/funcionalidad/Agents-planner.md`.
- **Reglas de trabajo de los agentes:** `../Agents/reglas/Agents-alcance.md` y `../Agents/tecnologia/Agents-angular.md`.

## Alcance actual

El objetivo del momento es alinear la funcionalidad del frontend con las reglas de negocio. La arquitectura y las prácticas descritas aquí se irán aplicando después, de forma gradual. Cada documento indica qué es **estado actual** y qué es **objetivo**.

## Estado general (2026-10-22)

| Área | Estado |
|------|--------|
| Documentación base (`docs/`) | ✅ Completada |
| Código del frontend | Modelos y etiquetas (Fase 1), motor de reglas `core/rules` (Fase 2), `PlannerService` (Fase 3) y formularios, pantallas y diálogo (Fase 4) y deadline del objetivo (Fase 4b, en revisión). La app compila; falta el recorrido manual y las pruebas formales (Fase 5) |
| Agentes (`Agents/`) | ✅ Estructura creada, con el agente planificador (Fase 0) |
| Plan 01 | Fases 0 a 4b completadas. Fase 5 (pruebas) pendiente |
| Plan 02 (calendario) | Definido y registrado como RN-66 / CU-26. Fase 1 completada. Fase 2 en revisión. Fase 3 pendiente |

El avance detallado por fase está en [planes/01-alinear-frontend-con-reglas-de-negocio.md](planes/01-alinear-frontend-con-reglas-de-negocio.md).

## Mantenimiento de la documentación

**Regla:** el mismo cambio que implementa una fase actualiza sus documentos. Una fase no se da por terminada hasta que la documentación esté al día. Esto aplica a las personas y a los agentes.

| Si cambia... | Se actualiza |
|--------------|--------------|
| El avance de una fase | La tabla de Estado de avance y el Registro de avances del plan, y el estado general de este README |
| El estado de una feature | La columna Estado de `funcionalidad.md` |
| La estructura de carpetas o capas | `arquitectura.md` (estructura actual y estado de implementación) |
| Una regla de negocio | `../../docs/analisis-reglas-de-negocio.md` (fuente de verdad) y, si cambia el mapa, `funcionalidad.md` |
| Una convención o práctica | `buenas-practicas.md` |
| Un agente nuevo, movido o modificado | La tabla de delegación de `../Agents/Agents.md` y el historial de este README |

Cada actualización se anota en el historial de abajo.

## Historial

| Fecha | Cambio |
|-------|--------|
| 2026-10-20 | Se crea la documentación base y el plan 01. |
| 2026-10-21 | El plan pasa a `planes/` con nombre claro. Se agregan estado de avance, regla de mantenimiento y columnas de estado. |
| 2026-10-21 | Se organiza `Agents/` (orquestador, reglas, tecnología, funcionalidad). `AGENTS-angular.md` pasa a `Agents/tecnologia/Agents-angular.md`. Se crea el agente planificador. |
| 2026-10-22 | Fase 1 (completada): enums en inglés, `core/i18n`, `shared/pipes`, claves `planner_v3_*`. Se actualizan plan 01, `arquitectura.md` y `funcionalidad.md`. |
| 2026-10-22 | Fase 2 (en revisión): `core/rules` con las reglas puras y `DateUtils` sin `generateDatesFromPattern`. Se actualizan plan 01, `arquitectura.md` y `funcionalidad.md`. |
| 2026-10-22 | Fase 3 (en revisión): `PlannerService` reescrito sobre `core/rules`; nuevos modelos `agenda-item` y `deletion-impact`. Se actualizan plan 01, `arquitectura.md` y `funcionalidad.md`. |
| 2026-10-22 | Fase 4 (en revisión): formularios, pantallas y diálogo con confirmación escrita alineados a las reglas. |
| 2026-10-22 | Fase 4b (en revisión): cambio de regla — la meta no tiene fecha y el objetivo tiene deadline obligatorio (RN-65). Se actualiza también `../../docs/analisis-reglas-de-negocio.md`, plan 01 y `funcionalidad.md`. |
| 2026-10-22 | Se define el plan 02 (calendario) y se registran RN-66 y CU-26 en `../../docs/analisis-reglas-de-negocio.md`. Fases 4 y 4b del plan 01 confirmadas con commit. |
| 2026-10-22 | Plan 02, Fase 1 (en revisión): reglas puras de calendario (`calendar-view.rules.ts`), modelo `calendar-entry` y `MONTH_LABELS`. Se actualizan plan 02, `arquitectura.md` y `funcionalidad.md`. |
| 2026-10-22 | Plan 02, Fase 2 (en revisión): `calendarEntries` en `PlannerService` y visibilidad compartida con la agenda. Se actualizan plan 02 y `funcionalidad.md`. |

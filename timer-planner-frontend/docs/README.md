# Documentación del frontend

Esta carpeta reúne la documentación del frontend: funcionalidad, arquitectura y buenas prácticas. Es documentación de referencia; no contiene código.

## Índice

| Documento | Para qué sirve |
|-----------|----------------|
| [funcionalidad.md](funcionalidad.md) | Mapa de features: qué casos de uso y reglas de negocio aplican a cada carpeta. |
| [arquitectura.md](arquitectura.md) | Cómo está organizado el código, qué responsabilidad tiene cada capa y cómo puede evolucionar. |
| [buenas-practicas.md](buenas-practicas.md) | SOLID y Clean Code aplicados de forma ligera, convención de nombres y pruebas. |
| [planes/](planes/) | Planes de trabajo numerados: `01-alinear-frontend-con-reglas-de-negocio.md` y `02-calendario.md`. |

## Cómo se relaciona con el resto del repositorio

- **Reglas de negocio (fuente de verdad):** `../../docs/analisis-reglas-de-negocio.md`, en la raíz del monorepo. Los documentos de esta carpeta la **referencian**; no la copian, para que no haya dos versiones que se desincronicen.
- **Planes de trabajo:** [planes/](planes/). Cada plan describe un bloque de trabajo concreto y deja registrado lo que se hizo.
- **Agentes:** `../Agents/`. Empieza por el orquestador `../Agents/Agents.md`; el agente planificador está en `../Agents/funcionalidad/Agents-planner.md`.
- **Reglas de trabajo de los agentes:** `../Agents/reglas/Agents-alcance.md` y `../Agents/tecnologia/Agents-angular.md`.

## Estado general (2026-10-23)

| Área | Estado |
|------|--------|
| Documentación base (`docs/`) | ✅ Completada |
| Agentes (`Agents/`) | ✅ Completados, con el agente planificador |
| Plan 01: alinear con las reglas de negocio | ✅ Completado (Fases 0 a 5) |
| Plan 02: calendario | ✅ Completado (Fases 1 a 3) |
| Código del frontend | ✅ Alineado con las reglas y casos de uso implementados; 101 pruebas con Vitest |

El detalle de lo hecho está en [planes/](planes/).

## Pendiente

- **Recorrido manual** en el navegador (`pnpm ng serve`) de los casos de uso implementados. Las pruebas automáticas cubren la lógica, no la interfaz.
- **Aviso de presupuesto de CSS** en `objective-detail` (5,6 kB sobre 4 kB).
- **Decisiones por definir:** están en la sección 9 de `../../docs/analisis-reglas-de-negocio.md` (sesiones atrasadas, objetivo vencido, pausa de objetivo, ideas, edición de elementos completados, API del calendario, entre otras).

## Mantenimiento de la documentación

**Regla:** el mismo cambio que implementa una fase actualiza sus documentos.

**Estados:** solo existen **⏳ Pendiente** y **✅ Completada**. No se usan estados intermedios (en curso, en revisión, a la espera de validación): mientras se trabaja algo sigue Pendiente, y se marca Completada al terminarlo, con su documentación al día.

| Si cambia... | Se actualiza |
|--------------|--------------|
| El avance de una fase | La tabla de estado y el registro de avances del plan, y el estado general de este README |
| El estado de una feature | La columna Estado de `funcionalidad.md` |
| La estructura de carpetas o capas | `arquitectura.md` (estructura actual) |
| Una regla de negocio | `../../docs/analisis-reglas-de-negocio.md` (fuente de verdad, solo con autorización explícita del usuario) y, si cambia el mapa, `funcionalidad.md` |
| Una convención o práctica | `buenas-practicas.md` |
| Un agente nuevo, movido o modificado | La tabla de delegación de `../Agents/Agents.md` y el historial de este README |

Cada actualización se anota en el historial de abajo.

## Historial

| Fecha | Cambio |
|-------|--------|
| 2026-10-20 | Se crea la documentación base y el plan 01. |
| 2026-10-21 | El plan pasa a `planes/`. Se organiza `Agents/` (orquestador, reglas, tecnología, funcionalidad) y se crea el agente planificador. |
| 2026-10-22 | Plan 01, Fases 1 a 3: enums en inglés, `core/i18n`, `shared/pipes`, `core/rules` y `PlannerService` reescrito. |
| 2026-10-22 | Plan 01, Fase 4: formularios, pantallas y diálogo con confirmación escrita. |
| 2026-10-22 | Plan 01, Fase 4b: cambio de regla pedido por el usuario. La meta no tiene fecha y el objetivo tiene deadline obligatorio (RN-65). |
| 2026-10-22 | Plan 02 (calendario): se registran RN-66 y CU-26 y se implementan las reglas, el servicio y la pantalla. |
| 2026-10-22 | Plan 01, Fase 5: 101 pruebas con Vitest y helpers en `src/app/testing`. |
| 2026-10-23 | Documentación de reglas y planes actualizada; las decisiones abiertas quedan en la sección 9 del documento de reglas. |

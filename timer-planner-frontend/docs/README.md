# Documentación del frontend

Esta carpeta reúne la documentación del frontend: funcionalidad, arquitectura y buenas prácticas. Es documentación de referencia; no contiene código.

## Índice

| Documento | Para qué sirve |
|-----------|----------------|
| [funcionalidad.md](funcionalidad.md) | Mapa de features: qué casos de uso y reglas de negocio aplican a cada carpeta. |
| [arquitectura.md](arquitectura.md) | Cómo está organizado el código, qué responsabilidad tiene cada capa y cómo puede evolucionar. |
| [buenas-practicas.md](buenas-practicas.md) | SOLID y Clean Code aplicados de forma ligera, convención de nombres y pruebas. |
| [planes/](planes/) | Planes de trabajo numerados: `01-alinear-frontend-con-reglas-de-negocio.md`, `02-calendario.md` y `03-avance-constancia-tiempo-real.md`. |

## Cómo se relaciona con el resto del repositorio

- **Reglas de negocio (fuente de verdad):** `../../docs/analisis-reglas-de-negocio.md`, en la raíz del monorepo. El [estado de implementación](../../docs/estado-y-pendientes.md) compara las reglas con el código.
- **Planes de trabajo:** [planes/](planes/). Cada plan describe un bloque de trabajo concreto y deja registrado lo que se hizo.
- **Agentes:** `../Agents/`. Empieza por el orquestador `../Agents/Agents.md`; el agente planificador está en `../Agents/funcionalidad/Agents-planner.md`.
- **Reglas de trabajo de los agentes:** `../Agents/reglas/Agents-alcance.md` y `../Agents/tecnologia/Agents-angular.md`.

## Estado general (2026-10-23)

| Área | Estado |
|------|--------|
| Documentación base (`docs/`) | ✅ Completada |
| Agentes (`Agents/`) | ✅ Completados: planificador y, en la raíz, agente de documentación |
| Plan 01: alinear con las reglas de negocio | ✅ Completado (Fases 0 a 5) |
| Plan 02: calendario | ✅ Completado (Fases 1 a 3) |
| Plan 03: avance, constancia y tiempo real | ⏳ Pendiente |
| Código del frontend | ⏳ Pendiente: funciona con el modelo anterior (planes 01 y 02); falta el modelo del plan 03. 101 pruebas con Vitest. |

El detalle de lo hecho está en [planes/](planes/).

## Pendiente

- **Recorrido manual** en el navegador (`pnpm ng serve`) de los casos de uso implementados. Las pruebas automáticas cubren la lógica, no la interfaz.
- **Aviso de presupuesto de CSS** en `objective-detail` (5,6 kB sobre 4 kB).
- **Plan 03** y las decisiones que lo bloquean.
- **Decisiones por definir (`D-xx`) y correcciones a las reglas (`C-xx`):** están en [estado-y-pendientes.md](../../docs/estado-y-pendientes.md).

## Mantenimiento de la documentación

**Regla:** el mismo cambio que implementa una fase actualiza sus documentos.

**Estados y convenciones:** ver [../../Agents/funcionalidad/Agents-documentacion.md](../../Agents/funcionalidad/Agents-documentacion.md).

| Si cambia... | Se actualiza |
|--------------|--------------|
| El avance de una fase | La tabla de estado y el registro de avances del plan, y el estado general de este README |
| El estado de una feature | La columna Estado de `funcionalidad.md` |
| La estructura de carpetas o capas | `arquitectura.md` (estructura actual) |
| Una regla de negocio | `../../docs/analisis-reglas-de-negocio.md` (fuente de verdad: solo reglas acordadas) y, si cambia el mapa, `funcionalidad.md` |
| Lo implementado frente a las reglas | «Comparación con el código» de `../../docs/estado-y-pendientes.md` |
| Una propuesta nueva, una duda, una decisión tomada o una inconsistencia en las reglas | «Propuestas en discusión», «Decisiones abiertas» o «Correcciones pendientes» de `../../docs/estado-y-pendientes.md` (ver `../../Agents/funcionalidad/Agents-documentacion.md`) |
| Una convención o práctica | `buenas-practicas.md` |
| Un agente nuevo, movido o modificado | Lo indicado en «Documento o agente nuevo» de `../../Agents/funcionalidad/Agents-documentacion.md` |

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
| 2026-10-23 | Documentación de reglas y planes actualizada. |
| 2026-10-23 | Modelo de avance, constancia y tiempo real definido en las reglas; comparación con el código y plan 03 separados. |
| 2026-10-23 | Revisión de la documentación: `estado-y-pendientes.md` reúne la comparación, el trabajo pendiente, las decisiones D-01 a D-18 y las correcciones C-01 a C-12. El plan 03 pasa al formato del planificador. Se crea el agente de documentación en la raíz. |
| 2026-10-23 | Se aplican las correcciones C-01 a C-12 al documento de reglas. La documentación se modifica sin pedir autorización cuando el usuario lo pide; las reglas nuevas se discuten antes como propuestas `P-xx`. |

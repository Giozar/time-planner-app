# Documentación del frontend

Esta carpeta reúne la documentación del frontend: funcionalidad, arquitectura y buenas prácticas. Es documentación de referencia; no contiene código.

Las rutas escritas como texto empiezan en la raíz del monorepo (`time-planner-app/`), por ejemplo `timer-planner-frontend/docs/funcionalidad.md`; los enlaces apuntan de forma relativa a este archivo para que funcionen al hacer clic.

## Índice

| Documento | Para qué sirve |
|-----------|----------------|
| [funcionalidad.md](funcionalidad.md) | Mapa de features: qué casos de uso y reglas de negocio aplican a cada carpeta. |
| [arquitectura.md](arquitectura.md) | Cómo está organizado el código, qué responsabilidad tiene cada capa y cómo puede evolucionar. |
| [buenas-practicas.md](buenas-practicas.md) | SOLID y Clean Code aplicados de forma ligera, convención de nombres y pruebas. |
| [planes/](planes/) | Planes de trabajo **por hacer**: [01-flujo-principal.md](planes/01-flujo-principal.md). Un plan terminado se borra: su historia está en git. |

## Cómo se relaciona con el resto del repositorio

- **Reglas de negocio (fuente de verdad):** `docs/analisis-reglas-de-negocio.md`. El [estado de implementación](../../docs/estado-y-pendientes.md) compara las reglas con el código.
- **Agentes:** `timer-planner-frontend/Agents/`. Empieza por el orquestador `timer-planner-frontend/Agents/Agents.md`; el agente planificador está en `timer-planner-frontend/Agents/funcionalidad/Agents-planner.md`.
- **Reglas de trabajo de los agentes:** `Agents/reglas/Agents-alcance.md` (monorepo), `timer-planner-frontend/Agents/reglas/Agents-alcance.md` y `timer-planner-frontend/Agents/tecnologia/Agents-angular.md`.

## Pendientes y mantenimiento

- **Lo pendiente** está en [docs/estado-y-pendientes.md](../../docs/estado-y-pendientes.md).
- **Qué documento actualizar según el cambio:** «Qué documento tocar según el cambio» en [Agents/funcionalidad/Agents-documentacion.md](../../Agents/funcionalidad/Agents-documentacion.md). El mismo cambio que modifica el código actualiza sus documentos.

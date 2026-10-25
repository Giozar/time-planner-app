# Agents — monorepo time-planner-app

Punto de entrada de todos los agentes del repositorio. Cada proyecto tiene además su propio orquestador.

## Siempre

- [Agents/reglas/Agents-alcance.md](reglas/Agents-alcance.md): límite de trabajo, comandos, análisis y revisión (sin modificar nada), implementación (tamaño del cambio, conflictos con las reglas y fases), documentación y estilo de respuesta.

## Proyectos

| Proyecto | Orquestador |
|----------|-------------|
| Frontend (Angular) | [timer-planner-frontend/Agents/Agents.md](../timer-planner-frontend/Agents/Agents.md) |
| Backend (NestJS) | [timer-planner-backend/Agents/Agents.md](../timer-planner-backend/Agents/Agents.md) |

## Agentes del monorepo

| Tarea | Agente |
|-------|--------|
| Commits, ramas y flujo de trabajo en git | [Agents/tecnologia/Agents-git-monorepo.md](tecnologia/Agents-git-monorepo.md) |
| Revisar o actualizar documentación, discutir una propuesta nueva, registrar una decisión por definir, saber qué está pendiente o agregar un agente | [Agents/funcionalidad/Agents-documentacion.md](funcionalidad/Agents-documentacion.md) |

## Documentación del producto

[docs/analisis-reglas-de-negocio.md](../docs/analisis-reglas-de-negocio.md) (lo definido) y [docs/estado-y-pendientes.md](../docs/estado-y-pendientes.md) (lo pendiente y por definir). Qué va en cada uno y cómo se mantienen: [Agents/funcionalidad/Agents-documentacion.md](funcionalidad/Agents-documentacion.md).

## Organización

- **Nombre:** `Agents-<tema>.md`. Los orquestadores son `Agents.md`.
- **Carpetas:** `reglas/` (aplican siempre), `tecnologia/` (herramientas y frameworks) y `funcionalidad/` (un agente por tarea o feature).
- **Rutas:** en todos los agentes y documentos, una ruta escrita como texto empieza en la raíz del monorepo (`time-planner-app/`), por ejemplo `timer-planner-frontend/docs/funcionalidad.md`. Los enlaces apuntan de forma relativa al archivo que los contiene, para que funcionen al hacer clic, y su texto muestra la ruta desde la raíz. Dentro de un documento de un proyecto, las carpetas de código (`core/rules`, `src/app/testing`) son de ese proyecto.

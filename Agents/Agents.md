# Agents — monorepo time-planner-app

Punto de entrada de todos los agentes del repositorio. Cada proyecto tiene además su propio orquestador.

## Siempre

- [reglas/Agents-alcance.md](reglas/Agents-alcance.md): límite de trabajo, comandos, documentación y estilo de respuesta.

## Proyectos

| Proyecto | Orquestador |
|----------|-------------|
| Frontend (Angular) | [../timer-planner-frontend/Agents/Agents.md](../timer-planner-frontend/Agents/Agents.md) |
| Backend (NestJS) | [../timer-planner-backend/Agents/Agents.md](../timer-planner-backend/Agents/Agents.md) |

## Agentes del monorepo

| Tarea | Agente |
|-------|--------|
| Commits, ramas y flujo de trabajo en git | [tecnologia/Agents-git-monorepo.md](tecnologia/Agents-git-monorepo.md) |
| Revisar o actualizar documentación, discutir una propuesta nueva, registrar una decisión por definir, saber qué está pendiente o agregar un agente | [funcionalidad/Agents-documentacion.md](funcionalidad/Agents-documentacion.md) |

`tecnologia/Agents-git-commits.md` es solo una plantilla genérica para reutilizar en otros proyectos; en este repositorio aplica `Agents-git-monorepo.md`.

## Documentación del producto

[../docs/analisis-reglas-de-negocio.md](../docs/analisis-reglas-de-negocio.md) (lo definido) y [../docs/estado-y-pendientes.md](../docs/estado-y-pendientes.md) (lo pendiente y por definir). Qué va en cada uno y cómo se mantienen: [funcionalidad/Agents-documentacion.md](funcionalidad/Agents-documentacion.md).

## Organización

- **Nombre:** `Agents-<tema>.md`. Los orquestadores son `Agents.md`.
- **Carpetas:** `reglas/` (aplican siempre), `tecnologia/` (herramientas y frameworks) y `funcionalidad/` (un agente por tarea o feature).

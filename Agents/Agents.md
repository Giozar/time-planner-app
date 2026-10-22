# Agents — monorepo time-planner-app

Índice de los agentes del repositorio. Cada proyecto tiene su propio orquestador con la misma estructura.

## Proyectos

| Proyecto | Orquestador |
|----------|-------------|
| Frontend (Angular) | [timer-planner-frontend/Agents/Agents.md](../timer-planner-frontend/Agents/Agents.md) |
| Backend (NestJS) | [timer-planner-backend/Agents/Agents.md](../timer-planner-backend/Agents/Agents.md) |

## Agentes del monorepo

| Tarea | Agente |
|-------|--------|
| Commits, ramas y flujo de trabajo en git | [tecnologia/Agents-git-monorepo.md](tecnologia/Agents-git-monorepo.md) |
| Guía genérica de commits semánticos (el anterior es su versión para monorepo) | [tecnologia/Agents-git-commits.md](tecnologia/Agents-git-commits.md) |

## Reglas de negocio

La fuente de verdad es [../docs/analisis-reglas-de-negocio.md](../docs/analisis-reglas-de-negocio.md).

## Convención

- **Nombre:** `Agents-<tema>.md`. Los orquestadores son `Agents.md`.
- **Carpetas:** `reglas/` (aplican siempre), `tecnologia/` (herramientas y frameworks) y `funcionalidad/` (un agente por tarea o feature).
- **Agregar un agente:** créalo en la carpeta que corresponda y regístralo en la tabla del orquestador de su proyecto.

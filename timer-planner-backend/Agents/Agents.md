# Agents — timer-planner-backend

Orquestador de este proyecto: indica qué otros archivos cargar según la tarea. Antes de usarlo, lee el orquestador del monorepo, `Agents/Agents.md`, y sus reglas generales. Las rutas escritas como texto empiezan en la raíz del monorepo (`time-planner-app/`).

## Siempre

- [timer-planner-backend/Agents/reglas/Agents-alcance.md](reglas/Agents-alcance.md): reglas propias de este proyecto.

## Según la tarea

| Si la tarea es... | Delega en |
|-------------------|-----------|
| Instalar dependencias, ejecutar scripts o generar código NestJS | [timer-planner-backend/Agents/tecnologia/Agents-nestjs.md](tecnologia/Agents-nestjs.md) |
| Implementar o corregir código, aunque sea un cambio pequeño | «Implementación» de `Agents/reglas/Agents-alcance.md` (conflictos con las reglas y fases) y «Qué documento tocar según el cambio» de `Agents/funcionalidad/Agents-documentacion.md` |
| Crear o revisar commits y ramas (afecta a todo el monorepo) | `Agents/tecnologia/Agents-git-monorepo.md` |
| Revisar o actualizar documentación, consultar qué está por definir o agregar un agente | `Agents/funcionalidad/Agents-documentacion.md` |

## Organización de esta carpeta

```
Agents/
├── Agents.md          este orquestador
├── reglas/            aplican siempre
├── tecnologia/        herramientas y frameworks
└── funcionalidad/     un agente por tarea o feature (todavía vacía)
```

- **Nombre:** `Agents-<tema>.md`. El orquestador es `Agents.md`.
- **Agregar un agente:** ver `Agents/funcionalidad/Agents-documentacion.md`.

## Reglas de negocio

En la raíz del monorepo: `docs/analisis-reglas-de-negocio.md` (modelo de datos en la sección 7 y API en la 8) y `docs/estado-y-pendientes.md` (estado del backend y decisiones que lo bloquean).

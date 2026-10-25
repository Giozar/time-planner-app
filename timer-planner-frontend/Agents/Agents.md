# Agents — timer-planner-frontend

Orquestador de este proyecto: indica qué otros archivos cargar según la tarea. Antes de usarlo, lee el orquestador del monorepo, `Agents/Agents.md`, y sus reglas generales. Las rutas escritas como texto empiezan en la raíz del monorepo (`time-planner-app/`).

## Siempre

- [timer-planner-frontend/Agents/reglas/Agents-alcance.md](reglas/Agents-alcance.md): reglas propias de este proyecto.

## Según la tarea

| Si la tarea es... | Delega en |
|-------------------|-----------|
| Instalar dependencias, ejecutar scripts o generar código Angular | [timer-planner-frontend/Agents/tecnologia/Agents-angular.md](tecnologia/Agents-angular.md) |
| Planificar cómo alinear una feature con las reglas de negocio | [timer-planner-frontend/Agents/funcionalidad/Agents-planner.md](funcionalidad/Agents-planner.md) |
| Implementar o corregir código, aunque sea un cambio pequeño | [timer-planner-frontend/Agents/funcionalidad/Agents-planner.md](funcionalidad/Agents-planner.md) (conflictos con las reglas y fases) y «Qué documento tocar según el cambio» de `Agents/funcionalidad/Agents-documentacion.md` |
| Crear o revisar commits y ramas (afecta a todo el monorepo) | `Agents/tecnologia/Agents-git-monorepo.md` |
| Revisar o actualizar documentación, consultar qué está por definir o agregar un agente | `Agents/funcionalidad/Agents-documentacion.md` |

## Organización de esta carpeta

```
Agents/
├── Agents.md          este orquestador
├── reglas/            aplican siempre
├── tecnologia/        herramientas y frameworks
└── funcionalidad/     un agente por tarea o feature
```

- **Nombre:** `Agents-<tema>.md`. El orquestador es `Agents.md`.
- **Agregar un agente:** ver `Agents/funcionalidad/Agents-documentacion.md`.

## Documentación del proyecto

La documentación está en [timer-planner-frontend/docs/README.md](../docs/README.md): funcionalidad, arquitectura, buenas prácticas y planes.

En la raíz del monorepo: las reglas definidas en `docs/analisis-reglas-de-negocio.md` y lo pendiente o por definir en `docs/estado-y-pendientes.md`.

# Agents — timer-planner-frontend

Orquestador de este proyecto: indica qué otros archivos cargar según la tarea. Antes de usarlo, lee el orquestador del monorepo, `../../Agents/Agents.md` (desde esta carpeta), y sus reglas generales.

## Siempre

- [reglas/Agents-alcance.md](reglas/Agents-alcance.md): reglas propias de este proyecto.

## Según la tarea

| Si la tarea es... | Delega en |
|-------------------|-----------|
| Instalar dependencias, ejecutar scripts o generar código Angular | [tecnologia/Agents-angular.md](tecnologia/Agents-angular.md) |
| Planificar cómo alinear una feature con las reglas de negocio | [funcionalidad/Agents-planner.md](funcionalidad/Agents-planner.md) |
| Crear o revisar commits y ramas (afecta a todo el monorepo) | `../../Agents/tecnologia/Agents-git-monorepo.md`, en la raíz del repositorio |
| Revisar o actualizar documentación, consultar qué está por definir o agregar un agente | `../../Agents/funcionalidad/Agents-documentacion.md`, en la raíz del repositorio |

## Organización de esta carpeta

```
Agents/
├── Agents.md          este orquestador
├── reglas/            aplican siempre
├── tecnologia/        herramientas y frameworks
└── funcionalidad/     un agente por tarea o feature
```

- **Nombre:** `Agents-<tema>.md`. El orquestador es `Agents.md`.
- **Agregar un agente:** ver `../../Agents/funcionalidad/Agents-documentacion.md`.

## Documentación del proyecto

La documentación está en [../docs/README.md](../docs/README.md): funcionalidad, arquitectura, buenas prácticas y planes.

Fuera de esta carpeta, en la raíz del monorepo: las reglas definidas en `../../docs/analisis-reglas-de-negocio.md` y lo pendiente o por definir en `../../docs/estado-y-pendientes.md`.

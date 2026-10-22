# Agents — timer-planner-frontend

Punto de entrada de los agentes de este proyecto. Léelo primero: indica qué otros archivos cargar según la tarea.

## Siempre

- [reglas/Agents-alcance.md](reglas/Agents-alcance.md): alcance, permisos y estilo de respuesta.

## Según la tarea

| Si la tarea es... | Delega en |
|-------------------|-----------|
| Instalar dependencias, ejecutar scripts o generar código Angular | [tecnologia/Agents-angular.md](tecnologia/Agents-angular.md) |
| Planificar cómo alinear una feature con las reglas de negocio | [funcionalidad/Agents-planner.md](funcionalidad/Agents-planner.md) |
| Crear o revisar commits y ramas (afecta a todo el monorepo) | `../../Agents/tecnologia/Agents-git-monorepo.md`, en la raíz del repositorio |

## Organización de esta carpeta

```
Agents/
├── Agents.md          este orquestador
├── reglas/            aplican siempre
├── tecnologia/        herramientas y frameworks
└── funcionalidad/     un agente por tarea o feature
```

- **Nombre:** `Agents-<tema>.md`. El orquestador es `Agents.md`.
- **Agregar un agente:** créalo en la carpeta que corresponda o crea un nueva carpeta si es ncesario, regístralo en la tabla de arriba y anótalo en el historial de `../docs/README.md`.

## Documentación del proyecto

La documentación está en [../docs/README.md](../docs/README.md): funcionalidad, arquitectura, buenas prácticas y planes.

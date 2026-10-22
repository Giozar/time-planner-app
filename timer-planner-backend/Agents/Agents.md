# Agents — timer-planner-backend

Punto de entrada de los agentes de este proyecto. Léelo primero: indica qué otros archivos cargar según la tarea.

## Siempre

- [reglas/Agents-alcance.md](reglas/Agents-alcance.md): alcance, permisos y estilo de respuesta.

## Según la tarea

| Si la tarea es... | Delega en |
|-------------------|-----------|
| Instalar dependencias, ejecutar scripts o generar código NestJS | [tecnologia/Agents-nestjs.md](tecnologia/Agents-nestjs.md) |
| Crear o revisar commits y ramas (afecta a todo el monorepo) | `../../Agents/tecnologia/Agents-git-monorepo.md`, en la raíz del repositorio |

Todavía no hay agentes de funcionalidad. Cuando existan, irán en `funcionalidad/` y se registrarán en esta tabla.

## Organización de esta carpeta

```
Agents/
├── Agents.md          este orquestador
├── reglas/            aplican siempre
├── tecnologia/        herramientas y frameworks
└── funcionalidad/     (pendiente) un agente por tarea o feature
```

- **Nombre:** `Agents-<tema>.md`. El orquestador es `Agents.md`.
- **Agregar un agente:** créalo en la carpeta que corresponda y regístralo en la tabla de arriba.

## Reglas de negocio

La fuente de verdad es `docs/analisis-reglas-de-negocio.md` en la raíz del monorepo. El backend aún no está implementado; hoy es el proyecto base de NestJS.

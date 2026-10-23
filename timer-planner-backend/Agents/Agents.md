# Agents — timer-planner-backend

Orquestador de este proyecto: indica qué otros archivos cargar según la tarea. Antes de usarlo, lee el orquestador del monorepo, `../../Agents/Agents.md` (desde esta carpeta), y sus reglas generales.

## Siempre

- [reglas/Agents-alcance.md](reglas/Agents-alcance.md): reglas propias de este proyecto.

## Según la tarea

| Si la tarea es... | Delega en |
|-------------------|-----------|
| Instalar dependencias, ejecutar scripts o generar código NestJS | [tecnologia/Agents-nestjs.md](tecnologia/Agents-nestjs.md) |
| Crear o revisar commits y ramas (afecta a todo el monorepo) | `../../Agents/tecnologia/Agents-git-monorepo.md`, en la raíz del repositorio |
| Revisar o actualizar documentación, consultar qué está por definir o agregar un agente | `../../Agents/funcionalidad/Agents-documentacion.md`, en la raíz del repositorio |

## Organización de esta carpeta

```
Agents/
├── Agents.md          este orquestador
├── reglas/            aplican siempre
├── tecnologia/        herramientas y frameworks
└── funcionalidad/     un agente por tarea o feature (todavía vacía)
```

- **Nombre:** `Agents-<tema>.md`. El orquestador es `Agents.md`.
- **Agregar un agente:** ver `../../Agents/funcionalidad/Agents-documentacion.md`.

## Reglas de negocio

En la raíz del monorepo: `../../docs/analisis-reglas-de-negocio.md` (modelo de datos en la sección 7 y API en la 8) y `../../docs/estado-y-pendientes.md` (estado del backend y decisiones que lo bloquean).

# Reglas generales del monorepo

Aplican a todos los agentes de `time-planner-app`, en la raíz y en cada proyecto. Las rutas de este archivo son relativas a la raíz del monorepo.

## Límite de trabajo

- Trabaja solo dentro de `time-planner-app`: `timer-planner-frontend/`, `timer-planner-backend/`, `Agents/` y `docs/`. No accedas a archivos fuera de esa raíz.
- Puedes leer y modificar archivos de otro proyecto o de las carpetas compartidas cuando la tarea lo requiera.
- Limita la lectura y los cambios a lo necesario para la petición del usuario.
- Las descargas y los archivos generados se guardan dentro de `time-planner-app`.

## Comandos

- **No ejecutes ningún comando sin autorización del usuario.** Primero explica qué comando es, qué hace y por qué lo necesitas; ejecútalo solo cuando el usuario lo autorice.
- Para git aplica además `Agents/tecnologia/Agents-git-monorepo.md`.

## Documentación

- Se mantiene según `Agents/funcionalidad/Agents-documentacion.md`. Ahí están el mapa de documentos, los permisos para modificarlos, los estados y cómo se agrega un agente.

## Estilo

- Responde de forma directa y breve, salvo que el usuario pida una explicación detallada.

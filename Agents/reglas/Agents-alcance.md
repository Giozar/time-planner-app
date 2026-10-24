# Reglas generales del monorepo

Aplican a todos los agentes de `time-planner-app`, en la raíz y en cada proyecto. Las rutas de este archivo son relativas a la raíz del monorepo.

## Límite de trabajo

- Trabaja solo dentro de `time-planner-app`: `timer-planner-frontend/`, `timer-planner-backend/`, `Agents/` y `docs/`. No accedas a archivos fuera de esa raíz.
- Puedes leer y modificar archivos de otro proyecto o de las carpetas compartidas cuando la tarea lo requiera.
- Limita la lectura y los cambios a lo necesario para la petición del usuario.
- Las descargas y los archivos generados se guardan dentro de `time-planner-app`.

## Comandos

- **Leer es libre.** Puedes leer cualquier archivo de `time-planner-app`, desde la raíz, y ejecutar sin pedir permiso los comandos que solo leen: `ls`, `find`, `grep`, `cat`, `head`, `wc`, `git status`, `git log`, `git diff` y `git show`.
- **Lo demás necesita autorización.** Un comando que modifique o borre archivos, instale dependencias, ejecute scripts, pruebas o compilación, o cambie el estado de git, primero se explica: qué es, qué hace y por qué lo necesitas. Ejecútalo solo cuando el usuario lo autorice.
- Para git aplica además `Agents/tecnologia/Agents-git-monorepo.md`.

## Implementación

Aplica a todo cambio de código, también a un arreglo pequeño.

1. **Primero, sin conflictos con las reglas.** Antes de escribir código, comprueba que el cambio no contradiga ninguna RN ni CU vigente de `docs/analisis-reglas-de-negocio.md`: lee las RN y CU de la feature (en el frontend, el mapa de `timer-planner-frontend/docs/funcionalidad.md`) y busca en el documento de reglas cada entidad, campo o estado que el cambio toca, porque reglas de otras features pueden usarlo. Si algo choca, **no implementes**: explica el conflicto al usuario, regístralo como `P-xx` o `D-xx` según `Agents/funcionalidad/Agents-documentacion.md` y espera a que lo resuelva.
2. **Por fases.** Toda implementación se divide en fases; un cambio pequeño es una sola fase. Antes de cada fase, di en pocas líneas qué vas a hacer y qué archivos vas a tocar.
3. **Una fase a la vez,** con su documentación actualizada en el mismo cambio (ver «Qué documento tocar según el cambio» en `Agents/funcionalidad/Agents-documentacion.md`).
4. **Al terminar una fase, avisa y detente.** Di claramente «Terminó la fase N de M» (o «Terminó el cambio»), qué archivos cambiaron, qué queda y qué conviene probar. No sigas ni toques nada más hasta que el usuario diga que continúes o que está listo.
5. **Commit.** Mientras revisa, el usuario hace el commit él mismo o pide ayuda con el agente de git (`Agents/tecnologia/Agents-git-monorepo.md`). Nunca lo hagas por tu cuenta.

## Documentación

- Se mantiene según `Agents/funcionalidad/Agents-documentacion.md`. Ahí están el mapa de documentos, los permisos para modificarlos, los estados y cómo se agrega un agente.

## Estilo

- Responde de forma directa y breve, salvo que el usuario pida una explicación detallada.

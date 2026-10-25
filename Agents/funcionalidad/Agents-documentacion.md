# Agente de documentación

Mantiene la documentación del monorepo coherente. Sabe qué va en cada documento, dónde se registran las propuestas y decisiones por definir, y cómo pasa algo de «en discusión» a «definido» en las reglas. Aplica a frontend y backend. **No modifica código.**

## Permisos

- **La documentación se modifica sin pedir autorización** cuando el usuario pide el cambio, o cuando un cambio de código que él pidió exige actualizarla: documento de reglas, `estado-y-pendientes.md`, planes, `docs/` de cada proyecto y agentes. En ese caso no preguntes «¿me autorizas?»: haz el cambio e informa qué cambiaste. No aplica cuando el usuario pidió solo analizar, validar o revisar: ahí rige «Análisis y revisión» de [../reglas/Agents-alcance.md](../reglas/Agents-alcance.md).
- **Las reglas no se escriben ni se cambian por iniciativa propia.** Una regla o funcionalidad nueva, y cualquier cambio de lo que dice una RN o CU existente, se discute primero con el usuario (ver «Propuesta nueva»). Solo cuando el usuario lo acuerda pasa al documento de reglas.
- Una decisión abierta (`D-xx`) no se resuelve por tu cuenta: se pregunta.
- Para todo lo de git aplica [../tecnologia/Agents-git-monorepo.md](../tecnologia/Agents-git-monorepo.md).

## Mapa de documentos

| Documento | Contiene | No contiene |
|-----------|----------|-------------|
| [docs/analisis-reglas-de-negocio.md](../../docs/analisis-reglas-de-negocio.md) | Lo **definido y acordado**: entidades, enums, reglas (RN), casos de uso (CU), modelo de datos y API propuestos. | Estados, «por validar», fechas de revisión, referencias al código, bugs, migraciones, propuestas ni decisiones abiertas. |
| [docs/estado-y-pendientes.md](../../docs/estado-y-pendientes.md) | Lo **por definir y por hacer**: comparación reglas ↔ código, trabajo pendiente, propuestas en discusión (`P-xx`), decisiones abiertas (`D-xx`) y correcciones pendientes a las reglas (`C-xx`). | Reglas acordadas: una regla solo existe cuando está en el documento de reglas. |
| `timer-planner-frontend/docs/planes/NN-*.md` | Un bloque de trabajo por hacer: fases pendientes, cómo verificarlo y decisiones que lo bloquean. | Copias de las reglas (las cita por ID) ni lo ya hecho. |
| `timer-planner-frontend/docs/funcionalidad.md` | Qué RN y CU aplican a cada feature y su estado. | El texto de las reglas. |
| `timer-planner-frontend/docs/README.md` | Índice de la documentación del frontend. | Pendientes (van en `estado-y-pendientes.md`) ni reglas de mantenimiento (van en este agente). |
| `timer-planner-frontend/docs/arquitectura.md`, `buenas-practicas.md` | Estructura del código y convenciones. | Reglas de negocio. |
| `AGENTS.md` (raíz) | Solo el aviso de leer `Agents/Agents.md`. | Cualquier otra instrucción. |
| `Agents/` (raíz y de cada proyecto) | Instrucciones de trabajo de los agentes y dónde buscar cada cosa. | Reglas de negocio ni estado del trabajo. |

Lee solo lo que la pregunta necesita:
- **Cómo funciona algo existente:** la fila de su feature en `funcionalidad.md`, solo esas RN y CU, y el código necesario.
- **Qué falta, qué está por definir o qué sigue:** `docs/estado-y-pendientes.md` y después solo las RN o CU que cite.

## Qué documento tocar según el cambio

Aplica a todo cambio de código, sea una fase de un plan o un arreglo suelto, en frontend o backend. Se abren solo los documentos de las filas que correspondan; no se revisa toda la documentación.

| Si cambia... | Se actualiza |
|--------------|--------------|
| Una regla o un caso de uso (nuevo, editado o quitado) | Su RN o CU en `docs/analisis-reglas-de-negocio.md` y lo que la cite: el mapa de `funcionalidad.md` y las P, D y C de `estado-y-pendientes.md`. Si se quita, su número va a «Números libres». |
| Un modelo: entidad, campo o enum (`core/models`, entidades del backend) | En el documento de reglas, la sección 3.x de la entidad y la 4.2 si es un valor de enum; además la sección 7 (tablas) si se guarda y la 8 (API) si se expone. |
| Lo que falta o sobra frente a las reglas | «Comparación con el código» de `estado-y-pendientes.md` y la columna «Falta» de `funcionalidad.md`: se agrega al quedar pendiente y se quita al implementarlo. |
| Un comportamiento de pantalla que no es una regla (botón, aviso, diseño) | «Notas» de `funcionalidad.md`. |
| Una feature, carpeta o ruta nueva, movida o borrada | Su fila del mapa en `funcionalidad.md` y «Estructura actual» de `arquitectura.md`. |
| Un archivo nuevo, movido o borrado en `core/` o `shared/` | «Estructura actual» de `arquitectura.md`. |
| Las ayudas de prueba (`src/app/testing/`) o una convención | `buenas-practicas.md`. |
| Una fase de un plan | El plan: se quita la fase; si era la última, se borra el plan (ver «Termina un plan»). |
| Algo que queda por verificar (pruebas, recorrido manual, avisos de compilación) | «Trabajo pendiente» de `estado-y-pendientes.md`. |
| Una propuesta, una duda o una inconsistencia en las reglas | P, D o C de `estado-y-pendientes.md` (ver «Flujos»). |
| Un agente, un permiso o un comando | El agente que lo contiene; si es nuevo o se borra, también ver «Documento o agente nuevo». |
| Un documento nuevo o borrado | El mapa de arriba y, si es del frontend, el índice de `timer-planner-frontend/docs/README.md`. |
| Solo la lógica interna, sin cambiar lo acordado ni la estructura | Nada. |

**Cómo encontrar lo afectado sin leer todo.** Busca con `grep` el ID (`RN-67`), el nombre del campo o enum (`completedAt`) o la ruta del archivo en `docs/`, `Agents/` y en los `docs/` y `Agents/` de cada proyecto; si es una RN, busca también en `src/` (pruebas y comentarios la citan). Abre solo los archivos que aparezcan.

## Flujos

**Propuesta nueva (regla o funcionalidad).**
1. Regístrala en «Propuestas en discusión» de `estado-y-pendientes.md` con el siguiente `P-xx` libre: qué se quiere, por qué y cómo se implementaría, más las RN y CU existentes que toca.
2. Discútela con el usuario: dudas, alternativas e impacto en las reglas vigentes. Las preguntas que surjan van dentro de la propuesta.
3. Cuando el usuario la acuerda, escribe las RN y CU en el documento de reglas, crea o actualiza su plan en `docs/planes/`, agrega sus filas pendientes a «Comparación con el código» y a `funcionalidad.md`, y quita la `P-xx`. Luego entrega el plan y espera su aprobación antes de implementar (ver `timer-planner-frontend/Agents/funcionalidad/Agents-planner.md`).

**Duda sobre algo ya definido.** Agrégala a «Decisiones abiertas» con el siguiente `D-xx` libre y las reglas que toca. Si un plan depende de ella, la cita en «Decisiones que lo bloquean». Cuando el usuario decide, escribe la regla, quita la `D-xx` y actualiza los planes y `funcionalidad.md` que la citaban.

**Inconsistencia en el documento de reglas.** Regístrala como `C-xx` con su corrección propuesta. Si el usuario pide corregirla, aplícala y quítala de la lista sin dejar nota de qué se corrigió ni cuándo. Durante un análisis o una validación solo se reporta: se registra cuando el usuario lo pide.

**Validar la documentación contra el código.** Es solo lectura (ver «Análisis y revisión» en [../reglas/Agents-alcance.md](../reglas/Agents-alcance.md)). Compara por tema: enums y modelos con `core/models` y con las secciones 3 y 4.2; reglas con `core/rules` y `core/services`, buscando su RN en `src/`; `arquitectura.md` con las carpetas reales; `funcionalidad.md` con las rutas y pantallas. Reporta cada diferencia diciendo qué lado está mal, la regla o el código, y la corrección propuesta. No edites ni registres `C-xx` hasta que el usuario lo pida.

**Se implementa algo.** En el mismo cambio, aplica «Qué documento tocar según el cambio». Si es comportamiento nuevo, queda en las reglas o en `funcionalidad.md`.

**Termina un plan.** Un plan termina al implementar su última fase, aunque falten las pruebas o el recorrido que hace el usuario: se borra en ese mismo cambio y esa verificación queda como una línea en «Trabajo pendiente» de `estado-y-pendientes.md`. Antes de borrarlo: (1) las reglas y casos de uso nuevos ya están en el documento de reglas; (2) el comportamiento de pantallas que no es una regla va en `funcionalidad.md`; (3) lo que quedó por verificar o decidir va en `estado-y-pendientes.md`; (4) se quitan su fila de «Comparación con el código» y sus referencias en README, `funcionalidad.md` y otros planes. Lo que describe cómo se hizo (commits, fases, pruebas) no se conserva.

**Limpieza continua.** Al tocar un documento, quita lo que ya no aplique: historiales, registros de avances, estados de «hecho» y menciones a planes borrados.

**Documento o agente nuevo.** Crea uno nuevo solo si el contenido no cabe en uno existente sin mezclar «definido» con «pendiente». Todo queda dentro de `time-planner-app`.
- **Documento:** regístralo en el mapa de arriba y, si es del frontend, en el índice de `timer-planner-frontend/docs/README.md`.
- **Agente:** nómbralo `Agents-<tema>.md` en `reglas/`, `tecnologia/` o `funcionalidad/` (raíz o proyecto) y regístralo en la tabla del orquestador que corresponda: `Agents/Agents.md` si es del monorepo, o el `Agents/Agents.md` del proyecto.

## Convenciones

- **Sin «hecho»:** no se documenta lo terminado. Solo existe ⏳ Pendiente; nada de «en curso», «en revisión» ni «completada». Al terminar algo se añade a las reglas (ya es concreto) y se borra de pendientes, planes, comparación y README, sin dejar rastro de que se hizo.
- **Identificadores:** cada RN, CU, P, D y C es único: dos elementos vigentes nunca comparten número, y los existentes no se renumeran porque el código, las pruebas y los planes los citan. Un número liberado se agrega a «Números libres» de `docs/estado-y-pendientes.md` (solo el número, sin fechas ni motivos) y se puede reutilizar para un elemento nuevo. Antes de reutilizarlo, comprueba que no lo cite el código, las pruebas ni la documentación; al usarlo, quítalo de la lista.
- **Sin historial:** no se anotan fechas de aplicación, qué se corrigió, qué decidió el usuario ni cómo se llegó a algo. Eso vive en git.
- **Sin duplicar:** cada dato vive en un solo documento; los demás enlazan o citan el ID.
- **Citar secciones:** se escribe «sección 3.3», nunca el signo «§», ni en documentos ni en comentarios del código.
- **Planes terminados:** se borran. Git guarda la historia; la documentación solo describe lo vigente y lo que falta.

## Revisión después de cada cambio

Solo sobre los documentos que tocaste y los que encontró la búsqueda por ID; no sobre toda la documentación. Una revisión completa se hace únicamente cuando el usuario la pide.

1. El documento de reglas no tiene estados, propuestas ni referencias al código.
2. Toda RN o CU citada existe y no está en «Números libres»; las P, D y C citadas como pendientes siguen abiertas.
3. El estado del plan coincide con `funcionalidad.md` y `estado-y-pendientes.md`.
4. No hay enlaces relativos rotos.
5. Ninguna regla está definida en dos lugares, ni con el mismo texto ni con uno distinto.
6. No queda historial: fechas de aplicación, notas de «se corrigió» o «se acordó» ni planes con todas sus fases implementadas.
7. Los agentes que deben leer un documento lo tienen indicado en sus fuentes y pueden acceder a él dentro de `time-planner-app`.

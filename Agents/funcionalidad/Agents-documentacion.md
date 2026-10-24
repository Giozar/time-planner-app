# Agente de documentación

Mantiene la documentación del monorepo coherente. Sabe qué va en cada documento, dónde se registran las propuestas y decisiones por definir, y cómo pasa algo de «en discusión» a «definido» en las reglas. Aplica a frontend y backend. **No modifica código.**

## Permisos

- **La documentación se modifica sin pedir autorización** cuando el usuario pide un cambio o cuando un trabajo que él pidió lo exige: documento de reglas, `estado-y-pendientes.md`, planes, `docs/` de cada proyecto y agentes. No preguntes «¿me autorizas?»: haz el cambio e informa qué cambiaste.
- **Las reglas nuevas no se escriben por iniciativa propia.** Una regla o funcionalidad nueva se discute primero con el usuario (ver «Propuesta nueva»). Solo cuando el usuario la acuerda pasa al documento de reglas.
- Una decisión abierta (`D-xx`) no se resuelve por tu cuenta: se pregunta.
- Para todo lo de git aplica [../tecnologia/Agents-git-monorepo.md](../tecnologia/Agents-git-monorepo.md).

## Mapa de documentos

| Documento | Contiene | No contiene |
|-----------|----------|-------------|
| [docs/analisis-reglas-de-negocio.md](../../docs/analisis-reglas-de-negocio.md) | Lo **definido y acordado**: entidades, enums, reglas (RN), casos de uso (CU), modelo de datos y API propuestos. | Estados, «por validar», fechas de revisión, referencias al código, bugs, migraciones, propuestas ni decisiones abiertas. |
| [docs/estado-y-pendientes.md](../../docs/estado-y-pendientes.md) | Lo **por definir y por hacer**: comparación reglas ↔ código, trabajo pendiente, propuestas en discusión (`P-xx`), decisiones abiertas (`D-xx`) y correcciones pendientes a las reglas (`C-xx`). | Reglas acordadas: una regla solo existe cuando está en el documento de reglas. |
| `timer-planner-frontend/docs/planes/NN-*.md` | Un bloque de trabajo por hacer: fases pendientes, cómo verificarlo y decisiones que lo bloquean. | Copias de las reglas (las cita por ID) ni lo ya hecho. |
| `timer-planner-frontend/docs/funcionalidad.md` | Qué RN y CU aplican a cada feature y su estado. | El texto de las reglas. |
| `timer-planner-frontend/docs/README.md` | Índice, estado general y tabla de mantenimiento del frontend. | Detalle de fases (va en los planes). |
| `timer-planner-frontend/docs/arquitectura.md`, `buenas-practicas.md` | Estructura del código y convenciones. | Reglas de negocio. |
| `AGENTS.md` (raíz) | Solo el aviso de leer `Agents/Agents.md`. | Cualquier otra instrucción. |
| `Agents/` (raíz y de cada proyecto) | Instrucciones de trabajo de los agentes y dónde buscar cada cosa. | Reglas de negocio ni estado del trabajo. |

Antes de responder qué está definido, qué falta o qué sigue, lee `docs/estado-y-pendientes.md` y después solo las RN o CU que cite.

## Flujos

**Propuesta nueva (regla o funcionalidad).**
1. Regístrala en «Propuestas en discusión» de `estado-y-pendientes.md` con el siguiente `P-xx` libre: qué se quiere, por qué y cómo se implementaría, más las RN y CU existentes que toca.
2. Discútela con el usuario: dudas, alternativas e impacto en las reglas vigentes. Las preguntas que surjan van dentro de la propuesta.
3. Cuando el usuario la acuerda, escribe las RN y CU en el documento de reglas, crea o actualiza su plan en `docs/planes/`, agrega sus filas pendientes a «Comparación con el código» y a `funcionalidad.md`, y quita la `P-xx`. Luego entrega el plan y espera su aprobación antes de implementar (ver `timer-planner-frontend/Agents/funcionalidad/Agents-planner.md`).

**Duda sobre algo ya definido.** Agrégala a «Decisiones abiertas» con el siguiente `D-xx` libre y las reglas que toca. Si un plan depende de ella, la cita en «Decisiones que lo bloquean». Cuando el usuario decide, escribe la regla, quita la `D-xx` y actualiza los planes y `funcionalidad.md` que la citaban.

**Inconsistencia en el documento de reglas.** Regístrala como `C-xx` con su corrección propuesta. Si el usuario pide corregirla, aplícala y quítala de la lista sin dejar nota de qué se corrigió ni cuándo.

**Se implementa algo.** En el mismo cambio: quita la fase de su plan, la fila de «Comparación con el código» y la fila o estado de `funcionalidad.md`, y aplica la tabla de mantenimiento de `timer-planner-frontend/docs/README.md`. Si es comportamiento nuevo, queda en las reglas o en `funcionalidad.md`.

**Termina un plan.** Un plan termina al implementar su última fase, aunque falten las pruebas o el recorrido que hace el usuario: se borra en ese mismo cambio y esa verificación queda como una línea en «Trabajo pendiente» de `estado-y-pendientes.md`. Antes de borrarlo: (1) las reglas y casos de uso nuevos ya están en el documento de reglas; (2) el comportamiento de pantallas que no es una regla va en `funcionalidad.md`; (3) lo que quedó por verificar o decidir va en `estado-y-pendientes.md`; (4) se quitan su fila de «Comparación con el código» y sus referencias en README, `funcionalidad.md` y otros planes. Lo que describe cómo se hizo (commits, fases, pruebas) no se conserva.

**Limpieza continua.** Al tocar un documento, quita lo que ya no aplique: historiales, registros de avances, estados de «hecho» y menciones a planes borrados.

**Documento o agente nuevo.** Crea uno nuevo solo si el contenido no cabe en uno existente sin mezclar «definido» con «pendiente». Todo queda dentro de `time-planner-app`.
- **Documento:** regístralo en el mapa de arriba y, si es del frontend, en el índice de `timer-planner-frontend/docs/README.md`.
- **Agente:** nómbralo `Agents-<tema>.md` en `reglas/`, `tecnologia/` o `funcionalidad/` (raíz o proyecto) y regístralo en la tabla del orquestador que corresponda: `Agents/Agents.md` si es del monorepo, o el `Agents/Agents.md` del proyecto.

## Convenciones

- **Sin «hecho»:** no se documenta lo terminado. Solo existe ⏳ Pendiente; nada de «en curso», «en revisión» ni «completada». Al terminar algo se añade a las reglas (ya es concreto) y se borra de pendientes, planes, comparación y README, sin dejar rastro de que se hizo.
- **Identificadores:** RN, CU, P, D y C no se renumeran ni se reutilizan, porque el código, las pruebas y los planes los citan. Un número eliminado se agrega a la lista de «Identificadores retirados» de `docs/estado-y-pendientes.md`: solo el número y, si se resolvió en una regla, esa RN entre paréntesis. Sin fechas, motivos ni explicaciones. El siguiente elemento usa un número nuevo.
- **Sin historial:** no se anotan fechas de aplicación, qué se corrigió, qué decidió el usuario ni cómo se llegó a algo. Eso vive en git.
- **Sin duplicar:** cada dato vive en un solo documento; los demás enlazan o citan el ID.
- **Citar secciones:** se escribe «sección 3.3», nunca el signo «§», ni en documentos ni en comentarios del código.
- **Planes terminados:** se borran. Git guarda la historia; la documentación solo describe lo vigente y lo que falta.

## Revisión después de cada cambio

1. El documento de reglas no tiene estados, propuestas ni referencias al código.
2. Toda RN o CU citada existe y no está retirada; las P, D y C citadas como pendientes siguen abiertas.
3. El estado de cada plan coincide con `funcionalidad.md`, el README del frontend y `estado-y-pendientes.md`.
4. No hay enlaces relativos rotos.
5. Ninguna regla está definida en dos lugares, ni con el mismo texto ni con uno distinto.
6. No queda historial: fechas de aplicación, notas de «se corrigió» o «se acordó» ni planes con todas sus fases implementadas.
7. Los agentes que deben leer un documento lo tienen indicado en sus fuentes y pueden acceder a él dentro de `time-planner-app`.

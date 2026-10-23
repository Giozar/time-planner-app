# Agente de documentación

Mantiene la documentación del monorepo coherente. Sabe qué va en cada documento, dónde se registran las propuestas y decisiones por definir, y cómo pasa algo de «en discusión» a «definido» y a «completado». Aplica a frontend y backend. **No modifica código.**

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
| `timer-planner-frontend/docs/planes/NN-*.md` | Un bloque de trabajo: fases, qué se hizo, verificación, decisiones que lo bloquean y lo que queda pendiente. | Copias de las reglas: las cita por ID. |
| `timer-planner-frontend/docs/funcionalidad.md` | Qué RN y CU aplican a cada feature y su estado. | El texto de las reglas. |
| `timer-planner-frontend/docs/README.md` | Índice, estado general, tabla de mantenimiento e historial del frontend. | Detalle de fases (va en los planes). |
| `timer-planner-frontend/docs/arquitectura.md`, `buenas-practicas.md` | Estructura del código y convenciones. | Reglas de negocio. |
| `AGENTS.md` y `CLAUDE.md` (raíz) | Solo el aviso de leer `Agents/Agents.md`. | Cualquier otra instrucción. |
| `Agents/` (raíz y de cada proyecto) | Instrucciones de trabajo de los agentes y dónde buscar cada cosa. | Reglas de negocio ni estado del trabajo. |

Antes de responder qué está definido, qué falta o qué sigue, lee `docs/estado-y-pendientes.md` y después solo las RN o CU que cite.

## Flujos

**Propuesta nueva (regla o funcionalidad).**
1. Regístrala en «Propuestas en discusión» de `estado-y-pendientes.md` con el siguiente `P-xx` libre: qué se quiere, por qué y cómo se implementaría, más las RN y CU existentes que toca.
2. Discútela con el usuario: dudas, alternativas e impacto en las reglas vigentes. Las preguntas que surjan van dentro de la propuesta.
3. Cuando el usuario la acuerda, escribe las RN y CU en el documento de reglas, crea o actualiza su plan en `docs/planes/`, agrega sus filas pendientes a «Comparación con el código» y a `funcionalidad.md`, y quita la `P-xx`.

**Duda sobre algo ya definido.** Agrégala a «Decisiones abiertas» con el siguiente `D-xx` libre y las reglas que toca. Si un plan depende de ella, la cita en «Decisiones que lo bloquean». Cuando el usuario decide, escribe la regla, quita la `D-xx` y actualiza los planes y `funcionalidad.md` que la citaban.

**Inconsistencia en el documento de reglas.** Regístrala como `C-xx` con su corrección propuesta. Si el usuario pide corregirla, aplícala y quítala de la lista.

**Se implementa algo.** En el mismo cambio: fase ✅ Completada en su plan, fila de «Comparación con el código», columna Estado de `funcionalidad.md` y lo que indique la tabla de mantenimiento de `timer-planner-frontend/docs/README.md`.

**Documento o agente nuevo.** Crea uno nuevo solo si el contenido no cabe en uno existente sin mezclar «definido» con «pendiente». Todo queda dentro de `time-planner-app`.
- **Documento:** regístralo en el mapa de arriba y, si es del frontend, en el índice de `timer-planner-frontend/docs/README.md`.
- **Agente:** nómbralo `Agents-<tema>.md` en `reglas/`, `tecnologia/` o `funcionalidad/` (raíz o proyecto) y regístralo en la tabla del orquestador que corresponda: `Agents/Agents.md` si es del monorepo, o el `Agents/Agents.md` del proyecto. Si es del frontend, anótalo además en el historial de `timer-planner-frontend/docs/README.md`.

## Convenciones

- **Estados:** solo ⏳ Pendiente y ✅ Completada. Nada de «en curso», «en revisión» ni «a la espera de validación»: mientras se trabaja algo sigue Pendiente, y pasa a Completada al terminarlo, con su documentación al día.
- **Identificadores:** RN, CU, P, D y C no se renumeran ni se reutilizan, porque el código, las pruebas y los planes los citan. Un número eliminado se anota en «Identificadores retirados» de `docs/estado-y-pendientes.md` y el siguiente elemento usa un número nuevo.
- **Sin duplicar:** cada dato vive en un solo documento; los demás enlazan o citan el ID.
- **Planes terminados:** describen en pasado lo hecho y dejan solo lo que falta en «Pendiente».

## Revisión después de cada cambio

1. El documento de reglas no tiene estados, propuestas ni referencias al código.
2. Toda RN o CU citada existe y no está retirada; las P, D y C citadas como pendientes siguen abiertas.
3. El estado de cada plan coincide con `funcionalidad.md`, el README del frontend y `estado-y-pendientes.md`.
4. No hay enlaces relativos rotos.
5. Ninguna regla está definida en dos lugares con texto distinto.
6. Los agentes que deben leer un documento lo tienen indicado en sus fuentes y pueden acceder a él dentro de `time-planner-app`.

# Estado de implementación y decisiones abiertas

La especificación del producto está en [analisis-reglas-de-negocio.md](analisis-reglas-de-negocio.md). Este documento es su complemento de trabajo: compara esa definición con el código, reúne lo que falta decidir y señala lo que hay que corregir en la especificación. **No define reglas.**

## Cómo se usa

Cómo entra y sale cada elemento de este documento (propuestas `P-xx`, decisiones `D-xx`, correcciones `C-xx`, filas de la comparación) y qué estados se usan está en el agente de documentación: [../Agents/funcionalidad/Agents-documentacion.md](../Agents/funcionalidad/Agents-documentacion.md).

## Comparación con el código

| Tema | Definido | Estado del código |
|------|----------|-------------------|
| Sesiones y constancia | Una `ExecutionSession` por fecha con estado `PLANNED` o `DONE`; constancia = exigibles realizadas / exigibles (RN-69, RN-70, CU-28). | ⏳ Pendiente. El plan guarda `dates` y `completedDates`, sin sesiones ni constancia. |
| Tiempo real | `WorkLog` guarda minutos trabajados, incluso sin sesión (RN-71, CU-27). | ⏳ Pendiente. El tiempo «ejecutado» actual suma duraciones previstas de sesiones marcadas. |
| Edición del plan y borrado con historial | Se conservan sesiones pasadas y `WorkLog`; borrar un ítem elimina sus sesiones y registros (RN-24, RN-51, RN-74). | ⏳ Pendiente. Hoy se conservan las fechas pasadas de `dates`. |
| Cierre diario | `DailyRecord` resume sesiones, constancia y minutos reales (RN-41 a RN-44, RN-72). | ⏳ Pendiente. El registro actual guarda conteos de ítems y duraciones previstas. El reemplazo por fecha ya existe. |
| Agenda y calendario | Muestran el estado de cada sesión; la agenda registra minutos reales (RN-25 a RN-27, RN-66). | ⏳ Pendiente. Las pantallas muestran sesiones desde `dates` y usan `completedDates`. |
| Historial | Lista de resúmenes diarios (CU-21). | ⏳ Pendiente. No existe la pantalla. |
| Backend | Aplica las mismas reglas y persiste el modelo de las secciones 7 y 8. | ⏳ Pendiente. Solo existe el proyecto base de NestJS. |

Lo que no aparece en la tabla está implementado y vive en las reglas y en [funcionalidad.md](../timer-planner-frontend/docs/funcionalidad.md). El trabajo del frontend se organiza en el [plan 03](../timer-planner-frontend/docs/planes/03-avance-constancia-tiempo-real.md).

## Trabajo pendiente

| Tema | Estado |
|------|--------|
| Plan 03: avance, constancia y tiempo real | ⏳ Pendiente |
| Recorrido manual en el navegador de los casos de uso implementados (idea y su promoción, patrón semanal sin desfase de día, bloqueo de deadline mayor al del padre, pausa de meta, cierre y reapertura de objetivo, borrado con confirmación escrita, cierre del día repetido, calendario con hover y cambio de mes, y agenda de días pasados con minutos y recálculo del cierre) | ⏳ Pendiente |
| Aviso de presupuesto de CSS en `objective-detail` (5,6 kB sobre 4 kB) | ⏳ Pendiente |
| Backend | ⏳ Pendiente; requiere D-01 |
| Agente planificador del backend (`timer-planner-backend/Agents/funcionalidad/`) | ⏳ Pendiente; se crea al empezar el backend |

## Propuestas en discusión

Ninguna por ahora.

## Decisiones abiertas

Ninguna está decidida. Mientras no se decida, el código no la implementa por su cuenta.

### Generales

| ID | Pregunta | Reglas relacionadas |
|----|----------|---------------------|
| D-01 | Autenticación y número de usuarios; motor de base de datos y ORM. | §7.2 punto 1, §7.4 |
| D-02 | Destino de la interfaz después de cerrar el día. | CU-19 |
| D-03 | Si un objetivo con deadline pasado necesita un estado visual de vencido (hoy solo existe para tareas). | RN-58, RN-65 |
| D-04 | Si se permitirá pausar objetivos y su efecto en agenda y calendario. El código contiene `ObjectiveStatus.PAUSED`, pero ninguna regla lo usa. | RN-29, RN-57, RN-59 |
| D-05 | En qué momento una idea acepta objetivos y tareas y pasa a meta activa. RN-55 la activa al tener horizonte y tareas; CU-02 crea `ACTIVE` una meta nueva con horizonte. Tampoco está definido qué pasa si se quita el horizonte a una meta activa. | RN-55, CU-02, CU-22 |
| D-06 | Si se permite editar el título, el deadline o el plan de un objetivo cerrado o de una tarea o paso al 100 %. Hoy solo está definido que un objetivo cerrado puede recibir hijos (RN-63). | RN-60, RN-63, CU-25 |
| D-07 | Si objetivos, tareas y pasos necesitan orden manual. | — |
| D-08 | Respaldos y recuperación de elementos borrados (fuera del MVP). | RN-52 |
| D-09 | Endpoint de consulta del calendario por rango de fechas. | RN-66, §7.2 punto 11, §8 |

### Modelo de avance, sesiones y tiempo real

Surgen de RN-67 a RN-74 y afectan al plan 03.

| ID | Pregunta | Reglas relacionadas |
|----|----------|---------------------|
| D-12 | ¿Las sesiones `PLANNED` de días en que la meta o la tarea estaba pausada cuentan como no realizadas en la constancia? | RN-57, RN-59, RN-70 |
| D-17 | ¿Se muestra la constancia de tarea compuesta, objetivo y meta? RN-70 dice que «puede calcularse». | RN-70, CU-28 |
| D-18 | ¿Se puede registrar trabajo sin sesión (CU-27) en ítems de una meta `PAUSED` o `IDEA`, de una tarea `PAUSED` o ya al 100 %? | RN-57, RN-59, RN-71 |

## Correcciones pendientes en el documento de reglas

Ninguna. Las correcciones C-01 a C-12 se aplicaron el 2026-10-23. Afectaron a §3.1, §3.3, RN-24, la nota de RN-47, RN-64, RN-67, CU-05, CU-10, CU-18, CU-23, CU-25, CU-26 y §8.

## Identificadores retirados

No existen RN-23, RN-38, RN-45 ni RN-46: se retiraron con el modelo anterior. Tampoco existen D-13, resuelta en RN-44, ni D-15, resuelta en RN-27 (desmarcar elimina los minutos). Sus números no se reutilizan.

El 2026-10-23 el usuario decidió que el avance sale de las sesiones marcadas, no de un porcentaje indicado a mano (RN-30). Con eso se retiraron:
- **RN-73** y el estado `NOT_NEEDED`: el 100 % solo llega al marcar todas las sesiones, así que no quedan sesiones futuras que descartar.
- **CU-20** («Indicar avance del resultado»). Antes de esa reasignación era la migración de datos, eliminada.
- **D-10** (sesión de hoy al llegar a 100 %) y **D-16** (avance al cambiar de tipo): el avance siempre se calcula.

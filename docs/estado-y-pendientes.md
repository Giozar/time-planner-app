# Estado de implementación y decisiones abiertas

La especificación del producto está en [analisis-reglas-de-negocio.md](analisis-reglas-de-negocio.md). Este documento es su complemento de trabajo: compara esa definición con el código, reúne lo que falta decidir y señala lo que hay que corregir en la especificación. **No define reglas.**

## Cómo se usa

Cómo entra y sale cada elemento de este documento (propuestas `P-xx`, decisiones `D-xx`, correcciones `C-xx`, filas de la comparación) y qué estados se usan está en el agente de documentación: [../Agents/funcionalidad/Agents-documentacion.md](../Agents/funcionalidad/Agents-documentacion.md).

## Comparación con el código

| Tema | Definido | Estado del código |
|------|----------|-------------------|
| Jerarquía, validaciones, deadlines, recurrencia, pausas, cierre de objetivo y borrado con confirmación | RN-01 a RN-22, RN-47 a RN-50, RN-52 a RN-65 | ✅ Completada ([plan 01](../timer-planner-frontend/docs/planes/01-alinear-frontend-con-reglas-de-negocio.md)). Las reglas que dependen de `ExecutionSession` o `WorkLog` están en las filas siguientes. |
| Vista de calendario (cuadrícula, navegación, jerarquía al pasar el cursor) | RN-66, CU-26 | ✅ Completada ([plan 02](../timer-planner-frontend/docs/planes/02-calendario.md)). Falta su adaptación a `ExecutionSession` (fila «Agenda y calendario»). |
| Avance del resultado | Tarea simple y paso reciben un porcentaje indicado por el usuario; sus padres lo agregan (RN-30 a RN-37, RN-67, CU-20). | ⏳ Pendiente. `PlannerService` calcula el porcentaje de tareas simples y pasos contando sesiones realizadas. |
| Sesiones y constancia | Una `ExecutionSession` por fecha con estado `PLANNED`, `DONE` o `NOT_NEEDED`; constancia = exigibles realizadas / exigibles (RN-69, RN-70, RN-73, CU-28). | ⏳ Pendiente. El plan guarda `dates` y `completedDates`, sin sesiones ni constancia. |
| Tiempo real | `WorkLog` guarda minutos trabajados, incluso sin sesión (RN-71, CU-27). | ⏳ Pendiente. El tiempo «ejecutado» actual suma duraciones previstas de sesiones marcadas. |
| Edición del plan y borrado con historial | Se conservan sesiones pasadas y `WorkLog`; borrar un ítem elimina sus sesiones y registros (RN-24, RN-51, RN-74). | ⏳ Pendiente. Hoy se conservan las fechas pasadas de `dates`. |
| Cierre diario | `DailyRecord` resume sesiones, constancia y minutos reales (RN-41 a RN-44, RN-72). | ⏳ Pendiente. El registro actual guarda conteos de ítems y duraciones previstas. El reemplazo por fecha ya existe. |
| Agenda y calendario | Muestran el estado de cada sesión y excluyen `NOT_NEEDED`; la agenda registra minutos reales (RN-25 a RN-27, RN-66, RN-73). | ⏳ Pendiente. Las pantallas muestran sesiones desde `dates` y usan `completedDates`. |
| Historial | Lista de resúmenes diarios (CU-21). | ⏳ Pendiente. No existe la pantalla. |
| Backend | Aplica las mismas reglas y persiste el modelo de las secciones 7 y 8. | ⏳ Pendiente. Solo existe el proyecto base de NestJS. |

El trabajo del frontend se organiza en el [plan 03](../timer-planner-frontend/docs/planes/03-avance-constancia-tiempo-real.md). Los planes 01 y 02 documentan el modelo anterior, que es el que hoy ejecuta la aplicación.

## Trabajo pendiente

| Tema | Estado |
|------|--------|
| Plan 03: avance, constancia y tiempo real | ⏳ Pendiente |
| Recorrido manual en el navegador de los casos de uso implementados | ⏳ Pendiente |
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
| D-10 | Al llegar a 100 %, ¿la sesión `PLANNED` **de hoy** pasa a `NOT_NEEDED` o sigue exigible y cuenta como no realizada al cerrar el día? RN-73 habla solo de sesiones «futuras». | RN-69, RN-70, RN-73 |
| D-11 | Al editar un plan, ¿la sesión `PLANNED` **de hoy** se reemplaza o se conserva? RN-21 genera desde hoy y RN-51 solo sustituye «futuras». | RN-21, RN-51 |
| D-12 | ¿Las sesiones `PLANNED` de días en que la meta o la tarea estaba pausada cuentan como no realizadas en la constancia? | RN-57, RN-59, RN-70 |
| D-13 | RN-44 permite marcar sesiones después de cerrar el día y RN-69 muestra la `PLANNED` de hoy como no realizada tras el cierre. ¿El `DailyRecord` se actualiza solo o hay que volver a cerrar el día? | RN-43, RN-44, RN-69, RN-72 |
| D-14 | ¿Se pueden editar o borrar bloques de `WorkLog`? ¿Se puede registrar trabajo olvidado de un día pasado? RN-71 solo admite la fecha de hoy. | RN-27, RN-71, CU-27 |
| D-15 | Al marcar una sesión que tiene trabajo de hoy sin vincular (por ejemplo, tras desmarcarla), ¿se vincula ese trabajo o se pide registrar minutos nuevos? Lo segundo puede duplicar minutos. | RN-27, RN-71, §8 `POST /execution-sessions/:id/complete` |
| D-16 | Avance inicial al cambiar de tipo: compuesta → simple (¿conserva el promedio de los pasos o empieza en 0?) y simple → compuesta (pasa a 0 sin pasos). | RN-32, RN-39, RN-40 |
| D-17 | ¿Se muestra la constancia de tarea compuesta, objetivo y meta? RN-70 dice que «puede calcularse». | RN-70, CU-28 |
| D-18 | ¿Se puede registrar avance o trabajo en ítems de una meta `PAUSED` o `IDEA`, de una tarea `PAUSED` o ya al 100 %? | RN-57, RN-59, RN-67, RN-71 |

## Correcciones pendientes en el documento de reglas

Ninguna. Las correcciones C-01 a C-12 se aplicaron el 2026-10-23. Afectaron a §3.1, §3.3, RN-24, la nota de RN-47, RN-64, RN-67, CU-05, CU-10, CU-18, CU-23, CU-25, CU-26 y §8.

## Identificadores retirados

No existen RN-23, RN-38, RN-45 ni RN-46: se retiraron con el modelo anterior y sus números no se reutilizan. CU-20 se reasignó a «Indicar avance del resultado» antes de adoptar esta convención; antes era la migración de datos, eliminada.

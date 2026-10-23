# Time Planner — Análisis de Entidades, Reglas de Negocio y Casos de Uso

> **Propósito:** definir el dominio, las reglas de negocio y los casos de uso de Time Planner. Este documento expresa el comportamiento requerido, independientemente de la tecnología o del estado de implementación.

---

## Índice

1. [Visión general del dominio](#1-visión-general-del-dominio)
2. [Principios de datos](#2-principios-de-datos)
3. [Entidades del dominio](#3-entidades-del-dominio)
4. [Catálogos / enumeraciones](#4-catálogos--enumeraciones)
5. [Reglas de negocio](#5-reglas-de-negocio)
6. [Casos de uso](#6-casos-de-uso)
7. [Modelo de datos propuesto para la base de datos](#7-modelo-de-datos-propuesto-para-la-base-de-datos)
8. [Propuesta de API REST](#8-propuesta-de-api-rest)

---

## 1. Visión general del dominio

Time Planner es un planificador personal jerárquico. El usuario define **metas** de vida/carrera, las descompone en **objetivos**, y cada objetivo en **tareas** que se planifican en el calendario. Cada día, el usuario ve su **agenda de hoy**, marca lo que ejecutó y al final **cierra el día**, generando un registro histórico.

### Jerarquía

```text
Meta (Goal)
 └── Objetivo (Objective)
      └── Tarea (Activity)
           ├── simple → Plan de ejecución → Sesiones programadas
           └── compuesta → Pasos (SubActivity) → Plan de ejecución → Sesiones

Registro de trabajo (WorkLog) → minutos realmente trabajados en una tarea simple o paso
Registro diario (DailyRecord) → resumen del cierre de cada fecha
```

Solo las tareas simples y los pasos son **ítems ejecutables**. Su avance mide el resultado alcanzado; sus sesiones miden la constancia y sus registros de trabajo miden el tiempo real. La tarea compuesta, el objetivo y la meta agregan el avance de sus hijos.

---

## 2. Principios de datos

- **Avance del resultado:** porcentaje de 0 a 100 indicado por el usuario en una tarea simple o un paso. La duración trabajada y las sesiones realizadas no lo cambian automáticamente.
- **Constancia:** proporción de sesiones exigibles realizadas. Se calcula con sesiones; no se almacena en la meta, el objetivo o la tarea.
- **Tiempo real:** suma de los minutos de `WorkLog`, incluidos los trabajos sin sesión programada. Nunca se deduce de la duración prevista.
- **Fechas:** `YYYY-MM-DD` en la zona local del usuario; las fechas de calendario no son marcas de tiempo.
- **Cierre diario:** un resumen por fecha. El detalle de sesiones y minutos permanece en `ExecutionSession` y `WorkLog`; al volver a cerrar la misma fecha se actualiza el resumen.

**Ejemplo:** hay dos sesiones de 60 minutos, una por lunes. La primera no se realiza; la segunda se realiza con 120 minutos de trabajo real. Si el usuario confirma que terminó el resultado, la tarea queda al **100 % de avance**, con **50 % de constancia** (1 de 2 sesiones) y **120 minutos reales** el segundo lunes. Los minutos trabajados no cambian por sí solos el avance.

---

## 3. Entidades del dominio

### 3.1 Goal (Meta)

| Campo | Tipo | Regla |
|-------|------|-------|
| `id`, `title`, `createdAt` | UUID, texto, fecha/hora | Identidad y título de al menos 3 caracteres. |
| `horizon` | `GoalHorizon` o `null` | Sin horizonte, la meta se crea como `IDEA` (RN-55). |
| `progress` | entero 0–100 | Promedio simple del avance de sus objetivos; 0 si no hay. |
| `status` | `GoalStatus` | `IDEA`, `ACTIVE` o `PAUSED`. |

La meta no tiene deadline, constancia almacenada ni minutos reales propios.

### 3.2 Objective (Objetivo)

| Campo | Tipo | Regla |
|-------|------|-------|
| `id`, `goalId`, `title`, `createdAt` | UUID, UUID, texto, fecha/hora | Pertenece a una meta; título de al menos 3 caracteres. |
| `nature` | `ObjectiveNature` | Por defecto `OTHER`. |
| `deadline` | fecha local | Obligatorio; limita tareas, pasos y sesiones. |
| `progress` | entero 0–100 | Promedio simple del avance de sus tareas; 0 si no hay. |
| `status` | `ObjectiveStatus` | El cierre `COMPLETED` es manual y exige 100 %. |

No almacena constancia ni minutos reales; se consultan desde sus ítems ejecutables.

### 3.3 Activity (Tarea)

| Campo | Tipo | Regla |
|-------|------|-------|
| `id`, `objectiveId`, `title` | UUID, UUID, texto | Pertenece a un objetivo; título de al menos 3 caracteres. |
| `type` | `ActivityType` | `SIMPLE` o `COMPOSITE`. |
| `priority`, `criticality`, `complexity` | catálogos | Clasificación de la tarea. |
| `recurrence` | `ActivityRecurrence` o `null` | Derivada del plan; `null` en compuestas. |
| `deadline` | fecha local opcional | Si falta, hereda el del objetivo; nunca lo supera. |
| `executionPlan` | `ExecutionPlan` o `null` | Obligatorio en simple; `null` en compuesta. |
| `totalTimeRequiredMin` | entero calculado | Simple: suma de `plannedMinutes` de sus sesiones. Compuesta: suma de `plannedMinutes` de las sesiones de sus pasos (RN-24). |
| `progress` | entero 0–100 | Simple: indicado por el usuario. Compuesta: promedio de pasos. |
| `completedAt` | fecha/hora opcional | En simple se almacena: se fija al llegar a 100 % y se limpia si baja. En compuesta no se almacena: se calcula como el `completedAt` más reciente de sus pasos cuando todos están al 100 %. |
| `status` | `ActivityStatus` | Derivado del avance, salvo pausa manual; `OVERDUE` es visual. |

### 3.4 SubActivity (Paso)

| Campo | Tipo | Regla |
|-------|------|-------|
| `id`, `activityId`, `title` | UUID, UUID, texto | Pertenece a una tarea compuesta; título de al menos 3 caracteres. |
| `deadline` | fecha local opcional | Hereda el efectivo de la tarea; nunca lo supera. |
| `complexity` | `ActivityComplexity` | Por defecto `MEDIUM`. |
| `executionPlan` | `ExecutionPlan` | Obligatorio. |
| `progress` | entero 0–100 | Indicado por el usuario, independiente de sesiones y minutos. |
| `completedAt` | fecha/hora opcional | Se fija al llegar a 100 % y se limpia si baja. |
| `status` | `SubActivityStatus` | Derivado del avance. |

### 3.5 ExecutionPlan (Plan de ejecución)

| Campo | Tipo | Regla |
|-------|------|-------|
| `id` | UUID | Identificador del plan. |
| `type` | `ExecutionPlanType` | `WEEKLY_PATTERN` o `SPECIFIC_DATES`. |
| `patternDays` | `WeekDay[]` opcional | Obligatorio si el plan es semanal. |
| `durationPerExecutionMin` | entero | Duración prevista por defecto, mínimo 5. |

Un plan pertenece a una tarea simple o a un paso. Sus fechas materializadas viven en `ExecutionSession`; el plan no guarda una lista paralela de fechas completadas.

### 3.6 ExecutionSession (Sesión programada)

| Campo | Tipo | Regla |
|-------|------|-------|
| `id`, `planId` | UUID | Una sesión pertenece a un plan; fecha única por plan. |
| `scheduledDate` | fecha local | Día programado. |
| `plannedMinutes` | entero | Minutos previstos para esa sesión. |
| `status` | `SessionStatus` | `PLANNED`, `DONE` o `NOT_NEEDED`. |
| `completedAt` | fecha/hora opcional | Solo cuando está `DONE`. |

Una `PLANNED` de fecha pasada es **no realizada**; no hace falta almacenar un estado `MISSED`. `NOT_NEEDED` identifica sesiones futuras que dejan de requerirse al completar el resultado.

### 3.7 WorkLog (Registro de trabajo)

| Campo | Tipo | Regla |
|-------|------|-------|
| `id` | UUID | Identificador del bloque de trabajo. |
| `sourceType`, `sourceId` | `ACTIVITY` o `SUBACTIVITY`, UUID | Solo tarea simple o paso. |
| `date` | fecha local | Día en que se trabajó. |
| `minutes` | entero positivo | Tiempo real; puede haber varios bloques en un día. |
| `sessionId` | UUID opcional | Si se vincula, la sesión corresponde al mismo ítem y fecha. |

Se puede registrar trabajo sin sesión programada. Una sesión `DONE` exige al menos un bloque de trabajo vinculado en su fecha; desmarcarla desvincula los bloques y conserva sus minutos. Un bloque solo puede vincularse a una sesión que esté `DONE`.

### 3.8 DailyRecord (Registro diario)

| Campo | Tipo | Regla |
|-------|------|-------|
| `id`, `date` | UUID, fecha local | Un registro por fecha. |
| `plannedSessions`, `completedSessions` | enteros | Conteos de la agenda del día. |
| `adherencePercentage` | entero 0–100 o `null` | Sesiones realizadas / planeadas; `null` si no hubo sesiones. |
| `plannedMinutes` | entero | Suma de minutos previstos de la agenda. |
| `actualMinutes` | entero | Suma de `WorkLog.minutes` del día, incluso sin sesión. |
| `notes` | texto opcional | Reflexión del usuario. |
| `closedAt` | fecha/hora | Momento del cierre más reciente. |

Guarda un resumen, no duplica el detalle de sesiones y bloques de trabajo. Si se vuelve a cerrar la fecha, conserva el `id` y reemplaza el resumen, las notas y `closedAt`. Borrar una tarea conserva este resumen, aunque elimina el detalle de la tarea.

### 3.9 Proyecciones de agenda y calendario

La **agenda** muestra las sesiones `PLANNED` y `DONE` de la fecha elegida (hoy por defecto) que cumplen la visibilidad de RN-29, con minutos previstos y estado; permite registrar minutos reales y marcar la sesión realizada en hoy y en fechas pasadas (RN-27, RN-75). El **calendario** muestra esas sesiones en sus fechas programadas, incluidas las pasadas, y su jerarquía; excluye `NOT_NEEDED` y es solo de consulta. La constancia y el tiempo real se calculan desde sesiones y `WorkLog`, respectivamente.

## 4. Catálogos / enumeraciones

### 4.1 Convención de nombres

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Clases, tipos y enums | PascalCase, en inglés | `ActivityStatus` |
| Campos, variables y funciones | camelCase, en inglés | `scheduledDate`, `actualMinutes` |
| Valores de enum (código, API, BD) | UPPER_SNAKE_CASE, en inglés | `IN_PROGRESS` |
| Columnas y tablas de BD | snake_case, en inglés | `completed_at` |
| Textos de interfaz | Español, fuera del código | `"En progreso"` |

**Regla:** el código, la API y la BD solo manejan el valor en inglés. La etiqueta en español vive en un diccionario de UI indexado por el valor, por ejemplo `ActivityStatus.IN_PROGRESS → "En progreso"`.

### 4.2 Valores

| Enum | Valor (código) | Etiqueta UI |
|------|----------------|-------------|
| `GoalHorizon` | `SHORT_TERM` | Corto plazo |
| `GoalHorizon` | `MEDIUM_TERM` | Mediano plazo |
| `GoalHorizon` | `LONG_TERM` | Largo plazo |
| `GoalStatus` | `IDEA` | Idea |
| `GoalStatus` | `ACTIVE` | Activa |
| `GoalStatus` | `PAUSED` | Pausada |
| `ObjectiveNature` | `PERSONAL` | Personal |
| `ObjectiveNature` | `PROFESSIONAL` | Profesional |
| `ObjectiveNature` | `HEALTH` | Salud |
| `ObjectiveNature` | `FINANCE` | Finanzas |
| `ObjectiveNature` | `LEARNING` | Aprendizaje |
| `ObjectiveNature` | `HABIT` | Hábito |
| `ObjectiveNature` | `WELLBEING` | Bienestar |
| `ObjectiveNature` | `OTHER` | Otro |
| `ObjectiveStatus` | `ACTIVE` | Activo |
| `ObjectiveStatus` | `COMPLETED` | Completado |
| `ActivityType` | `SIMPLE` | Simple |
| `ActivityType` | `COMPOSITE` | Compuesta |
| `ActivityStatus` | `PENDING` | Pendiente |
| `ActivityStatus` | `IN_PROGRESS` | En progreso |
| `ActivityStatus` | `COMPLETED` | Completada |
| `ActivityStatus` | `PAUSED` | Pausada |
| `ActivityStatus` | `OVERDUE` | Vencida (derivado, no se almacena) |
| `SubActivityStatus` | `PENDING` | Pendiente |
| `SubActivityStatus` | `IN_PROGRESS` | En progreso |
| `SubActivityStatus` | `COMPLETED` | Completada |
| `ActivityPriority` | `HIGH` | Alta |
| `ActivityPriority` | `MEDIUM` | Media |
| `ActivityPriority` | `LOW` | Baja |
| `ActivityCriticality` | `VITAL` | Vital |
| `ActivityCriticality` | `ESSENTIAL_RECURRING` | Esencial recurrente |
| `ActivityCriticality` | `FLEXIBLE` | Flexible |
| `ActivityComplexity` | `LOW` | Baja |
| `ActivityComplexity` | `MEDIUM` | Media |
| `ActivityComplexity` | `HIGH` | Alta |
| `ActivityRecurrence` | `SINGLE` | Única |
| `ActivityRecurrence` | `WEEKLY_PATTERN` | Patrón semanal |
| `ActivityRecurrence` | `SPECIFIC_DATES` | Fechas específicas |
| `ExecutionPlanType` | `WEEKLY_PATTERN` | Patrón repetitivo |
| `ExecutionPlanType` | `SPECIFIC_DATES` | Fechas específicas |
| `WeekDay` | `MONDAY` | Lun |
| `WeekDay` | `TUESDAY` | Mar |
| `WeekDay` | `WEDNESDAY` | Mié |
| `WeekDay` | `THURSDAY` | Jue |
| `WeekDay` | `FRIDAY` | Vie |
| `WeekDay` | `SATURDAY` | Sáb |
| `WeekDay` | `SUNDAY` | Dom |
| `TaskSourceType` | `ACTIVITY` | Tarea |
| `TaskSourceType` | `SUBACTIVITY` | Paso |
| `SessionStatus` | `PLANNED` | Programada |
| `SessionStatus` | `DONE` | Realizada |
| `SessionStatus` | `NOT_NEEDED` | Ya no necesaria |

> **Nota:** las etiquetas de UI se pueden ajustar sin cambiar los valores del dominio.

### 4.3 Persistencia

En la BD se usa `enum` nativo (PostgreSQL) o `varchar` con `CHECK`. En NestJS, `enum` de TypeScript con `@IsEnum()` en los DTOs. Los valores de la API son los del código, nunca las etiquetas.

---

## 5. Reglas de negocio

Se numeran para referenciarlas desde la implementación y las pruebas.

### 5.1 Jerarquía e integridad

| ID | Regla |
|----|-------|
| RN-01 | Un **Objetivo** pertenece a exactamente una **Meta** (`goalId` obligatorio). |
| RN-02 | Una **Tarea** pertenece a exactamente un **Objetivo** (`objectiveId` obligatorio). |
| RN-03 | Un **Paso** pertenece a exactamente una **Tarea**, y esa tarea debe ser de tipo `COMPOSITE`. |
| RN-04 | Una tarea **simple** debe tener un Plan de Ejecución; una tarea **compuesta** no lo tiene (`executionPlan = null`). |
| RN-05 | Un **Paso** siempre tiene Plan de Ejecución. |
| RN-06 | No se puede reasignar un objetivo a otra meta ni una tarea a otro objetivo (el padre se toma de la ruta y no es editable). |

### 5.2 Eliminación en cascada

| ID | Regla |
|----|-------|
| RN-07 | Eliminar una **Meta** elimina todos sus Objetivos, y en cascada sus Tareas y Pasos. Requiere confirmación escrita (RN-62). |
| RN-08 | Eliminar un **Objetivo** elimina todas sus Tareas y sus Pasos. Requiere confirmación escrita (RN-62). |
| RN-09 | Eliminar una **Tarea** elimina todos sus Pasos. Requiere confirmación escrita (RN-62). |
| RN-10 | Tras cualquier eliminación se **recalcula el progreso** de los ancestros. |
| RN-11 | Los **Registros Diarios** no se ven afectados por eliminaciones (son snapshots independientes). |

> Es eliminación física. El resumen diario conserva sus cifras, pero el detalle de un ítem borrado se elimina.

### 5.3 Validaciones de campos

| ID | Regla |
|----|-------|
| RN-12 | Título de Meta, Objetivo y Tarea: requerido, **mínimo 3 caracteres**. |
| RN-13 | Título de Paso: requerido, **mínimo 3 caracteres**. |
| RN-14 | `deadline` es **obligatorio en el Objetivo** (RN-65). En Tarea y en Paso es opcional: la tarea, si se omite, hereda el deadline del objetivo; el paso, el efectivo de su tarea. Ningún deadline nuevo o modificado puede ser anterior a hoy. |
| RN-15 | `durationPerExecutionMin` ≥ **5** minutos. Requerido en pasos y en tareas simples. |
| RN-16 | Duración por defecto: **60 min** (tarea simple), **45 min** (paso). |
| RN-17 | Si el plan es `WEEKLY_PATTERN`, se debe seleccionar **al menos un día** de la semana. ("Selecciona al menos un día.") |
| RN-18 | Si el plan es `SPECIFIC_DATES`, se debe agregar **al menos una fecha**. ("Añade fechas específicas.") |
| RN-19 | Las fechas específicas no se pueden repetir y no pueden ser anteriores a hoy. Se guardan **ordenadas** ascendentemente. |
| RN-20 | El plan debe generar **al menos una sesión**; si el patrón no produce fechas antes del deadline se rechaza ("El plan no genera ninguna fecha de ejecución válida antes del deadline."). |

### 5.4 Generación del calendario (Plan de Ejecución)

| ID | Regla |
|----|-------|
| RN-21 | **Patrón repetitivo:** se genera una `ExecutionSession` por cada día seleccionado desde hoy hasta el deadline efectivo, inclusive. |
| RN-22 | **Fechas específicas:** se genera una `ExecutionSession` por cada fecha elegida, en orden ascendente. |
| RN-24 | `totalTimeRequiredMin` de una tarea simple es la suma de `plannedMinutes` de todas las sesiones de su plan, incluidas las que después pasen a `NOT_NEEDED`; en compuesta es la suma de `plannedMinutes` de todas las sesiones de sus pasos, con el mismo criterio. El paso no almacena este total. No representa tiempo real. |

### 5.5 Ejecución diaria

| ID | Regla |
|----|-------|
| RN-25 | La **agenda** de una fecha contiene las sesiones de esa fecha de tareas simples y pasos, con estado `PLANNED` o `DONE`, según la visibilidad de RN-29. Por defecto se muestra la de hoy (RN-75). |
| RN-26 | Una sesión de la agenda está realizada cuando su estado es `DONE`; eso no implica que la tarea o el paso estén terminados. |
| RN-27 | Se puede marcar o desmarcar una sesión de hoy o de una fecha pasada, sin límite hacia atrás. Las sesiones futuras no se marcan. Para marcarla se registran minutos reales en `WorkLog` de la fecha de la sesión; en una fecha pasada el valor inicial son los minutos previstos. Desmarcarla conserva el trabajo registrado sin asociarlo a la sesión. |
| RN-28 | "Hoy" se calcula en la **zona horaria local** del usuario. |
| RN-75 | **Navegar entre fechas.** La agenda permite ir al día anterior o siguiente, elegir una fecha y volver a hoy. Se puede consultar cualquier fecha; las futuras son de solo lectura (RN-27). La fecha elegida forma parte de la dirección de la pantalla, por lo que se puede abrir y compartir. |
| RN-29 | La agenda excluye los ítems de metas `PAUSED` o `IDEA` y de tareas `PAUSED` (RN-57, RN-59). No filtra por otros estados. |

### 5.6 Cálculo de progreso y estados (cascada ascendente)

| ID | Regla |
|----|-------|
| RN-30 | **Progreso de tarea simple o paso:** porcentaje entero 0–100 indicado por el usuario para representar el resultado alcanzado. No se calcula con sesiones ni minutos (RN-67). |
| RN-31 | **Estado de ítem ejecutable:** `PENDING` si progreso = 0, `COMPLETED` si progreso = 100 y `IN_PROGRESS` en otro caso; se respeta una pausa manual de tarea. |
| RN-32 | **Progreso de tarea compuesta** = promedio simple (redondeado) del progreso de sus pasos; 0 si no tiene pasos. Estado: `PENDING` si progreso = 0, `COMPLETED` si es 100 y `IN_PROGRESS` en otro caso. |
| RN-33 | **Progreso de objetivo** = promedio simple del progreso de sus tareas; 0 si no tiene. |
| RN-34 | **Progreso de meta** = promedio simple del progreso de sus objetivos; 0 si no tiene. |
| RN-35 | Los promedios son **no ponderados**: no consideran duración, complejidad, prioridad ni número de sesiones. |
| RN-36 | El progreso agregado se recalcula hacia arriba (paso → tarea → objetivo → meta) al cambiar el avance de un ítem ejecutable o al crear, editar o eliminar hijos. |
| RN-37 | Solo el avance de tareas simples y pasos es editable por el usuario; el avance de sus padres es calculado. Los estados de pausa y cierre siguen sus reglas propias. |

### 5.7 Cambio de tipo de tarea

| ID | Regla |
|----|-------|
| RN-39 | **Compuesta → Simple:** si tiene pasos, sesiones o `WorkLog`, se confirma la pérdida de esos datos. Al aceptar se eliminan los pasos y su detalle, y se crea el plan propio; al cancelar no se guarda nada. |
| RN-40 | **Simple → Compuesta:** `executionPlan` y `recurrence` pasan a `null`. Si existen sesiones o `WorkLog` de la tarea simple, se confirma su eliminación antes de convertirla. |

### 5.8 Cierre del día

| ID | Regla |
|----|-------|
| RN-41 | Al cerrar el día se guarda un `DailyRecord` con el resumen de sesiones, minutos previstos, minutos reales y notas opcionales. |
| RN-42 | `plannedMinutes` suma los minutos previstos de las sesiones visibles de la fecha cerrada; `actualMinutes` suma los `WorkLog.minutes` de esa fecha, incluidos los trabajos sin sesión programada. |
| RN-43 | **Un registro por fecha.** Cerrar un día que ya tiene registro reemplaza sus métricas, notas y fecha de cierre; conserva el mismo `id`. El historial conserva una sola fila por día con el cierre más reciente. |
| RN-44 | **Cerrar un día** se puede hacer con hoy o con cualquier fecha pasada. No bloquea ni modifica las tareas: sus sesiones se pueden seguir marcando después. Si el día ya está cerrado y cambian sus sesiones o su `WorkLog`, el `DailyRecord` se recalcula solo, conserva sus notas y actualiza `closedAt`. |

### 5.9 Recurrencia, planificación y deadlines

El plan define cuándo se trabaja, la recurrencia clasifica esa programación y el deadline fija el límite de todas las ejecuciones. RN-47 a RN-51 precisan RN-21 a RN-24 y RN-40.

> **Nota (RN-47):** la clasificación depende del tipo de plan y no del número de fechas generadas. Un patrón semanal que produce una sola fecha sigue siendo `WEEKLY_PATTERN`.

| ID | Regla |
|----|-------|
| RN-47 | **Recurrencia calculada, no elegida.** Se deriva del `executionPlan`: plan con `patternDays` → `WEEKLY_PATTERN`; plan de fechas específicas con **1** fecha → `SINGLE`; con **2 o más** fechas → `SPECIFIC_DATES`. Se recalcula en cada escritura. En compuestas es `null`. |
| RN-48 | **Límite de deadlines.** Cadena de topes: objetivo → tarea → paso. Una tarea puede tener deadline propio, que nunca puede superar el del objetivo; toda ejecución de una tarea debe ser ≤ su deadline efectivo. Un paso puede tener deadline propio, que nunca puede superar el efectivo de su tarea; cada ejecución de un paso debe ser ≤ su deadline efectivo. |
| RN-49 | **Cambio de deadline.** Al modificar el deadline de un objetivo, una tarea o un paso se validan todas las ejecuciones, tareas y pasos afectados. Si alguno incumple, el guardado se rechaza y se listan las fechas en conflicto. No se recortan fechas en silencio. Una tarea o un paso con deadline heredado no entra en conflicto: su deadline efectivo es el del padre y se actualiza solo. |
| RN-50 | **Tarea compuesta.** `executionPlan` y `recurrence` son `null`. Su progreso sale de sus pasos (RN-32). Cada paso tiene su propio plan obligatorio, con programación independiente de los demás pasos. |
| RN-51 | **Editar un plan.** Se conservan las sesiones pasadas, las `DONE` y los `WorkLog`. Solo se sustituyen sesiones futuras `PLANNED`; `NOT_NEEDED` conserva su estado histórico. |
| RN-52 | **Borrado con historial.** Cualquier elemento (meta, objetivo, tarea o paso) se puede borrar, aunque esté completado o tenga hijos. El borrado es en cascada (RN-07 a RN-09) y exige confirmación escrita (RN-62). Los respaldos quedan fuera del MVP. |
| RN-53 | **Agregar hijos.** Se pueden agregar pasos, tareas u objetivos a un padre existente, aunque ya tenga progreso. El progreso del padre se recalcula sobre todos sus hijos, así que puede bajar. |
| RN-54 | **Borrar hijos no completados.** Es posible borrar un elemento que no está completado. Solo se recalcula el progreso de sus ancestros. |
| RN-55 | **Idea.** Una meta puede existir en estado `IDEA`: sin tareas programadas, sin agenda y sin horizonte obligatorio. Pasa a `ACTIVE` cuando se le asigna horizonte y se crean sus tareas con deadline. |
| RN-56 | **La meta no tiene fecha.** Una meta no lleva deadline ni fecha objetivo; solo se clasifica por `horizon` (corto, mediano o largo plazo). Los deadlines que obligan son los del objetivo y, dentro de él, los de tareas y pasos (RN-14, RN-48, RN-65). |
| RN-57 | **Pausa de meta.** Pausar una meta cambia solo su estado a `PAUSED`. Se oculta su agenda, pero no se modifican deadlines, sesiones ni progreso de sus hijos. |
| RN-58 | **Tareas vencidas.** Una tarea no completada con deadline efectivo ya pasado se muestra como `OVERDUE`. Es un estado derivado, no se almacena. Al reanudar la meta, el usuario replanifica esas tareas. |
| RN-59 | **Pausa de tarea (MVP).** Igual que la pausa de meta: solo oculta la tarea de la agenda. No cambia su deadline, sus sesiones ni su progreso. |
| RN-60 | **Postergar sin penalización.** El usuario puede editar el deadline de cualquier elemento no completado sin restricciones de tiempo, salvo las de RN-48 y RN-49. Postergar no reduce el progreso ni borra historial. Las tareas `OVERDUE` son solo una etiqueta visual. |
| RN-61 | **Historial para estadísticas.** Los elementos no completados, pausados o vencidos se conservan, salvo borrado explícito (RN-52). Esto permitirá analizar a futuro qué metas se terminaron y cuáles no (fuera del MVP). |
| RN-62 | **Confirmación de borrado.** Borrar exige escribir el título exacto del elemento. Aplica a meta, objetivo, tarea y paso. Antes de confirmar se muestra qué se va a borrar: cuántos hijos y cuántos elementos completados. |
| RN-63 | **Cierre de objetivo.** `COMPLETED` no es automático. El usuario decide cuándo cerrar el objetivo, y solo se permite si su progreso es 100%. Llegar a 100% no lo cierra: queda `ACTIVE` hasta que el usuario lo cierre. Un objetivo cerrado puede seguir recibiendo tareas o pasos mientras los deadlines lo permitan (RN-53). |
| RN-64 | **Reapertura automática.** Si un objetivo `COMPLETED` baja de 100% porque recibe tareas o pasos, se borra un hijo completado o el usuario baja el avance de una tarea simple o un paso, vuelve a `ACTIVE` automáticamente. Su progreso lo mantiene por debajo de 100%, así que no puede seguir cerrado. |
| RN-65 | **Deadline del objetivo.** Cada objetivo tiene un `deadline` obligatorio, porque una meta puede tener varios objetivos y cada uno con su propio plazo. Es el tope de todas sus tareas y pasos (RN-48). Se puede postergar o adelantar sin restricciones de tiempo (RN-60), salvo que el guardado se rechaza si alguna tarea, paso o ejecución quedaría fuera del nuevo límite (RN-49). |
| RN-66 | **Calendario.** Muestra las `ExecutionSession` programadas de tareas simples y pasos, pasadas y futuras, excepto `NOT_NEEDED`. Aplica la visibilidad de RN-29. Es solo de consulta: no se marca ejecución desde el calendario. Al pasar el cursor, enfocar o tocar una sesión se muestra su jerarquía y los deadlines del objetivo y del ítem. Permite navegar por mes y año sin límite. |

### 5.10 Avance, constancia y tiempo real

| ID | Regla |
|----|-------|
| RN-67 | **Finalización del resultado.** Cuando el avance de una tarea simple o paso llega a 100 %, se fija `completedAt`; si baja, se borra. En tarea compuesta se calcula desde sus pasos y no se almacena (§3.3). Esto no altera retrospectivamente ninguna sesión. |
| RN-68 | **Medidas separadas.** Registrar minutos sin sesión no marca ninguna sesión como realizada. Realizar una sesión exige registrar minutos, pero no cambia automáticamente el avance. Indicar avance tampoco marca sesiones ni crea minutos. El objetivo conserva su cierre manual al llegar al 100 % (RN-63). |
| RN-69 | **Estado de sesión.** Cada fecha programada tiene una `ExecutionSession` única. `PLANNED` es la inicial; `DONE` significa que se trabajó ese día y tiene `completedAt`; `NOT_NEEDED` es una sesión futura que ya no se requiere. Una `PLANNED` pasada, o de hoy tras cerrar el día, se muestra como no realizada. Ninguna de estas situaciones cambia por sí sola el avance del resultado. |
| RN-70 | **Constancia.** `round(DONE / (DONE + no realizadas) × 100)` sobre las sesiones exigibles del ítem; devuelve `null` si no hay ninguna. Incluye las `DONE` hasta hoy y las `PLANNED` de fechas pasadas; una `PLANNED` de hoy cuenta al cerrar el día. Excluye sesiones futuras y `NOT_NEEDED`. En padres puede calcularse con todas las sesiones de sus descendientes ejecutables, sin promediar porcentajes. |
| RN-71 | **Tiempo real.** Cada `WorkLog` guarda minutos enteros positivos trabajados en una fecha, hoy o pasada pero nunca futura, para una tarea simple o un paso. Puede no estar ligado a una sesión. Si se vincula, la sesión debe estar `DONE` y deben coincidir ítem y fecha. Marcar una sesión `DONE` crea al menos un `WorkLog` vinculado; varios bloques del mismo día se suman. El tiempo planeado nunca sustituye al real. |
| RN-72 | **Cierre diario.** `DailyRecord` guarda sesiones planeadas y realizadas, porcentaje de constancia del día, minutos planeados, suma de `WorkLog.minutes`, notas y `closedAt`. El porcentaje es `null` si no hubo sesiones planeadas. Se toma de las sesiones visibles de la agenda de ese día; los minutos reales incluyen también trabajo sin sesión programada. Un nuevo cierre en la misma fecha reemplaza el resumen y conserva el `id` (RN-43); un cambio posterior en esa fecha lo recalcula (RN-44). |
| RN-73 | **Trabajo terminado antes del calendario.** Al llegar un ítem ejecutable a 100 %, sus sesiones `PLANNED` futuras pasan a `NOT_NEEDED` y dejan de aparecer en agenda y calendario; las sesiones `DONE` y las no realizadas de días pasados se conservan para la constancia. Si el avance vuelve a bajar, las `NOT_NEEDED` no se reactivan automáticamente: el usuario puede replanificar sesiones nuevas. |
| RN-74 | **Historial y borrado.** Editar un plan conserva las sesiones pasadas y los `WorkLog` ya registrados; solo reemplaza las sesiones futuras `PLANNED` (RN-51). Borrar un ítem elimina sus sesiones y `WorkLog` asociados, pero no modifica los resúmenes `DailyRecord` ya cerrados (RN-11, RN-52). |

---

## 6. Casos de uso

**Actor:** Usuario.

### Mapa de casos de uso

| ID | Caso de uso | Pantalla / ruta |
|----|-------------|-----------------|
| CU-01 | Listar metas | `/goals` |
| CU-02 | Crear meta | `/goals/new` |
| CU-03 | Ver detalle de meta | `/goals/:id` |
| CU-04 | Editar meta | `/goals/:id/edit` |
| CU-05 | Eliminar meta | `/goals` (tarjeta) |
| CU-06 | Crear objetivo | `/goals/:goalId/objectives/new` |
| CU-07 | Ver detalle de objetivo (tareas + pasos) | `/objectives/:id` |
| CU-08 | Editar objetivo | `/goals/:goalId/objectives/:id/edit` |
| CU-09 | Eliminar objetivo | `/goals/:id` |
| CU-10 | Crear tarea simple | `/objectives/:objectiveId/activities/new` |
| CU-11 | Crear tarea compuesta | misma ruta que CU-10 |
| CU-12 | Editar tarea (incl. cambio de tipo) | `/objectives/:objectiveId/activities/:activityId/edit` |
| CU-13 | Eliminar tarea | `/objectives/:id` |
| CU-14 | Crear paso | `/objectives/:oid/activities/:aid/add-step` |
| CU-15 | Editar paso | `/objectives/:oid/activities/:aid/steps/:sid/edit` |
| CU-16 | Eliminar paso | `/objectives/:id` |
| CU-17 | Ver agenda de una fecha (hoy por defecto) | `/daily` y `/daily?date=YYYY-MM-DD` |
| CU-18 | Marcar/desmarcar ejecución de hoy o de un día pasado | `/daily` |
| CU-19 | Ver resumen y cerrar día (hoy o pasado) | `/daily/summary` y `/daily/summary?date=YYYY-MM-DD` |
| CU-20 | Indicar avance del resultado | Detalle de tarea simple o paso |
| CU-21 | Consultar historial | `/history` |
| CU-22 | Crear idea (meta sin horizonte) | `/goals/new` |
| CU-23 | Pausar y reanudar meta o tarea | `/goals/:id`, `/objectives/:id` |
| CU-24 | Postergar (editar deadline) | `/goals/:goalId/objectives/:id/edit`, `/objectives/:id/activities/:id/edit` |
| CU-25 | Cerrar objetivo | `/objectives/:id` |
| CU-26 | Ver calendario | `/calendar` |
| CU-27 | Registrar tiempo real sin sesión | Agenda o detalle del ítem ejecutable |
| CU-28 | Consultar constancia | Detalle del ítem o historial |

### Detalle de casos de uso principales

#### CU-02 — Crear meta
- **Entrada:** `title` (≥3), `horizon` (opcional; sin horizonte se crea como `IDEA`).
- **Flujo:** valida → crea con `progress=0`, `status=ACTIVE` (o `IDEA` si no tiene horizonte), `createdAt=now` → redirige a `/goals`.
- **Reglas:** RN-12.

#### CU-03 — Ver detalle de meta
- Muestra título, horizonte, estado, progreso y lista de objetivos (naturaleza, estado, progreso).
- Si la meta no existe → redirige a `/goals`.

#### CU-04 — Editar meta
- **Editable:** `title`, `horizon` y pausa/reanudación (RN-57). El avance agregado y `createdAt` no se editan.
- **Reglas:** RN-12, RN-37.

#### CU-05 — Eliminar meta
- Confirmación: *"Esta acción eliminará TAMBIÉN todos sus objetivos, tareas y pasos asociados."*
- **Reglas:** RN-07, RN-11, RN-52, RN-62. Exige escribir el título de la meta.

#### CU-06 / CU-08 — Crear / editar objetivo
- **Entrada:** `title` (≥3), `nature`, `deadline` (obligatorio, ≥ hoy). El `goalId` viene de la ruta.
- **Reglas:** RN-65. Al editar, si el nuevo `deadline` deja tareas, pasos o ejecuciones fuera del límite, se rechaza y se listan las fechas (RN-49).
- **Post:** se recalcula el progreso de la meta (RN-34) — al crear, el objetivo nuevo (0%) **baja** el promedio de la meta.
- Redirige a `/goals/:goalId`.

#### CU-09 — Eliminar objetivo
- Confirmación: *"Todas las tareas asociadas serán eliminadas."* → RN-08, RN-10, RN-52, RN-62. Exige escribir el título del objetivo.

#### CU-10 — Crear tarea simple
- **Entrada:** `title`, `priority`, `criticality`, `complexity`, `deadline` (opcional; si se omite hereda el del objetivo), `duration`, `planType`, y `patternDays` **o** `specificDates`. La recurrencia no es entrada: se calcula (RN-47).
- **Flujo:**
  1. Valida campos (RN-12, RN-14, RN-15).
  2. Si `WEEKLY_PATTERN`: exige ≥1 día (RN-17) y genera fechas hoy→deadline efectivo (RN-21).
  3. Si `SPECIFIC_DATES`: exige ≥1 fecha (RN-18), ordena (RN-19).
  4. Si no hay fechas resultantes → error (RN-20).
  5. Crea con `status=PENDING`, `progress=0`, sesiones `PLANNED` y `totalTimeRequiredMin` calculado (RN-24).
  6. Recalcula progreso del objetivo y meta.
- **Redirige** a `/objectives/:objectiveId`.

#### CU-11 — Crear tarea compuesta
- Igual que CU-10 sin sección de plan: *"No defines tiempos ahora. Crearás sub-actividades (Pasos) después."*
- Se guarda sin `executionPlan`; `totalTimeRequiredMin` se calcula con sus pasos (RN-24).

#### CU-12 — Editar tarea
- Carga los datos existentes y conserva el avance, las sesiones pasadas y los registros de trabajo.
- Si es simple, regenera solo las sesiones futuras (RN-51).
- Si cambia **compuesta → simple** con pasos → RN-39. Si cambia **simple → compuesta** → RN-40.

#### CU-14 / CU-15 — Crear / editar paso
- **Entrada:** `title`, `complexity`, `deadline` (opcional; si se omite hereda el de la tarea), `duration` (≥5, default 45), `planType`, días o fechas.
- Mismo flujo de generación de fechas que CU-10 (RN-17 a RN-21).
- **Post:** recalcula tarea padre → objetivo → meta (RN-32 a RN-34).

#### CU-17 — Ver agenda de una fecha
- Muestra la fecha completa, sus sesiones, minutos previstos y constancia del día. Una barra permite ir al día anterior o siguiente, elegir una fecha y volver a hoy. Cada sesión permite registrar minutos reales al marcarla `DONE`; en fechas futuras solo se consulta.
- **Reglas:** RN-25, RN-26, RN-28, RN-29, RN-57, RN-59, RN-75.

#### CU-18 — Marcar ejecución
- **Entrada:** `sessionId` (sesión de hoy o pasada) y `minutes` (entero positivo, con los minutos previstos como valor inicial) al marcar; solo `sessionId` al desmarcar.
- **Flujo:** al marcar la sesión se registran minutos reales en `WorkLog` de su fecha y su estado pasa a `DONE`; al desmarcarla, el trabajo queda registrado sin vinculación. Si ese día ya estaba cerrado, su resumen se recalcula (RN-44). El avance del ítem no cambia (RN-27, RN-68, RN-71).

#### CU-19 — Cerrar día
- Muestra sesiones planeadas y realizadas, constancia del día, minutos previstos y reales y un campo de notas. Se abre con la fecha de la agenda que se estaba viendo. Al confirmar guarda o actualiza el `DailyRecord` de esa fecha (RN-41 a RN-44, RN-72).

#### CU-21 — Consultar historial
- Lista los resúmenes diarios por fecha. El detalle de una fecha se consulta desde sus sesiones y registros de trabajo; si se borró un ítem, permanece el resumen diario (RN-11, RN-74).

#### CU-22 — Crear idea
- **Entrada:** `title` (≥3). `horizon` opcional.
- **Flujo:** sin horizonte, la meta se crea con `status=IDEA`. No tiene tareas ni agenda (RN-55).
- **Promoción:** al asignar horizonte y crear tareas con deadline, pasa a `ACTIVE`.

#### CU-23 — Pausar y reanudar
- **Meta:** cambia `status` a `PAUSED`. Se oculta su agenda; deadlines y progreso no cambian (RN-57).
- **Tarea:** cambia `status` a `PAUSED`. Se oculta de la agenda (RN-59).
- **Reanudar:** la meta vuelve a `ACTIVE`; la tarea recalcula su estado desde su avance (RN-31). Las tareas que vencieron durante la pausa quedan como `OVERDUE` y se replanifican (RN-58).

#### CU-25 — Cerrar objetivo
- **Precondición:** progreso del objetivo = 100% (RN-63).
- **Flujo:** el usuario pulsa "Cerrar objetivo" → `status=COMPLETED`. Si el progreso no es 100%, la acción se rechaza.
- Un objetivo cerrado sigue visible y puede recibir tareas o pasos (RN-63). Si baja de 100%, vuelve a `ACTIVE` automáticamente (RN-64).

#### CU-24 — Postergar
- Editar el deadline de un elemento no completado. No reduce progreso ni borra historial (RN-60). Respetan RN-48 y RN-49.

#### CU-26 — Ver calendario
- **Entrada:** mes y año a mostrar (por defecto el actual). Navegación: mes anterior/siguiente, año anterior/siguiente y "Hoy".
- **Flujo:** muestra la cuadrícula del mes (semana desde el lunes) con las sesiones de cada día (tareas simples y pasos). Al pasar el cursor, enfocar o tocar una sesión se ve su detalle: meta, objetivo (con su deadline), tarea y paso, con el deadline efectivo de la tarea o del paso. Al elegir un día se lista el detalle de todas sus sesiones.
- **Reglas:** RN-25, RN-26, RN-29, RN-48, RN-66, RN-69, RN-73. Solo consulta; no muestra sesiones `NOT_NEEDED`.

#### CU-20, CU-27 y CU-28 — Avance, tiempo real y constancia
- En el detalle de una tarea simple o de un paso, el usuario indica su avance (0–100). Ese valor no cambia por realizar sesiones ni por registrar tiempo; los padres agregan el avance (RN-67, RN-68).
- El usuario puede registrar minutos trabajados en hoy o en un día pasado aun sin sesión programada. La constancia muestra sesiones exigibles realizadas / exigibles totales; si no hay ninguna, se muestra «sin datos» (RN-70, RN-71).

---

## 7. Modelo de datos propuesto para la base de datos

Se propone un modelo **relacional** (recomendado: PostgreSQL), ya que el dominio es estrictamente jerárquico, con cascadas y agregaciones. El modelo es agnóstico del ORM (TypeORM, Prisma o MikroORM).

### 7.1 Diagrama entidad-relación

```mermaid
erDiagram
    USER ||--o{ GOAL : "posee"
    USER ||--o{ DAILY_RECORD : "registra"
    GOAL ||--o{ OBJECTIVE : "contiene"
    OBJECTIVE ||--o{ ACTIVITY : "contiene"
    ACTIVITY ||--o{ SUB_ACTIVITY : "se divide en (si compuesta)"
    ACTIVITY ||--o| EXECUTION_PLAN : "tiene (si simple)"
    SUB_ACTIVITY ||--|| EXECUTION_PLAN : "tiene"
    EXECUTION_PLAN ||--o{ EXECUTION_PLAN_DAY : "días del patrón"
    EXECUTION_PLAN ||--o{ EXECUTION_SESSION : "sesiones programadas"
    ACTIVITY ||--o{ WORK_LOG : "trabajo registrado (simple)"
    SUB_ACTIVITY ||--o{ WORK_LOG : "trabajo registrado (paso)"
    EXECUTION_SESSION o|--o{ WORK_LOG : "trabajo asociado"

    USER {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar timezone "IANA, ej. America/Mexico_City"
        timestamptz created_at
        timestamptz updated_at
    }
    GOAL {
        uuid id PK
        uuid user_id FK
        varchar title
        goal_horizon horizon "nullable (ideas)"
        goal_status status
        smallint progress "0-100, calculado"
        timestamptz created_at
        timestamptz updated_at
    }
    OBJECTIVE {
        uuid id PK
        uuid goal_id FK
        varchar title
        objective_nature nature
        objective_status status
        date deadline "obligatoria"
        smallint progress
        timestamptz created_at
        timestamptz updated_at
    }
    ACTIVITY {
        uuid id PK
        uuid objective_id FK
        varchar title
        activity_type type
        activity_priority priority
        activity_criticality criticality
        activity_complexity complexity
        activity_recurrence recurrence "nullable, derivada del plan"
        date deadline "nullable, hereda del objetivo"
        int total_time_required_min "calculado"
        smallint progress
        activity_status status
        timestamptz completed_at "nullable, solo simple"
        timestamptz created_at
        timestamptz updated_at
    }
    SUB_ACTIVITY {
        uuid id PK
        uuid activity_id FK
        varchar title
        activity_complexity complexity
        date deadline "nullable, hereda de la tarea o del objetivo"
        smallint progress
        sub_activity_status status
        timestamptz completed_at "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    EXECUTION_PLAN {
        uuid id PK
        uuid activity_id FK "nullable, unique"
        uuid sub_activity_id FK "nullable, unique"
        execution_plan_type type
        smallint duration_per_execution_min
        timestamptz created_at
        timestamptz updated_at
    }
    EXECUTION_PLAN_DAY {
        uuid plan_id PK,FK
        week_day day PK
    }
    EXECUTION_SESSION {
        uuid id PK
        uuid plan_id FK
        date scheduled_date
        int planned_minutes
        session_status status "PLANNED, DONE, NOT_NEEDED"
        timestamptz completed_at "nullable"
    }
    WORK_LOG {
        uuid id PK
        uuid activity_id FK "nullable, solo simple"
        uuid sub_activity_id FK "nullable, solo paso"
        uuid session_id FK "nullable"
        date date
        int minutes "positivo"
    }
    DAILY_RECORD {
        uuid id PK
        uuid user_id FK
        date date
        int planned_sessions
        int completed_sessions
        smallint adherence_percentage "nullable"
        int planned_minutes
        int actual_minutes
        text notes
        timestamptz closed_at
    }
```

### 7.2 Decisiones clave del modelo

1. **`USER`:** identifica al dueño de los datos y su zona horaria para calcular "hoy" (RN-28). La decisión de autenticación pertenece al diseño de implementación.
2. **`EXECUTION_PLAN` como tabla propia** con FK exclusiva: `CHECK ((activity_id IS NULL) <> (sub_activity_id IS NULL))` + `UNIQUE` en cada FK. Alternativa válida: columnas del plan directamente en `activity` y `sub_activity` (más simple, algo de duplicación).
3. **`EXECUTION_SESSION`** guarda cada sesión programada y su estado en una sola fila:
   - Cada fecha programada es una fila con minutos previstos y estado `PLANNED`, `DONE` o `NOT_NEEDED`. `completed_at` solo existe en `DONE`.
   - `UNIQUE (plan_id, scheduled_date)`.
   - Índice en `scheduled_date` → la Agenda de Hoy es un `SELECT … WHERE scheduled_date = :today`.
   - Al editar el plan se conservan sesiones pasadas y realizadas; solo se regeneran las futuras `PLANNED` (RN-51, RN-74).
   - La constancia se calcula con sesiones exigibles (RN-70); **el avance no se calcula con las sesiones** (RN-67).
4. **`EXECUTION_PLAN_DAY`** guarda `patternDays` (necesario para re-generar y para editar el formulario).
5. **`WORK_LOG`** guarda trabajo real de una tarea simple o un paso: `CHECK ((activity_id IS NULL) <> (sub_activity_id IS NULL))`, `minutes > 0`; `session_id` opcional. Al ligarlo a una sesión, servicio y transacción comprueban el mismo ítem y fecha. Borrar un ítem borra sus registros de trabajo.
6. **Progreso:** en tarea simple y paso se guarda el porcentaje indicado por el usuario; en tarea compuesta, objetivo y meta se recalcula el promedio de hijos en la misma transacción (RN-30 a RN-36). `completed_at` pertenece al resultado, no a la constancia.
7. **Fechas de calendario** (`deadline`, `scheduled_date`, `work_log.date`, `daily_record.date`) como `DATE`, nunca `timestamp`, para respetar el día local (RN-28).
8. **Cascadas:** `ON DELETE CASCADE` en `goal → objective → activity → sub_activity → execution_plan → execution_session / execution_plan_day` y en los `WORK_LOG` de un ítem. El recálculo de progreso de ancestros se hace en el servicio.
9. **`DAILY_RECORD`:** `UNIQUE (user_id, date)`, un resumen por día; los `WORK_LOG` y las sesiones guardan el detalle. `closed_at` se actualiza al volver a cerrar el mismo día (RN-43, RN-72).
10. **IDs:** UUID. Definir si los genera el cliente o el servidor al diseñar la API.
11. **Calendario (RN-66):** se resuelve con `EXECUTION_SESSION` filtrada por rango de `scheduled_date` y los joins de la jerarquía (meta › objetivo › tarea › paso), excluyendo metas `PAUSED`/`IDEA` y tareas `PAUSED` igual que la agenda. El índice `(scheduled_date)` lo cubre.

### 7.3 Índices recomendados

| Tabla | Índice |
|-------|--------|
| `goal` | `(user_id)` |
| `objective` | `(goal_id)` |
| `activity` | `(objective_id)`, `(deadline)` |
| `sub_activity` | `(activity_id)` |
| `execution_plan` | `UNIQUE (activity_id)`, `UNIQUE (sub_activity_id)` |
| `execution_session` | `UNIQUE (plan_id, scheduled_date)`, `(scheduled_date)` |
| `work_log` | `(activity_id, date)`, `(sub_activity_id, date)`, `(session_id)` |
| `daily_record` | `UNIQUE (user_id, date)` |

### 7.4 Sugerencia de módulos NestJS

| Módulo | Responsabilidad |
|--------|-----------------|
| `AuthModule` / `UsersModule` | Registro, login (JWT), zona horaria del usuario. |
| `GoalsModule` | CRUD de metas. |
| `ObjectivesModule` | CRUD de objetivos. |
| `ActivitiesModule` | CRUD de tareas, cambio de tipo (RN-39/40). |
| `SubActivitiesModule` | CRUD de pasos. |
| `ExecutionPlansModule` | Generación de sesiones (RN-21, RN-22, RN-47 a RN-51), servicio de fechas. |
| `ProgressModule` (servicio) | Registrar avance de tareas simples y pasos; recalcular ancestros (RN-30 a RN-37). |
| `WorkLogsModule` | Registrar minutos reales y vincularlos opcionalmente a sesiones (RN-71). |
| `DailyModule` | Agenda, constancia, cierre del día e historial (RN-69 a RN-72). |

---

## 8. Propuesta de API REST

Esta API expresa las operaciones que exige el modelo de avance, sesiones y tiempo real.

Rutas anidadas para creación y listado por padre; operaciones sobre un recurso por su identificador directo.

### Metas
| Método | Ruta | Caso de uso | Notas |
|--------|------|-------------|-------|
| GET | `/goals` | CU-01 | Lista con `progress`, `status`. |
| POST | `/goals` | CU-02, CU-22 | `{ title, horizon?, status? }`. Sin horizonte se crea como `IDEA`. |
| GET | `/goals/:id` | CU-03 | Incluye objetivos (o usar endpoint de abajo). |
| PATCH | `/goals/:id` | CU-04, CU-23 | `{ title?, horizon?, status? }` |
| DELETE | `/goals/:id` | CU-05 | Cascada. |

### Objetivos
| Método | Ruta | Caso de uso |
|--------|------|-------------|
| GET | `/goals/:goalId/objectives` | CU-03 |
| POST | `/goals/:goalId/objectives` | CU-06 — `{ title, nature, deadline }` |
| GET | `/objectives/:id` | CU-07 — incluye tareas y pasos |
| PATCH | `/objectives/:id` | CU-08, CU-24 — si `deadline` deja hijos fuera del límite, responde con la lista de fechas en conflicto (RN-49) |
| DELETE | `/objectives/:id` | CU-09 |

### Tareas
| Método | Ruta | Caso de uso |
|--------|------|-------------|
| GET | `/objectives/:objectiveId/activities` | CU-07 |
| POST | `/objectives/:objectiveId/activities` | CU-10 / CU-11 |
| GET | `/activities/:id` | — |
| PATCH | `/activities/:id` | CU-12, CU-23, CU-24. Pausar: `status: PAUSED`; reanudar: el estado se recalcula desde el progreso (RN-31). Si hay pérdida de datos (compuesta→simple con pasos, o simple→compuesta con sesiones o `WorkLog`), exige `confirmDataLoss: true` o responde `409` (RN-39, RN-40). |
| PATCH | `/activities/:id/progress` | CU-20, RN-30/67/73 — `{ progress: 0..100 }`, solo tarea simple; recalcula sus ancestros y las sesiones futuras. |
| DELETE | `/activities/:id` | CU-13 |

Ejemplo de cuerpo (tarea simple):
```json
{
  "title": "Correr 5km",
  "type": "SIMPLE",
  "priority": "HIGH",
  "criticality": "ESSENTIAL_RECURRING",
  "complexity": "MEDIUM",
  "deadline": "2026-12-31",
  "executionPlan": {
    "type": "WEEKLY_PATTERN",
    "patternDays": ["MONDAY", "WEDNESDAY", "FRIDAY"],
    "durationPerExecutionMin": 45
  }
}
```
> Al crear una tarea, el servidor genera las sesiones y calcula `recurrence` y `totalTimeRequiredMin`. El avance de una tarea simple se registra después con el endpoint de progreso. Para `SPECIFIC_DATES` el cliente envía las fechas solicitadas en `executionPlan.specificDates`; el plan persistido no duplica las sesiones.

### Pasos
| Método | Ruta | Caso de uso |
|--------|------|-------------|
| GET | `/activities/:activityId/sub-activities` | CU-07 |
| POST | `/activities/:activityId/sub-activities` | CU-14 (400/422 si la tarea no es compuesta) |
| PATCH | `/sub-activities/:id` | CU-15 |
| PATCH | `/sub-activities/:id/progress` | CU-20, RN-30/67/73 — `{ progress: 0..100 }`; recalcula tarea compuesta, objetivo y meta. |
| DELETE | `/sub-activities/:id` | CU-16 |

### Sesiones, tiempo real y cierre diario
| Método | Ruta | Caso de uso | Notas |
|--------|------|-------------|-------|
| GET | `/daily?date=` | CU-17 | Devuelve sesiones visibles de la fecha (hoy si se omite), sus estados, trabajo registrado y métricas. "Hoy" según `user.timezone`. |
| POST | `/execution-sessions/:id/complete` | CU-18, RN-69/71 | `{ minutes: entero positivo }`. Sesión de hoy o pasada (`422` si es futura): crea `WorkLog` en la fecha de la sesión y marca `DONE` en una transacción. Si esa fecha tiene `DailyRecord`, lo recalcula. No cambia `progress`. |
| DELETE | `/execution-sessions/:id/completion` | CU-18 | Vuelve a `PLANNED`; desvincula los `WorkLog` de la sesión y los conserva como trabajo sin sesión. Recalcula el `DailyRecord` de esa fecha si existe. |
| POST | `/work-logs` | RN-71 | `{ sourceType, sourceId, minutes, sessionId?, date? }`; `date` es hoy si se omite y nunca futura. Registra trabajo con o sin sesión. |
| GET | `/work-logs?date=` | RN-71 | Detalle del tiempo real de la fecha. |
| POST | `/daily/records` | CU-19 | `{ date?, notes? }` (hoy si se omite; no futura) → calcula el resumen con sesiones y `WorkLog`. Upsert por fecha (RN-43, RN-72). |
| GET | `/daily/records?from=&to=` | CU-21 | Historial. |

### Validación (DTOs con `class-validator`)
- `title`: `@IsString() @MinLength(3)`
- enums: `@IsEnum(...)`
- `deadline`, fechas: `@IsDateString()` (solo fecha) + validación "≥ hoy" en servicio.
- `durationPerExecutionMin`: `@IsInt() @Min(5)`
- `patternDays`: `@ArrayMinSize(1)` cuando `type = WEEKLY_PATTERN` (`@ValidateIf`).
- `specificDates`: `@ArrayMinSize(1) @ArrayUnique()` cuando `type = SPECIFIC_DATES`.
- `deadline` de objetivo: obligatorio. `deadline` de tarea y de paso: `@IsOptional()`; si se envía, debe ser ≤ el efectivo de su padre (RN-48).
- `progress` editable: `@IsInt() @Min(0) @Max(100)` solo en tarea simple o paso; nunca se deriva de sesiones ni minutos (RN-67).
- `WorkLog.minutes`: entero positivo; `sessionId`, si existe, debe referir a una sesión `DONE` del mismo ítem y de la misma fecha, que no sea futura (RN-71).

---

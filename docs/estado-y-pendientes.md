# Estado de implementación y decisiones abiertas

La especificación del producto está en [docs/analisis-reglas-de-negocio.md](analisis-reglas-de-negocio.md). Este documento es su complemento de trabajo: compara esa definición con el código, reúne lo que falta decidir y señala lo que hay que corregir en la especificación. **No define reglas.**

## Cómo se usa

Cómo entra y sale cada elemento de este documento (propuestas `P-xx`, decisiones `D-xx`, correcciones `C-xx`, filas de la comparación) y qué estados se usan está en el agente de documentación: [Agents/funcionalidad/Agents-documentacion.md](../Agents/funcionalidad/Agents-documentacion.md).

## Comparación con el código

| Tema | Definido | Estado del código |
|------|----------|-------------------|
| Nota de la sesión y registro diario | Al marcar se piden tiempo realizado y nota, también hoy; se corrigen tiempo y nota de una sesión hecha, también desde la edición de la sesión (CU-30); cada sesión muestra su estado, su resultado y si está vencida; `DailyRecord` guarda sus sesiones; la agenda muestra el registro de cada fecha y no hay pantalla de historial (sección 3.7, RN-27, RN-41, RN-69, RN-72, RN-75, RN-76, CU-17 a CU-19). | ⏳ Pendiente (plan 01, fase 4). La sesión no tiene `notes`, hoy se marca sin preguntar, `DailyRecord` no tiene `sessionIds` y existe `/history`. |
| Métricas | Conteos y promedios por nivel (RN-86, CU-32). | ⏳ Pendiente (plan 01, fase 5). No existe la pantalla. |
| Fecha de finalización (`completedAt`) | Tarea simple y paso fijan `completedAt` al quedar completos y lo limpian si dejan de estarlo; en compuesta se calcula desde sus pasos (sección 3.3, sección 3.4, RN-67). | ⏳ Pendiente. `Activity` y `SubActivity` guardan `closure`, pero no tienen `completedAt`. |
| Backend | Aplica las mismas reglas y persiste el modelo de las secciones 7 y 8. | ⏳ Pendiente. Solo existe el proyecto base de NestJS. |

Lo que no aparece en la tabla está implementado y vive en las reglas y en [timer-planner-frontend/docs/funcionalidad.md](../timer-planner-frontend/docs/funcionalidad.md).

## Trabajo pendiente

| Tema | Estado |
|------|--------|
| Recorrido manual en el navegador: datos guardados de la versión anterior (el tiempo de cada sesión hecha se conserva y el tiempo sin sesión desaparece); idea y su promoción; fecha límite de la meta (obligatoria con horizonte, una meta antigua la pide al editarla, objetivo más allá de ella rechazado, cierre al vencer y reapertura con fecha nueva); resultado y vencido junto al estado en listas y detalles; patrón semanal sin desfase de día; deadline mayor al del padre rechazado; borrado con confirmación escrita; agenda de días pasados con su tiempo realizado, cierre del día repetido y cierre automático de días al abrir la app; historial; calendario con hover y cambio de mes; estados abierto, pausado y cerrado en los cuatro niveles con su motivo de cierre; pausa heredada; cierre a mano en cascada, por fecha límite, al completarse (hecha con todo su tiempo; con menos tiempo no se cierra) y por cierre de sus hijos; sesiones ocultas por un cierre en agenda y calendario; reabrir (con deadline nuevo si venció) y reapertura al agregar hijos; formularios bloqueados de lo cerrado; sugerencia de cerrar con la productividad al 100 %; constancia, productividad y avance en listas y detalles; editar una sesión desde la agenda (un lunes al domingo, una vencida a hoy, una hecha solo hasta hoy, después del deadline rechazada, dos sesiones del mismo ítem en un día, su tiempo previsto) y borrarla dejando al menos una; en los formularios de tarea simple y paso, «mismo tiempo», tiempo por sesión, agregar y borrar sesiones, y editar el plan después sin perder lo ajustado | ⏳ Pendiente |
| Backend | ⏳ Pendiente; requiere D-01 |
| Agente planificador del backend (`timer-planner-backend/Agents/funcionalidad/`) | ⏳ Pendiente; se crea al empezar el backend |

## Propuestas en discusión

P-01 y P-04 están acordadas: falta escribirlas en el documento de reglas y planificarlas. P-05 sigue en discusión.

| ID | Qué se quiere | Reglas que toca |
|----|---------------|-----------------|
| P-01 | **Reabrir con fecha vencida.** Al reabrir, un solo diálogo lista lo vencido que tiene trabajo pendiente (el elemento, sus padres y sus hijos sin terminar) y pide una fecha nueva que se aplica a todos: desde hoy y sin pasar la de un padre que no haya vencido. Los hijos al 100 % siguen cerrados. Las sesiones no realizadas que quedaron atrás por una pausa o un cierre se pueden mover a hoy o después. Ejemplo: se reabre «Inglés», que venció el 30 de octubre, con «Leer», que venció el 20 sin terminar; los dos reciben la fecha nueva y las sesiones atrasadas de «Leer» se pueden mover. | RN-57, RN-64, RN-79, RN-82, CU-20, CU-23, CU-30 |
| P-04 | **Aviso de borrado simple.** El aviso solo dice qué se elimina en cascada («2 tareas, 3 pasos») y pide escribir el título; ya no cuenta los elementos cerrados. | RN-62 |
| P-05 | **Ideas en los cuatro niveles.** Además de la meta, un objetivo, una tarea o un paso pueden ser una idea, sin fechas ni deadline. Pausar un padre pausa a sus hijos, como hoy. | RN-55, RN-57, RN-77, D-05 |

## Decisiones abiertas

Ninguna está decidida. Mientras no se decida, el código no la implementa por su cuenta.

### Generales

| ID | Pregunta | Reglas relacionadas |
|----|----------|---------------------|
| D-01 | Autenticación y número de usuarios; motor de base de datos y ORM. | sección 7.2 punto 1, sección 7.4 |
| D-05 | En qué momento una idea acepta objetivos y tareas y pasa a meta activa. RN-55 la abre al tener horizonte y tareas; CU-02 crea `OPEN` una meta nueva con horizonte. Tampoco está definido qué pasa si se quita el horizonte a una meta activa. | RN-55, CU-02, CU-22, P-05 |
| D-07 | Si objetivos, tareas y pasos necesitan orden manual. | — |
| D-08 | Respaldos y recuperación de elementos borrados (fuera del MVP). | RN-52 |
| D-09 | Endpoint de consulta del calendario por rango de fechas y cómo expone la API la constancia y la productividad calculadas de un ítem o padre (CU-28). | RN-66, RN-70, RN-73, CU-28, sección 7.2 punto 11, sección 8 |

## Correcciones pendientes en el documento de reglas

| ID | Ubicación | Problema y corrección propuesta |
|----|-----------|---------------------------------|
| C-13 | Sección 7.1 (Diagrama ER y tablas) | Las secciones 3.1 a 3.4 y RN-57 definen `pauses: [{ from, to? }]` en `Goal`, `Objective`, `Activity` y `SubActivity`, pero en las tablas de la sección 7.1 no aparece columna ni tabla para persistir los periodos de pausa. Agregar su representación en el modelo de BD (por ejemplo `jsonb` o tabla de pausas). |

## Números libres

Se pueden reutilizar para un elemento nuevo; al usar uno, se quita de aquí (ver el agente de documentación).

- **RN:** RN-23, RN-38, RN-45, RN-46.
- **CU:** CU-21, CU-27.
- **P:** P-02, P-03, P-06.
- **D:** D-02, D-03, D-04, D-06, D-10 a D-18.
- **C:** C-01 a C-12.

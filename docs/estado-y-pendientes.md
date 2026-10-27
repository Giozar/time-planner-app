# Estado de implementación y decisiones abiertas

La especificación del producto está en [docs/analisis-reglas-de-negocio.md](analisis-reglas-de-negocio.md). Este documento es su complemento de trabajo: compara esa definición con el código, reúne lo que falta decidir y señala lo que hay que corregir en la especificación. **No define reglas.**

## Cómo se usa

Cómo entra y sale cada elemento de este documento (propuestas `P-xx`, decisiones `D-xx`, correcciones `C-xx`, filas de la comparación) y qué estados se usan está en el agente de documentación: [Agents/funcionalidad/Agents-documentacion.md](../Agents/funcionalidad/Agents-documentacion.md).

## Comparación con el código

| Tema | Definido | Estado del código |
|------|----------|-------------------|
| Fecha de finalización (`completedAt`) | Tarea simple y paso fijan `completedAt` al llegar a 100 % y lo limpian si baja; en compuesta se calcula desde sus pasos (sección 3.3, sección 3.4, RN-67). | ⏳ Pendiente. `Activity` y `SubActivity` guardan `closure`, pero no tienen `completedAt`. |
| Backend | Aplica las mismas reglas y persiste el modelo de las secciones 7 y 8. | ⏳ Pendiente. Solo existe el proyecto base de NestJS. |

Lo que no aparece en la tabla está implementado y vive en las reglas y en [timer-planner-frontend/docs/funcionalidad.md](../timer-planner-frontend/docs/funcionalidad.md).

## Trabajo pendiente

| Tema | Estado |
|------|--------|
| Recorrido manual en el navegador: idea y su promoción; patrón semanal sin desfase de día; deadline mayor al del padre rechazado; borrado con confirmación escrita; agenda de días pasados con minutos, cierre del día repetido y cierre automático de días al abrir la app; historial; calendario con hover y cambio de mes; estados abierto, pausado y cerrado en los cuatro niveles con su motivo de cierre; pausa heredada; cierre a mano en cascada, por fecha límite, por sesiones completas y por cierre de sus hijos; sesiones ocultas por un cierre en agenda y calendario; reabrir (con deadline nuevo si venció) y reapertura al agregar hijos; formularios bloqueados de lo cerrado; sugerencia de cerrar con la productividad al 100 %; avance, constancia y productividad en listas y detalles; mover una sesión (un lunes al domingo, fecha pasada o después del deadline rechazada, dos sesiones del mismo ítem en un día y editar el plan después de moverla) | ⏳ Pendiente |
| Borrar `toggleTaskExecution` de `PlannerService`: busca la sesión por tarea y fecha, y con dos sesiones del mismo ítem en un día tomaría la primera (RN-82). Sus pruebas pasan a `toggleSession`. | ⏳ Pendiente |
| Textos de pantalla: «Finalizar Día» pasa a «Cerrar día» (CU-19) y «completada(s)» a «realizada(s)» en el aviso de cambio de tipo de tarea | ⏳ Pendiente |
| Backend | ⏳ Pendiente; requiere D-01 |
| Agente planificador del backend (`timer-planner-backend/Agents/funcionalidad/`) | ⏳ Pendiente; se crea al empezar el backend |

## Propuestas en discusión

P-01 a P-04 están acordadas: falta escribirlas en el documento de reglas y planificarlas. P-05 sigue en discusión. P-06 está acordada salvo sus supuestos por confirmar.

| ID | Qué se quiere | Reglas que toca |
|----|---------------|-----------------|
| P-01 | **Reabrir con fecha vencida.** Al reabrir, un solo diálogo lista lo vencido que tiene trabajo pendiente (el elemento, sus padres y sus hijos sin terminar) y pide una fecha nueva que se aplica a todos: desde hoy y sin pasar la de un padre que no haya vencido. Los hijos al 100 % siguen cerrados. Las sesiones no realizadas que quedaron atrás por una pausa o un cierre se pueden mover a hoy o después. Ejemplo: se reabre «Inglés», que venció el 30 de octubre, con «Leer», que venció el 20 sin terminar; los dos reciben la fecha nueva y las sesiones atrasadas de «Leer» se pueden mover. | RN-57, RN-64, RN-79, RN-82, CU-20, CU-23, CU-30 |
| P-02 | **Historial con avance y día cerrado fijo.** Al cerrar el día se guarda el avance de cada tarea y paso de su agenda, y el historial lo muestra: «Correr 2 de 4». Volver a cerrar un día ya cerrado solo cambia sus notas, sin recalcular: lo que se marque después no cambia ese día. | RN-41 a RN-44, RN-72, RN-76, RN-81, CU-18, CU-19, CU-21, CU-27, CU-28, secciones 3.8, 7 y 8 |
| P-03 | **Completada / Sin completar.** Un dato aparte del estado, calculado del avance al 100 %. Se muestra junto al estado («Cerrada · Sin completar») y servirá para filtrar. | RN-31, RN-67, RN-68 |
| P-04 | **Aviso de borrado simple.** El aviso solo dice qué se elimina en cascada («2 tareas, 3 pasos») y pide escribir el título; ya no cuenta los elementos cerrados. | RN-62 |
| P-05 | **Ideas en los cuatro niveles.** Además de la meta, un objetivo, una tarea o un paso pueden ser una idea, sin fechas ni deadline. Pausar un padre pausa a sus hijos, como hoy. | RN-55, RN-57, RN-77, D-05 |
| P-06 | **Flujo principal simplificado** (`docs/ideas-flujo-principal.md`). Acordado: la meta tiene fecha límite y la cascada llega hasta la sesión; meta, objetivo, tarea, paso y sesión tienen estado, resultado (completo o incompleto) y vencido; la sesión guarda su tiempo realizado y sus notas; constancia = sesiones realizadas ÷ todas las sesiones; productividad = tiempo realizado ÷ tiempo definido; avance = promedio de las dos, con la productividad topada en 100 %, y solo es completo al 100 %; vencido = pasó su fecha con 0 %; se quita el tiempo sin sesión; el registro diario guarda sus sesiones y la nota del día; el historial pasa a la agenda; métricas por nivel. Incluye P-03 y reemplaza P-02. **Supuestos por confirmar:** (1) la meta idea no tiene fecha; una meta de plazo sin fecha la pide al editarla; (2) estado, resultado y vencido se calculan, no se guardan; (3) la sesión hecha queda cerrada; la de fecha pasada sin hacer, cerrada y vencida; (4) al marcar una sesión se piden su tiempo realizado (el previsto por defecto) y su nota; (5) una sesión se puede editar (fecha y tiempo) aunque esté hecha, sin pasar la fecha límite de su padre, y se puede agregar o borrar una sola; (6) cierres automáticos, reabrir y pausa siguen como hoy, pero el cierre por sesiones completas pasa a ser al quedar completo; (7) en la agenda de cada fecha se ve su registro diario y se quita la pantalla Historial; (8) métricas: por nivel, cuántos completos, incompletos, cerrados y vencidos, más constancia y productividad. | RN-14, RN-24, RN-26, RN-27, RN-30 a RN-35, RN-41 a RN-44, RN-48, RN-56, RN-58, RN-64, RN-65, RN-67 a RN-77, RN-79, RN-81, RN-82, CU-02, CU-04, CU-17 a CU-19, CU-21, CU-27, CU-28, CU-30, secciones 3.1, 3.6 a 3.8, P-02, P-03 |

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
| C-01 | RN-70 (Constancia) | Excluye todas las sesiones de fechas en pausa; debe excluir solo las no realizadas. Una sesión hecha en un día en pausa cuenta, como hace el código. |
| C-02 | RN-77 (Formas de cerrar) | Dice que un cierre por sesiones completas se deshace «al desmarcar una sesión o al editar el plan», pero lo cerrado no deja editar el plan (RN-80). Quitar «o al editar el plan». |
| C-13 | Sección 7.1 (Diagrama ER y tablas) | Las secciones 3.1 a 3.4 y RN-70 definen `pauses: [{ from, to? }]` en `Goal`, `Objective`, `Activity` y `SubActivity`, pero en las tablas de la sección 7.1 no aparece columna ni tabla para persistir los periodos de pausa. Agregar su representación en el modelo de BD (por ejemplo `jsonb` o tabla de pausas). |

## Números libres

Se pueden reutilizar para un elemento nuevo; al usar uno, se quita de aquí (ver el agente de documentación).

- **RN:** RN-23, RN-38, RN-45, RN-46.
- **D:** D-02, D-03, D-04, D-06, D-10 a D-18.
- **C:** C-03 a C-12.

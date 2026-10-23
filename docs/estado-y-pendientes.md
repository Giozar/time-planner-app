# Estado de implementación y decisiones abiertas

La especificación del producto está en [analisis-reglas-de-negocio.md](analisis-reglas-de-negocio.md). Este documento es su complemento de trabajo: compara esa definición con el código, reúne lo que falta decidir y señala lo que hay que corregir en la especificación. **No define reglas.**

## Cómo se usa

Cómo entra y sale cada elemento de este documento (propuestas `P-xx`, decisiones `D-xx`, correcciones `C-xx`, filas de la comparación) y qué estados se usan está en el agente de documentación: [../Agents/funcionalidad/Agents-documentacion.md](../Agents/funcionalidad/Agents-documentacion.md).

## Comparación con el código

| Tema | Definido | Estado del código |
|------|----------|-------------------|
| Constancia y tiempo real en pantalla | Mostrar la constancia en todos los niveles (con historial de pausas), registrar tiempo sin sesión y corregir o borrar bloques (RN-70, RN-71, RN-76, CU-27, CU-28). | ⏳ Pendiente. El servicio ya calcula y guarda sesiones y `WorkLog` (`logWork`, `updateWorkLog`, `deleteWorkLog`), pero ninguna pantalla los usa ni muestra la constancia. |
| Cierre diario | `DailyRecord` resume sesiones, constancia y minutos reales (RN-41 a RN-44, RN-72). | ⏳ Pendiente. El registro actual guarda conteos de ítems y minutos del día, sin porcentaje de constancia ni `closedAt`. |
| Historial | Lista de resúmenes diarios (CU-21). | ⏳ Pendiente. No existe la pantalla. |
| Backend | Aplica las mismas reglas y persiste el modelo de las secciones 7 y 8. | ⏳ Pendiente. Solo existe el proyecto base de NestJS. |

Lo que no aparece en la tabla está implementado y vive en las reglas y en [funcionalidad.md](../timer-planner-frontend/docs/funcionalidad.md). El trabajo del frontend se organiza en el [plan 03](../timer-planner-frontend/docs/planes/03-avance-constancia-tiempo-real.md).

## Trabajo pendiente

| Tema | Estado |
|------|--------|
| Plan 03: constancia, tiempo real y cierre diario en pantalla | ⏳ Pendiente |
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
| D-03 | Si un objetivo con deadline pasado necesita un estado visual de vencido (hoy solo existe para tareas). | RN-58, RN-65 |
| D-04 | Si se permitirá pausar objetivos y su efecto en agenda y calendario. El código contiene `ObjectiveStatus.PAUSED`, pero ninguna regla lo usa. | RN-29, RN-57, RN-59 |
| D-05 | En qué momento una idea acepta objetivos y tareas y pasa a meta activa. RN-55 la activa al tener horizonte y tareas; CU-02 crea `ACTIVE` una meta nueva con horizonte. Tampoco está definido qué pasa si se quita el horizonte a una meta activa. | RN-55, CU-02, CU-22 |
| D-06 | Si se permite editar el título, el deadline o el plan de un objetivo cerrado o de una tarea o paso al 100 %. Hoy solo está definido que un objetivo cerrado puede recibir hijos (RN-63). | RN-60, RN-63, CU-25 |
| D-07 | Si objetivos, tareas y pasos necesitan orden manual. | — |
| D-08 | Respaldos y recuperación de elementos borrados (fuera del MVP). | RN-52 |
| D-09 | Endpoint de consulta del calendario por rango de fechas. | RN-66, §7.2 punto 11, §8 |

## Correcciones pendientes en el documento de reglas

Ninguna. Las correcciones C-01 a C-12 se aplicaron el 2026-10-23. Afectaron a §3.1, §3.3, RN-24, la nota de RN-47, RN-64, RN-67, CU-05, CU-10, CU-18, CU-23, CU-25, CU-26 y §8.

## Identificadores retirados

No existen RN-23, RN-38, RN-45 ni RN-46: se retiraron con el modelo anterior. Tampoco existen D-02 (CU-19), D-11 (RN-51), D-12 y D-17 (RN-70), D-13 (RN-44), D-14 (RN-76), D-15 (RN-27) ni D-18 (RN-71): están resueltas. Sus números no se reutilizan.

El 2026-10-23 el usuario decidió que el avance sale de las sesiones marcadas, no de un porcentaje indicado a mano (RN-30). Con eso se retiraron:
- **RN-73** y el estado `NOT_NEEDED`: el 100 % solo llega al marcar todas las sesiones, así que no quedan sesiones futuras que descartar.
- **CU-20** («Indicar avance del resultado»). Antes de esa reasignación era la migración de datos, eliminada.
- **D-10** (sesión de hoy al llegar a 100 %) y **D-16** (avance al cambiar de tipo): el avance siempre se calcula.

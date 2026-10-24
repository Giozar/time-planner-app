# Estado de implementación y decisiones abiertas

La especificación del producto está en [analisis-reglas-de-negocio.md](analisis-reglas-de-negocio.md). Este documento es su complemento de trabajo: compara esa definición con el código, reúne lo que falta decidir y señala lo que hay que corregir en la especificación. **No define reglas.**

## Cómo se usa

Cómo entra y sale cada elemento de este documento (propuestas `P-xx`, decisiones `D-xx`, correcciones `C-xx`, filas de la comparación) y qué estados se usan está en el agente de documentación: [../Agents/funcionalidad/Agents-documentacion.md](../Agents/funcionalidad/Agents-documentacion.md).

## Comparación con el código

| Tema | Definido | Estado del código |
|------|----------|-------------------|
| Estados, cierre, reapertura y productividad | Mismo catálogo de estados en los cuatro niveles, calculado (RN-31); avance de los padres por suma de sesiones (RN-32 a RN-35); pausa heredada en los cuatro niveles (RN-57); cierre que no cambia los números, con cascada `CASCADE` (RN-77, RN-78); sesiones posteriores al cierre ocultas (RN-79); reabrir (RN-64, CU-20); productividad (RN-73). | ⏳ Pendiente. El código usa `PENDING`, `IN_PROGRESS` y `FINISHED`, fuerza 100 % al cerrar a mano, muestra las sesiones posteriores como «Cerrada antes», promedia el avance de los padres, solo pausa metas y tareas copiando el estado, no reabre ni calcula productividad. Ver el [plan 05](../timer-planner-frontend/docs/planes/05-estados-cierre-productividad.md). |
| Fecha de finalización (`completedAt`) | Tarea simple y paso fijan `completedAt` al llegar a 100 % y lo limpian si baja; en compuesta se calcula desde sus pasos (sección 3.3, sección 3.4, RN-67). | ⏳ Pendiente. `Activity` y `SubActivity` guardan `closure`, pero no tienen `completedAt`. |
| Backend | Aplica las mismas reglas y persiste el modelo de las secciones 7 y 8. | ⏳ Pendiente. Solo existe el proyecto base de NestJS. |

Lo que no aparece en la tabla está implementado y vive en las reglas y en [funcionalidad.md](../timer-planner-frontend/docs/funcionalidad.md).

## Trabajo pendiente

| Tema | Estado |
|------|--------|
| Recorrido manual en el navegador de los casos de uso implementados (idea y su promoción, patrón semanal sin desfase de día, bloqueo de deadline mayor al del padre, pausa de meta, borrado con confirmación escrita, cierre del día repetido, historial, calendario con hover y cambio de mes, agenda de días pasados con minutos y recálculo del cierre, y cierre de elementos: manual de paso, tarea y objetivo, automático al vencer, sesiones cubiertas en agenda y calendario, cascada hasta la meta finalizada, reapertura al agregar hijos, formularios bloqueados de lo cerrado y cierre automático de días al abrir la app, y mover una sesión: un lunes al domingo, fecha pasada o después del deadline rechazada, dos sesiones del mismo ítem en un día y editar el plan después de mover) | ⏳ Pendiente |
| Pruebas y compilación del cierre de elementos (RN-77 a RN-81) y de mover una sesión (RN-82): `pnpm ng test --watch=false` y `pnpm ng build` | ⏳ Pendiente; las ejecuta el usuario |
| Avisos de presupuesto al compilar: CSS de `objective-detail` (5,6 kB sobre 4 kB) y paquete inicial (513 kB sobre 500 kB) | ⏳ Pendiente |
| Backend | ⏳ Pendiente; requiere D-01 |
| Agente planificador del backend (`timer-planner-backend/Agents/funcionalidad/`) | ⏳ Pendiente; se crea al empezar el backend |

## Propuestas en discusión

Ninguna por ahora.

## Decisiones abiertas

Ninguna está decidida. Mientras no se decida, el código no la implementa por su cuenta.

### Generales

| ID | Pregunta | Reglas relacionadas |
|----|----------|---------------------|
| D-01 | Autenticación y número de usuarios; motor de base de datos y ORM. | sección 7.2 punto 1, sección 7.4 |
| D-05 | En qué momento una idea acepta objetivos y tareas y pasa a meta activa. RN-55 la activa al tener horizonte y tareas; CU-02 crea `ACTIVE` una meta nueva con horizonte. Tampoco está definido qué pasa si se quita el horizonte a una meta activa. | RN-55, CU-02, CU-22 |
| D-07 | Si objetivos, tareas y pasos necesitan orden manual. | — |
| D-08 | Respaldos y recuperación de elementos borrados (fuera del MVP). | RN-52 |
| D-09 | Endpoint de consulta del calendario por rango de fechas y cómo expone la API la constancia y la productividad calculadas de un ítem o padre (CU-28). | RN-66, RN-70, RN-73, CU-28, sección 7.2 punto 11, sección 8 |

## Correcciones pendientes en el documento de reglas

| ID | Ubicación | Problema y corrección propuesta |
|----|-----------|---------------------------------|
| C-13 | Sección 7.1 (Diagrama ER y tablas) | Las secciones 3.1 a 3.4 y RN-70 definen `pauses: [{ from, to? }]` en `Goal`, `Objective`, `Activity` y `SubActivity`, pero en las tablas de la sección 7.1 no aparece columna ni tabla para persistir los periodos de pausa. Agregar su representación en el modelo de BD (por ejemplo `jsonb` o tabla de pausas). |

## Números libres

Se pueden reutilizar para un elemento nuevo; al usar uno, se quita de aquí (ver el agente de documentación).

- **RN:** RN-23, RN-38, RN-45, RN-46.
- **P:** P-01, P-02.
- **D:** D-02, D-03, D-04, D-06, D-10 a D-18.
- **C:** C-01 a C-12.

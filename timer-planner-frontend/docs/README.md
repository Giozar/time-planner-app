# Documentación del frontend

Esta carpeta reúne la documentación del frontend: funcionalidad, arquitectura y buenas prácticas. Es documentación de referencia; no contiene código.

## Índice

| Documento | Para qué sirve |
|-----------|----------------|
| [funcionalidad.md](funcionalidad.md) | Mapa de features: qué casos de uso y reglas de negocio aplican a cada carpeta. |
| [arquitectura.md](arquitectura.md) | Cómo está organizado el código, qué responsabilidad tiene cada capa y cómo puede evolucionar. |
| [buenas-practicas.md](buenas-practicas.md) | SOLID y Clean Code aplicados de forma ligera, convención de nombres y pruebas. |
| `planes/` | Planes de trabajo **por hacer** (hoy ninguno; la carpeta se crea al necesitarla). Un plan terminado se borra: su historia está en git. |

## Cómo se relaciona con el resto del repositorio

- **Reglas de negocio (fuente de verdad):** `../../docs/analisis-reglas-de-negocio.md`, en la raíz del monorepo. El [estado de implementación](../../docs/estado-y-pendientes.md) compara las reglas con el código.
- **Agentes:** `../Agents/`. Empieza por el orquestador `../Agents/Agents.md`; el agente planificador está en `../Agents/funcionalidad/Agents-planner.md`.
- **Reglas de trabajo de los agentes:** `../Agents/reglas/Agents-alcance.md` y `../Agents/tecnologia/Agents-angular.md`.

## Pendientes y mantenimiento

- **Lo pendiente** (recorrido manual, avisos de compilación, decisiones y correcciones a las reglas) está en [estado-y-pendientes.md](../../docs/estado-y-pendientes.md).
- **Qué documento actualizar según el cambio:** «Qué documento tocar según el cambio» en [Agents-documentacion.md](../../Agents/funcionalidad/Agents-documentacion.md). El mismo cambio que modifica el código actualiza sus documentos.

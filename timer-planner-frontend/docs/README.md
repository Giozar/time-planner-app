# Documentación del frontend

Esta carpeta reúne la documentación del frontend: funcionalidad, arquitectura y buenas prácticas. Es documentación de referencia; no contiene código.

## Índice

| Documento | Para qué sirve |
|-----------|----------------|
| [funcionalidad.md](funcionalidad.md) | Mapa de features: qué casos de uso y reglas de negocio aplican a cada carpeta. |
| [arquitectura.md](arquitectura.md) | Cómo está organizado el código, qué responsabilidad tiene cada capa y cómo puede evolucionar. |
| [buenas-practicas.md](buenas-practicas.md) | SOLID y Clean Code aplicados de forma ligera, convención de nombres y pruebas. |
| [planes/](planes/) | Planes de trabajo **por hacer** (hoy el 03 y el 04). Un plan terminado se borra: su historia está en git. |

## Cómo se relaciona con el resto del repositorio

- **Reglas de negocio (fuente de verdad):** `../../docs/analisis-reglas-de-negocio.md`, en la raíz del monorepo. El [estado de implementación](../../docs/estado-y-pendientes.md) compara las reglas con el código.
- **Planes de trabajo:** [planes/](planes/). Solo lo que falta por hacer.
- **Agentes:** `../Agents/`. Empieza por el orquestador `../Agents/Agents.md`; el agente planificador está en `../Agents/funcionalidad/Agents-planner.md`.
- **Reglas de trabajo de los agentes:** `../Agents/reglas/Agents-alcance.md` y `../Agents/tecnologia/Agents-angular.md`.

## Pendiente

- **Código:** funciona con el modelo anterior; faltan los planes 04 (agenda de días pasados, se hace primero) y 03 (avance, constancia y tiempo real).

- **Recorrido manual** en el navegador (`pnpm ng serve`) de los casos de uso implementados. Las pruebas automáticas cubren la lógica, no la interfaz.
- **Aviso de presupuesto de CSS** en `objective-detail` (5,6 kB sobre 4 kB).
- **Decisiones por definir (`D-xx`) y correcciones a las reglas (`C-xx`):** están en [estado-y-pendientes.md](../../docs/estado-y-pendientes.md).

## Mantenimiento de la documentación

**Regla:** el mismo cambio que implementa una fase actualiza sus documentos.

**Estados y convenciones:** ver [../../Agents/funcionalidad/Agents-documentacion.md](../../Agents/funcionalidad/Agents-documentacion.md).

| Si cambia... | Se actualiza |
|--------------|--------------|
| El avance de una fase | La tabla de fases del plan y la sección «Pendiente» de este README. Al terminar, no se marca como hecho: se pasa a las reglas y se borra de los pendientes (ver `Agents-documentacion.md`) |
| El estado de una feature | La columna Estado de `funcionalidad.md` |
| La estructura de carpetas o capas | `arquitectura.md` (estructura actual) |
| Una regla de negocio | `../../docs/analisis-reglas-de-negocio.md` (fuente de verdad: solo reglas acordadas) y, si cambia el mapa, `funcionalidad.md` |
| Lo implementado frente a las reglas | «Comparación con el código» de `../../docs/estado-y-pendientes.md` |
| Una propuesta nueva, una duda, una decisión tomada o una inconsistencia en las reglas | «Propuestas en discusión», «Decisiones abiertas» o «Correcciones pendientes» de `../../docs/estado-y-pendientes.md` (ver `../../Agents/funcionalidad/Agents-documentacion.md`) |
| Una convención o práctica | `buenas-practicas.md` |
| Un agente nuevo, movido o modificado | Lo indicado en «Documento o agente nuevo» de `../../Agents/funcionalidad/Agents-documentacion.md` |

# Documentación del frontend

Esta carpeta reúne la documentación del frontend: funcionalidad, arquitectura y buenas prácticas. Es documentación de referencia; no contiene código.

## Índice

| Documento | Para qué sirve |
|-----------|----------------|
| [funcionalidad.md](funcionalidad.md) | Mapa de features: qué casos de uso y reglas de negocio aplican a cada carpeta. |
| [arquitectura.md](arquitectura.md) | Cómo está organizado el código, qué responsabilidad tiene cada capa y cómo evolucionará. |
| [buenas-practicas.md](buenas-practicas.md) | SOLID y Clean Code aplicados de forma ligera, convención de nombres y pruebas. |
| [planes/](planes/) | Planes de trabajo numerados. Hoy: `01-alinear-frontend-con-reglas-de-negocio.md`. |

## Cómo se relaciona con el resto del repositorio

- **Reglas de negocio (fuente de verdad):** `../../docs/analisis-reglas-de-negocio.md`, en la raíz del monorepo. Los documentos de esta carpeta la **referencian**; no la copian, para que no haya dos versiones que se desincronicen.
- **Planes de trabajo:** [planes/](planes/). Cada plan describe un bloque de trabajo concreto, como alinear el frontend con las reglas de negocio.
- **Agente planificador:** `../Agents/`. Todavía no existe; está previsto en el plan `planes/01-alinear-frontend-con-reglas-de-negocio.md`.
- **Instrucciones de trabajo:** `../AGENTS-angular.md`.

## Alcance actual

El objetivo del momento es alinear la funcionalidad del frontend con las reglas de negocio. La arquitectura y las prácticas descritas aquí se irán aplicando después, de forma gradual. Cada documento indica qué es **estado actual** y qué es **objetivo**.

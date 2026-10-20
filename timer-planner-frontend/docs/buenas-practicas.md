# Buenas prácticas

Guía ligera de Clean Code y SOLID para este proyecto. Es una referencia para decidir, no una lista de requisitos. Las prácticas de Angular siguen la documentación oficial: https://angular.dev/.

## SOLID aplicado al proyecto

| Principio | Cómo se aplica aquí |
|-----------|---------------------|
| **S**: responsabilidad única | Hoy `PlannerService` guarda estado, persiste, calcula reglas y migra datos. El objetivo es que solo coordine, y que las reglas vivan en `core/rules`. |
| **O**: abierto/cerrado | Agregar una persistencia nueva (HTTP) no obliga a tocar el servicio ni los componentes: se crea otra clase que implementa `DataProvider`. |
| **L**: sustitución de Liskov | `LocalStorageService` y un futuro proveedor HTTP deben poder intercambiarse sin que el código que usa `DataProvider` note la diferencia. |
| **I**: segregación de interfaces | `DataProvider` es un solo contrato con todos los métodos. Es aceptable por ahora. Si crece, se divide por entidad. |
| **D**: inversión de dependencias | Los servicios dependen de `DataProvider` (abstracto) mediante `inject()`. El enlace concreto se define una sola vez en `app.config.ts`. |

## Clean Code

- **Sin cadenas mágicas.** Los valores de negocio son enums; no se escriben textos sueltos como `'en_progreso'` en el código.
- **Funciones pequeñas y con un solo propósito.** Una regla de negocio es una función con nombre que dice lo que hace.
- **Reglas puras.** Las reglas reciben datos y devuelven un resultado, sin efectos secundarios, para poder probarlas aisladas.
- **Sin duplicar.** Si dos formularios repiten la misma validación o cálculo, se extrae a `core/rules`.
- **Comentarios solo para el porqué.** El nombre debe explicar el qué.
- **Sin `any`.** Los tipos del dominio son suficientes para evitarlo.

## Convención de nombres

Definida en la sección 4.1 de `../../docs/analisis-reglas-de-negocio.md`. Resumen:

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Clases, tipos y enums | PascalCase, en inglés | `ActivityStatus` |
| Campos, variables y funciones | camelCase, en inglés | `completedDates` |
| Valores de enum | UPPER_SNAKE_CASE, en inglés | `IN_PROGRESS` |
| Textos de interfaz | Español, en `core/i18n`, nunca en la lógica | `"En progreso"` |

El código y los datos manejan el valor en inglés. El español aparece solo al mostrar algo al usuario.

## Angular

- Componentes **standalone** e inyección con `inject()`.
- Estado con **signals** y `computed()` para valores derivados.
- Plantillas con el control de flujo nativo (`@if`, `@for`).
- Los componentes **no** guardan lógica de negocio: la delegan en servicios y reglas.
- Los comandos de generación se muestran completos con su atajo, por ejemplo `ng generate component ...` y `ng g c ...`.

## Pruebas

- Herramienta: **Vitest**, ejecutada con `pnpm ng test`.
- Las reglas de `core/rules` se prueban como funciones, sin `TestBed`.
- Las fechas se prueban también con otra zona horaria, por ejemplo `TZ=America/Mexico_City pnpm ng test`.
- Cada regla de negocio relevante debería tener al menos una prueba que cite su identificador (`RN-xx`).

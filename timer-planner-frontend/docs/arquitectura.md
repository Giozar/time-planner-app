# Arquitectura del frontend

## Enfoque

La arquitectura actual se mantiene: **simple, compacta y todo en uno**. Se toman como referencia los principios de Clean Architecture y SOLID, pero **sin implementarlos de forma estricta**. Solo se separa lo que hoy ayuda a trabajar; no se agregan capas por seguir un manual.

## Estructura actual

Estado verificado en `src/app`:

```
src/app/
├── core/
│   ├── models/        activity, goal, objective, daily-record
│   ├── providers/     data.provider.ts (contrato) y local-storage.service.ts
│   ├── services/      planner.service.ts, native-dialog.service.ts
│   └── utils/         date.utils.ts
├── features/
│   ├── activities/    activity-form, structure-form
│   ├── daily/         daily-dashboard, daily-summary
│   ├── goals/         goals-list, goals-form, goal-detail
│   └── objectives/    objective-form, objective-detail
├── shared/
│   ├── components/    global-dialog
│   └── layout/        main-layout
├── app.config.ts      enlaza DataProvider con LocalStorageService
└── app.routes.ts
```

## Estructura objetivo

Alineada con el plan [planes/01-alinear-frontend-con-reglas-de-negocio.md](planes/01-alinear-frontend-con-reglas-de-negocio.md). Solo se **agrega**; lo existente no cambia de lugar. Estas carpetas **todavía no existen**:

```
core/
├── rules/     funciones puras con las reglas de negocio (recurrencia, progreso, deadlines)
└── i18n/      etiquetas en español indexadas por el valor del enum
shared/
└── pipes/     pipe `label` para mostrar las etiquetas en las plantillas
```

### Estado de implementación (2026-10-21)

| Elemento | Existe | Lo crea |
|----------|--------|---------|
| `core/i18n` | No | Fase 1 |
| `shared/pipes` | No | Fase 1 |
| `core/rules` | No | Fase 2 |
| `Agents/` (en la raíz del frontend) | No | Fase 0 |

Cuando una fase crea o mueve carpetas, esta tabla y la sección "Estructura actual" se actualizan en el mismo cambio.

## Capas y responsabilidades

| Capa | Carpeta | Responsabilidad | Puede depender de |
|------|---------|-----------------|-------------------|
| Dominio | `core/models`, `core/rules` | Entidades, enums y reglas de negocio puras. Sin Angular. | Nada |
| Aplicación | `core/services` | Estado con signals, casos de uso, coordinación. | Dominio, `DataProvider` |
| Infraestructura | `core/providers` | Persistencia detrás del contrato `DataProvider`. | Dominio |
| Presentación | `features` | Componentes y pantallas de cada feature. | Aplicación, dominio, `shared` |
| UI compartida | `shared` | Componentes y layouts reutilizables, sin lógica de negocio. | Nada del negocio |

## Regla de dependencias

Las dependencias apuntan hacia el dominio:

```
features ──► core/services ──► core/rules, core/models
                  │
                  └──► DataProvider (abstracto) ◄── LocalStorageService
```

- Los componentes **no** usan los providers directamente: pasan por un servicio.
- `core` **no** importa nada de `features` ni de `shared`.
- `core/rules` no importa Angular, para poder probarse sin `TestBed`.

## Flujo de datos

1. El componente llama a un método de `PlannerService`.
2. El servicio aplica las reglas de `core/rules` y actualiza sus signals.
3. El servicio guarda a través de `DataProvider`.
4. Los componentes leen las signals y se actualizan solos.

Cambiar `LocalStorageService` por un proveedor HTTP, cuando exista el backend, es solo cambiar el enlace en `app.config.ts`.

## Dónde va cada cosa

| Necesito... | Va en |
|-------------|-------|
| Un tipo, enum o interfaz del negocio | `core/models` |
| Una regla que se pueda expresar como función pura | `core/rules` |
| Estado compartido o un caso de uso | `core/services` |
| Guardar o leer datos | `core/providers` |
| Una pantalla o formulario | `features/<feature>` |
| Un componente reutilizable sin lógica de negocio | `shared/components` |
| Un texto en español para un enum | `core/i18n` |

## Evolución futura: core por feature

La idea a futuro es que cada feature tenga su propio núcleo, para trabajar en una sin recorrer todo `core`:

```
features/goals/
├── models/
├── services/
├── components/
└── goals.routes.ts
```

**No se hace ahora.** Se considera cuando se cumpla alguna de estas señales:
- Un feature cambia seguido y obliga a tocar muchos archivos de `core`.
- Un modelo o servicio lo usa un solo feature.
- Varias personas trabajan en paralelo en features distintos.

Lo que realmente se comparte entre features (por ejemplo `DataProvider` y los enums comunes) se queda en `core`.

## Lo que no se hace

Para mantener la arquitectura sencilla:
- Una clase de caso de uso por cada acción.
- Un repositorio por entidad.
- Mappers entre capas mientras no haya un backend con otro formato.
- Tokens de inyección adicionales si `DataProvider` ya resuelve el enlace.

Cualquiera de estas se puede incorporar el día que realmente haga falta.

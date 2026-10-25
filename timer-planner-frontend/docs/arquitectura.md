# Arquitectura del frontend

## Enfoque

La arquitectura actual se mantiene: **simple, compacta y todo en uno**. Se toman como referencia los principios de Clean Architecture y SOLID, pero **sin implementarlos de forma estricta**. Solo se separa lo que hoy ayuda a trabajar; no se agregan capas por seguir un manual.

## Estructura actual

Contenido de `timer-planner-frontend/src/app`:

```
src/app/
├── core/
│   ├── i18n/          labels.ts (etiquetas en español por enum)
│   ├── models/        activity (incluye ItemClosure), goal, objective, hierarchy (tipos HierarchyLevel y ReopenResult), pause, session (ExecutionSession y WorkLog), daily-record, agenda-item, deletion-impact, calendar-entry (enums en inglés)
│   ├── providers/     data.provider.ts (contrato) y local-storage.service.ts (claves time_planner_*)
│   ├── rules/         calendar, calendar-view, closure, consistency, progress, recurrence, deadline, session (funciones puras)
│   ├── services/      planner.service.ts, lifecycle-actions.service.ts, native-dialog.service.ts
│   └── utils/         date.utils.ts (getTodayISO)
├── features/
│   ├── activities/    activity-form, structure-form
│   ├── calendar/      calendar-view
│   ├── daily/         daily-dashboard, daily-summary
│   ├── goals/         goals-list, goals-form, goal-detail
│   ├── history/       history-list
│   └── objectives/    objective-form, objective-detail
├── shared/
│   ├── components/    global-dialog, progress-bar, task-tags
│   ├── layout/        main-layout
│   └── pipes/         label.pipe.ts, consistency.pipe.ts, productivity.pipe.ts
├── testing/           builders.ts e in-memory-data.provider.ts (solo para pruebas)
├── app.config.ts      enlaza DataProvider con LocalStorageService
└── app.routes.ts
```

Las pruebas (`*.spec.ts`) viven junto al archivo que prueban.

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

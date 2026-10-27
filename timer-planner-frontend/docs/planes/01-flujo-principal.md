# Plan 01 — Flujo principal simplificado

## Contexto

Llevar el frontend al flujo acordado y ya escrito en `docs/analisis-reglas-de-negocio.md`: falta la pantalla de métricas.

## RN y CU cubiertas

RN-61, RN-84 a RN-86; CU-32.

## Conflictos con reglas existentes

Ninguno: las reglas ya describen el flujo acordado.

## Archivos a tocar

- **Reglas:** `core/rules`, una regla de métricas.
- **Servicio:** `core/services/planner.service.ts` y sus pruebas.
- **Pantallas:** se crea `features/metrics`.
- **Compartido:** `core/i18n/labels.ts`, `shared/layout/main-layout` (menú), `app.routes.ts`.

## Pasos ordenados

### Fase 5 — Métricas
1. Regla de métricas por nivel: completos, incompletos, cerrados, vencidos y promedios de constancia y productividad (RN-86).
2. Pantalla `features/metrics` en `/metrics` y entrada en el menú.

## Verificación

`pnpm ng test --watch=false`, `pnpm ng build` y el recorrido manual de la pantalla.

## Documentos a actualizar

Se quitan su fila de «Comparación con el código» de `docs/estado-y-pendientes.md` y la de la columna «Falta» de `timer-planner-frontend/docs/funcionalidad.md`, se agregan sus «Notas» y la feature al mapa de features y a «Estructura actual» de `timer-planner-frontend/docs/arquitectura.md`. Al terminar se borra este plan.

## Decisiones que lo bloquean

Ninguna.

## Pendiente

Nada por definir.

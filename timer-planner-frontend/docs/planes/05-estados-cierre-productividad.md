# Plan 05: estados, cierre honesto, reapertura y productividad

## Contexto

Cerrar a mano hoy fuerza el 100 % y la etiqueta «Completado», y cada nivel usa estados distintos. Las reglas nuevas separan el estado de los números, unifican los estados, permiten pausar y reabrir en los cuatro niveles y añaden la productividad. La diferencia con el código está en la [comparación con el código](../../../docs/estado-y-pendientes.md#comparación-con-el-código).

## RN y CU cubiertas

RN-29 a RN-35, RN-57 a RN-60, RN-63, RN-64, RN-68 a RN-70, RN-73, RN-77 a RN-80, RN-82. CU-20, CU-23, CU-25, CU-28 y CU-29. Secciones 3.1 a 3.4 y 4.2.

## Conflictos con reglas existentes

Ninguno.

## Archivos a tocar

- **Modelos y etiquetas:** `core/models` (`goal`, `objective`, `activity`, `agenda-item`) y `core/i18n/labels.ts`. Estados `ACTIVE`, `PAUSED`, `CLOSED`, `COMPLETED`, `OVERDUE` (más `IDEA` en la meta); `ClosureType.CASCADE`; `closure` y `pauses` en los cuatro niveles. Se quita `isCovered`.
- **Persistencia:** `core/providers/local-storage.service.ts` sube la marca de esquema para reiniciar los datos locales; no hay migración.
- **Reglas puras:** `core/rules/closure.rules.ts` (estado de RN-31, sin `closedProgress` ni `isCoveredByClosure`), `progress.rules.ts` (avance por suma de sesiones), `consistency.rules.ts` (pausas de los cuatro niveles y sesiones posteriores al cierre), y una función nueva de productividad.
- **Servicio:** `core/services/planner.service.ts`. Recálculo con el estado nuevo, pausa efectiva, acciones de pausar, cerrar y reabrir en los cuatro niveles con cascada, cierre automático, visibilidad de agenda y calendario, y productividad por id.
- **Pantallas:** `features/goals` (lista y detalle), `features/objectives/objective-detail`, `features/daily/daily-dashboard`, formularios de `features/activities` y `objective-form` (bloqueos de RN-80 y deadline nuevo al reabrir); `shared/pipes` para mostrar la productividad.
- **Pruebas:** las `*.spec.ts` de reglas y del servicio, y `testing/builders.ts`.

## Pasos ordenados

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Modelos, etiquetas, reinicio de datos y reglas puras: estado (RN-31), avance por suma (RN-32 a RN-35), constancia con pausas de los cuatro niveles y sesiones posteriores al cierre (RN-70, RN-79), productividad (RN-73). Con sus pruebas. | ⏳ Pendiente |
| 2 | Servicio: pausa heredada (RN-57), cerrar con cascada y cierre automático (RN-77, RN-78), reabrir (RN-64), agregar hijos (RN-53), visibilidad de agenda y calendario (RN-29, RN-79), productividad por id. Con sus pruebas. | ⏳ Pendiente |
| 3 | Pantallas: botones de pausar, reanudar, cerrar y reabrir en meta, objetivo, tarea y paso (con deadline nuevo si venció); las tres medidas en listas y detalles; quitar «Cerrada antes» de la agenda; formularios de lo cerrado (RN-80). | ⏳ Pendiente |

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Las pruebas citan las RN que cubren.
- Recorrido manual:
  - Cerrar «Correr» a la mitad muestra «Cerrada» con su avance real.
  - Al reabrirla reaparecen sus sesiones futuras.
  - Pausar una tarea y luego pausar y reanudar su meta deja la tarea pausada.
  - Cerrar y reabrir un objetivo solo reabre lo que cerró su cascada.
  - Reabrir algo vencido pide un deadline nuevo.

## Documentos a actualizar en cada fase

- La tabla de fases de este plan; al terminar la última, borrar el plan.
- La fila «Estados, cierre, reapertura y productividad» de «Comparación con el código» en `../../../docs/estado-y-pendientes.md`.
- La columna Falta de `../funcionalidad.md`. En la fase 3, su nota «Cierre» y una nota de productividad.
- `../arquitectura.md` si se agrega un archivo de reglas.

## Decisiones que lo bloquean

Ninguna.

## Pendiente

- El recorrido manual de cierre de elementos que ya figura en «Trabajo pendiente» cambia con este plan: al terminar, se reemplaza por el recorrido de arriba.

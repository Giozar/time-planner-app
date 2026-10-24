# Plan 05: estados, cierre honesto, reapertura y productividad

## Contexto

Cerrar a mano hoy fuerza el 100 % y la etiqueta «Completado», y cada nivel usa estados distintos. Las reglas nuevas dejan solo tres estados (abierto, pausado y cerrado, más idea en la meta): el resultado lo dicen el avance, la constancia y la productividad. También permiten pausar y reabrir en los cuatro niveles. La diferencia con el código está en la [comparación con el código](../../../docs/estado-y-pendientes.md#comparación-con-el-código).

## RN y CU cubiertas

RN-29 a RN-35, RN-52 a RN-64, RN-68 a RN-70, RN-73, RN-77 a RN-80, RN-82. CU-20, CU-23, CU-25, CU-28 y CU-29. Secciones 3.1 a 3.4 y 4.2.

## Conflictos con reglas existentes

Ninguno.

## Archivos a tocar

- **Modelos y etiquetas:**
  - `core/models` (`goal`, `objective`, `activity`, `agenda-item`) y `core/i18n/labels.ts`.
  - Estados `OPEN`, `PAUSED` y `CLOSED` (más `IDEA` en la meta).
  - `ClosureType`: `MANUAL`, `DEADLINE`, `SESSIONS_DONE` y `CHILDREN_CLOSED`.
  - `closure` y `pauses` en los cuatro niveles.
  - Se quita `isCovered`.
- **Persistencia:** `core/providers/local-storage.service.ts` sube la marca de esquema para reiniciar los datos locales; no hay migración.
- **Reglas puras:**
  - `core/rules/closure.rules.ts`: estado de RN-31, pausa efectiva, descendientes que reabrir, sesiones ocultas tras el cierre; sin `closedProgress` ni `isCoveredByClosure`.
  - `progress.rules.ts`: avance por suma de sesiones.
  - `consistency.rules.ts`: pausas de los cuatro niveles y sesiones desde el cierre.
  - Una función nueva de productividad.
- **Servicio:** `core/services/planner.service.ts`.
  - Recálculo con el estado nuevo.
  - Acciones de pausar, reanudar, cerrar y reabrir en los cuatro niveles.
  - Cierres automáticos por fecha límite, por sesiones completas y por hijos cerrados.
  - Visibilidad de agenda y calendario.
  - Productividad por id.
- **Pantallas:**
  - `features/goals` (lista y detalle), `features/objectives/objective-detail` y `features/daily/daily-dashboard`.
  - Formularios de `features/activities` y `objective-form`: bloqueos de RN-80 y deadline nuevo al reabrir.
  - `shared/pipes` para mostrar la productividad y el motivo de cierre.
- **Pruebas:** las `*.spec.ts` de reglas y del servicio, y `testing/builders.ts`.

## Pasos ordenados

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Modelos, etiquetas, reinicio de datos y reglas puras: estado (RN-31), pausa efectiva (RN-57), avance por suma (RN-32 a RN-35), constancia con pausas de los cuatro niveles y sesiones desde el cierre (RN-70, RN-79), productividad (RN-73), qué reabrir (RN-64). Con sus pruebas. El servicio y las pantallas solo se ajustan lo mínimo para compilar. | ⏳ Pendiente |
| 2 | Servicio: pausar y reanudar (RN-57), cerrar con cascada hacia abajo y hacia arriba (RN-77, RN-78), cierres automáticos (RN-58, RN-77): los de sesiones completas e hijos cerrados se disparan solo en el evento que los causa, no en el recálculo, y el de sesiones completas se deshace al bajar de 100 %; reabrir con deadline nuevo (RN-64), agregar hijos (RN-53), visibilidad de agenda y calendario (RN-29, RN-79), productividad por id. Con sus pruebas. | ⏳ Pendiente |
| 3 | Pantallas: botones de pausar, reanudar, cerrar y reabrir en meta, objetivo, tarea y paso (con deadline nuevo si venció); estado con motivo de cierre; las tres medidas en listas y detalles; sugerencia de cerrar con productividad al 100 % y sesiones pendientes; quitar «Cerrada antes» de la agenda; formularios de lo cerrado (RN-80). | ⏳ Pendiente |

## Verificación

- `pnpm ng test --watch=false`, también con `TZ=America/Mexico_City` y `TZ=Pacific/Auckland`.
- `pnpm ng build` sin errores de tipos.
- Las pruebas citan las RN que cubren.
- Recorrido manual:
  - Cerrar «Correr» a la mitad muestra «Cerrada · a mano» con su avance real.
  - Al reabrirla reaparecen sus sesiones futuras.
  - Marcar la última sesión cierra la tarea «por sesiones completas»; desmarcar una la reabre, junto con sus padres cerrados por ella.
  - Reabrir a mano una tarea al 100 % no la vuelve a cerrar sola.
  - Cerrar la última tarea abierta de un objetivo lo cierra «por cierre de sus hijos».
  - Pausar una tarea y luego pausar y reanudar su meta deja la tarea pausada.
  - Reabrir un objetivo reabre sus tareas que siguen dentro de su deadline y tienen sesiones pendientes.
  - Reabrir algo vencido pide un deadline nuevo, y sus hijos sin deadline propio lo heredan.
  - Cerrar una tarea hoy oculta también su sesión pendiente de hoy.
  - Con productividad al 100 % y sesiones pendientes aparece la sugerencia de cerrar.

## Documentos a actualizar en cada fase

- La tabla de fases de este plan; al terminar la última, borrar el plan.
- La fila «Estados, cierre, reapertura y productividad» de «Comparación con el código» en `../../../docs/estado-y-pendientes.md`.
- La columna Falta de `../funcionalidad.md`. En la fase 3, su nota «Cierre» y una nota de productividad y motivo de cierre.
- `../arquitectura.md` si se agrega un archivo de reglas.

## Decisiones que lo bloquean

Ninguna.

## Pendiente

- El recorrido manual de cierre de elementos que ya figura en «Trabajo pendiente» cambia con este plan: al terminar, se reemplaza por el recorrido de arriba.

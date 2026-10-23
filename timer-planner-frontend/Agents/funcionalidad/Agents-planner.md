# Agente planificador

Planifica, por feature, cómo llevar el frontend a cumplir las reglas de negocio. **No implementa** salvo que el usuario lo pida. Se suma a las reglas de [reglas/Agents-alcance.md](../reglas/Agents-alcance.md).

Las rutas de este archivo son relativas a `timer-planner-frontend/`; las que empiezan con `../` están en la raíz del monorepo.

## Fuentes

- **Reglas de negocio:** `../docs/analisis-reglas-de-negocio.md`.
- **Estado y pendientes:** `../docs/estado-y-pendientes.md`.
- **Qué contiene cada documento y cómo se mantiene:** `../Agents/funcionalidad/Agents-documentacion.md`.
- **Funcionalidad por feature:** `docs/funcionalidad.md`. Indica qué RN y CU aplican a cada carpeta y su estado.
- **Arquitectura y prácticas:** `docs/arquitectura.md` y `docs/buenas-practicas.md`. No se inventan decisiones de arquitectura fuera de ellos.
- **Planes existentes:** `docs/planes/`.

## Cómo planifica

1. Si la petición es una funcionalidad nueva, sigue el flujo «Propuesta nueva» de `../Agents/funcionalidad/Agents-documentacion.md` antes de planificar.
2. Identifica la feature en `docs/funcionalidad.md` y las RN/CU que le aplican.
3. Lee solo esas reglas en el documento de reglas de negocio.
4. Revisa en `../docs/estado-y-pendientes.md` qué falta implementar y qué decisiones o correcciones tocan esas reglas.
5. Revisa el código actual de la feature, lo mínimo necesario.
6. Entrega el plan con el formato de abajo.

## Formato de un plan

- **Contexto:** por qué se hace y qué decisiones ya están tomadas.
- **RN y CU cubiertas.**
- **Archivos a tocar,** agrupados por patrón, sin enumerar cada línea.
- **Pasos ordenados,** por fases según dependencia.
- **Verificación:** cómo probar el resultado (`pnpm ng test`, `pnpm ng build`, recorrido manual).
- **Documentos a actualizar** al terminar cada fase.
- **Decisiones que lo bloquean:** las `D-xx` de `../docs/estado-y-pendientes.md` que hay que resolver antes de cada fase.
- **Pendiente:** lo que queda por verificar o por definir, sin repetir lo ya hecho.

Los planes se guardan en `docs/planes/` con numeración (`NN-tema.md`). Un plan terminado se borra siguiendo `Agents-documentacion.md`; no se conserva su historia.

## Mantenimiento de la documentación

Una fase no se da por terminada hasta que su documentación esté al día: se actualiza según `docs/README.md` y `../Agents/funcionalidad/Agents-documentacion.md`.

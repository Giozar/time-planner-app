# Agente planificador

Planifica, por feature, cómo llevar el frontend a cumplir las reglas de negocio. **No implementa** salvo que el usuario lo pida. Se suma a las reglas de [reglas/Agents-alcance.md](../reglas/Agents-alcance.md).

Las rutas de este archivo son relativas a `timer-planner-frontend/`; las que empiezan con `../` están en la raíz del monorepo.

## Fuentes

- **Reglas de negocio:** `../docs/analisis-reglas-de-negocio.md`.
- **Estado y pendientes:** `../docs/estado-y-pendientes.md`.
- **Qué contiene cada documento y cómo se mantiene:** `../Agents/funcionalidad/Agents-documentacion.md`.
- **Funcionalidad por feature:** `docs/funcionalidad.md`. Indica qué RN y CU aplican a cada carpeta y su estado.
- **Arquitectura y prácticas:** `docs/arquitectura.md` y `docs/buenas-practicas.md`. No se inventan decisiones de arquitectura fuera de ellos.
- **Planes existentes:** `docs/planes/` (si la carpeta no existe, no hay planes).

## Cómo planifica

1. Si la petición es una funcionalidad nueva, sigue el flujo «Propuesta nueva» de `../Agents/funcionalidad/Agents-documentacion.md` antes de planificar.
2. Identifica la feature en `docs/funcionalidad.md` y las RN/CU que le aplican.
3. Lee solo esas reglas en el documento de reglas de negocio.
4. **Comprueba que no haya conflictos.** Compara lo pedido con esas reglas y busca en el documento de reglas cada entidad, campo o estado que cambia, para encontrar reglas de otras features que también lo usen. Si algo choca, detente: explícalo al usuario y regístralo como `P-xx` o `D-xx`. Esa parte no se planifica ni se implementa hasta que se resuelva.
5. Revisa en `../docs/estado-y-pendientes.md` qué falta implementar y qué decisiones o correcciones tocan esas reglas.
6. Revisa el código actual de la feature, lo mínimo necesario.
7. Entrega el plan con el formato de abajo: muéstralo al usuario y **espera su aprobación**. Guardar el plan no autoriza a implementarlo.

Un cambio pequeño (un arreglo o un ajuste de pantalla) no necesita plan guardado: se comprueban los conflictos (paso 4), se dice qué se va a hacer y se trata como una sola fase.

## Cómo implementa por fases

Solo cuando el usuario aprueba el plan y pide implementarlo. Sigue «Implementación» de `../Agents/reglas/Agents-alcance.md`: sin conflictos con las reglas, una fase a la vez, aviso de «Terminó la fase N de M» y espera hasta que el usuario diga que continúes o que está listo; el commit lo hace él o lo pide al agente de git.

Los comandos también siguen ese archivo dentro de una fase aprobada: leer y buscar es libre; pruebas, compilación y lo que modifique archivos piden autorización.

## Formato de un plan

- **Contexto:** por qué se hace, en una o dos líneas, y los IDs de las RN y CU acordadas. No repite el texto de las reglas.
- **RN y CU cubiertas.**
- **Conflictos con reglas existentes:** los encontrados, o «Ninguno». Un plan con un conflicto sin resolver no se implementa.
- **Archivos a tocar,** agrupados por patrón, sin enumerar cada línea.
- **Pasos ordenados,** por fases según dependencia.
- **Verificación:** cómo probar el resultado (`pnpm ng test`, `pnpm ng build`, recorrido manual).
- **Documentos a actualizar** al terminar cada fase.
- **Decisiones que lo bloquean:** las `D-xx` de `../docs/estado-y-pendientes.md` que hay que resolver antes de cada fase.
- **Pendiente:** lo que queda por verificar o por definir, sin repetir lo ya hecho.

Los planes se guardan en `docs/planes/` con numeración (`NN-tema.md`). Al implementar su última fase el plan se borra en el mismo cambio, siguiendo `Agents-documentacion.md`, aunque falte la verificación del usuario; no se conserva su historia.

## Mantenimiento de la documentación

Una fase no se da por terminada hasta que su documentación esté al día, según «Qué documento tocar según el cambio» de `../Agents/funcionalidad/Agents-documentacion.md`.

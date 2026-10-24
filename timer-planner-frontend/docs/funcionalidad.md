# Funcionalidad por feature

Mapa de qué reglas y casos de uso corresponden a cada parte del frontend. **No duplica el contenido**: el detalle vive en `../../docs/analisis-reglas-de-negocio.md` (RN = regla de negocio, CU = caso de uso). La comparación entre reglas y código está en `../../docs/estado-y-pendientes.md`.

## Mapa de features

| Feature | Carpeta | Casos de uso | Reglas principales | Falta | Fase |
|---------|---------|--------------|--------------------|--------|-------|
| Cierre del día | `features/daily` (`daily-summary`) | CU-19 | RN-41 a RN-44, RN-72 | ⏳ Pendiente: resumen con constancia y minutos reales | Plan 03 |
| Historial | Por crear | CU-21, CU-28 | RN-11, RN-43, RN-70, RN-72, RN-74 | ⏳ Pendiente | Plan 03 |

**Falta:** solo lo pendiente; lo demás está implementado y descrito en las reglas. Ver el [plan 03](planes/03-avance-constancia-tiempo-real.md).

## Notas

- **Deadlines (RN-65):** la meta no tiene fecha; el objetivo tiene deadline obligatorio y es el tope de sus tareas y pasos. Tarea y paso heredan el deadline de su padre si no tienen uno propio, y pueden tener uno más corto, nunca más largo.
- La pantalla de **historial** (CU-21) se crea en la Fase 3 del plan 03.
- El estado `ARCHIVED` no existe en el MVP.
- **Calendario:** la cuadrícula muestra hasta 3 sesiones por celda y «+N más»; las completadas aparecen tachadas y los días de otros meses atenuados. En pantallas de 700 px o menos las sesiones se muestran como puntos y el panel del día lista todo. Entrada «Calendario» del menú, entre «Agenda Hoy» y «Mis Metas».
- **Agenda por fecha:** barra con día anterior, siguiente, selector de fecha y «Hoy»; la fecha viaja en `?date=`. En días pasados, marcar pide los minutos reales (previstos por defecto); hoy se marca de un clic y desmarcar borra esos minutos. Las fechas futuras son de solo lectura y no tienen botón de cierre. El resumen de cierre muestra las notas ya guardadas de esa fecha.
- **Diálogos:** el borrado exige escribir el título (`requireText`) y los conflictos de deadline se listan antes de guardar.

## Pendiente por definir

Las decisiones abiertas (`D-xx`) y las correcciones propuestas a las reglas (`C-xx`) están en [estado-y-pendientes.md](../../docs/estado-y-pendientes.md). El plan 03 indica qué decisiones bloquean cada fase.

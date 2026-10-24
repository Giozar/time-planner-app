# Funcionalidad por feature

Cómo funciona el frontend en lo que las reglas no cubren. **No duplica el contenido**: el detalle vive en `../../docs/analisis-reglas-de-negocio.md` (RN = regla de negocio, CU = caso de uso). La comparación entre reglas y código está en `../../docs/estado-y-pendientes.md`.

## Notas

- **Deadlines (RN-65):** la meta no tiene fecha; el objetivo tiene deadline obligatorio y es el tope de sus tareas y pasos. Tarea y paso heredan el deadline de su padre si no tienen uno propio, y pueden tener uno más corto, nunca más largo.
- **Historial (CU-21):** entrada «Historial» del menú, ruta `/history`. Lista un resumen por día cerrado, del más reciente al más antiguo, con sesiones realizadas, constancia («Sin datos» si no hubo sesiones), minutos reales y previstos y notas; cada fila abre la agenda de esa fecha.
- El estado `ARCHIVED` no existe en el MVP.
- **Calendario:** la cuadrícula muestra hasta 3 sesiones por celda y «+N más»; las completadas aparecen tachadas y los días de otros meses atenuados. En pantallas de 700 px o menos las sesiones se muestran como puntos y el panel del día lista todo. Entrada «Calendario» del menú, entre «Agenda Hoy» y «Mis Metas».
- **Agenda por fecha:** barra con día anterior, siguiente, selector de fecha y «Hoy»; la fecha viaja en `?date=`. En días pasados, marcar pide los minutos reales (previstos por defecto); hoy se marca de un clic y desmarcar borra esos minutos. Las fechas futuras son de solo lectura y no tienen botón de cierre. El resumen de cierre muestra sesiones realizadas, constancia del día («Sin datos» si no hubo sesiones), tiempo real y previsto, y las notas ya guardadas de esa fecha.
- **Diálogos:** el borrado exige escribir el título (`requireText`) y los conflictos de deadline se listan antes de guardar.

## Pendiente por definir

Las decisiones abiertas (`D-xx`) y las correcciones propuestas a las reglas (`C-xx`) están en [estado-y-pendientes.md](../../docs/estado-y-pendientes.md).
# Reglas generales del frontend

Aplican a todos los agentes de `timer-planner-frontend`.

- Trabaja únicamente dentro de este proyecto. No accedas ni hagas cambios fuera de su directorio.
- No leas ni modifiques archivos salvo que el usuario lo solicite explícitamente. Limita la lectura a lo necesario para esa petición.
- Responde de forma directa y breve, salvo que el usuario pida una explicación detallada.
- Si necesitas ejecutar un comando, pide permiso y explica de manera breve qué hará. Por lo regular, si es para lectura, escritura o modificaciones, explícalo claro.
- Mantén la documentación al día: al terminar una fase de un plan, actualiza los documentos según `docs/README.md`.

## Alcance del trabajo

1. **Solo dentro del proyecto.** Trabaja exclusivamente dentro de esta carpeta (`timer-planner-frontend`) y de sus subcarpetas. No leas, busques, analices ni modifiques archivos fuera de este directorio.
2. **Solo bajo instrucción explícita.** No leas ni modifiques archivos dentro del proyecto a menos que el usuario te dé instrucciones para hacerlo.
3. **Entorno cerrado.** Todo el trabajo se realiza dentro de este entorno y de esta carpeta, sin más excepciones que las declaradas abajo.

## Excepciones declaradas

- **Reglas de negocio, solo lectura:** `docs/analisis-reglas-de-negocio.md` en la raíz del monorepo (`../docs/analisis-reglas-de-negocio.md` desde esta carpeta). Es la fuente de verdad de las reglas. Los agentes de funcionalidad la leen; nunca la modifican desde aquí.

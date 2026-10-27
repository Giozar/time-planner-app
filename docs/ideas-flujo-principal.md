# Ideas: flujo principal

Guía visual del flujo principal, solo de consulta. Las reglas que valen están en [docs/analisis-reglas-de-negocio.md](analisis-reglas-de-negocio.md).

## 1. Jerarquía

La tarea simple y el paso tienen sesiones.

```mermaid
flowchart TD
    M["Meta"] --> O["Objetivo"]
    O --> T["Tarea"]
    T --> P["Paso"]
    T -.->|"tarea simple"| S["Sesión"]
    P --> S
```

## 2. Meta

A dónde se quiere llegar, en general. Tiene fecha límite, que es el tope de sus objetivos.

```mermaid
flowchart TD
    A([Crear meta]) --> B{¿Tipo?}
    B -->|Idea| C["IDEA<br/>se queda así por ahora"]
    B -->|Plazo| D{¿Cuál?}
    D --> E[Corto]
    D --> F[Mediano]
    D --> G[Largo]
    E & F & G --> FL["Fecha límite"]
    FL --> H["Ya definidos: pasa a objetivos"]
```

## 3. Fecha límite

Meta, objetivo, tarea, paso y sesión tienen fecha límite, en cascada: cada uno tiene la suya y conoce la de su padre, que es su tope: la del hijo puede ser igual o menor. La de la sesión es el día en que se va a realizar.

```mermaid
flowchart TD
    M["Meta<br/>propia: 31 dic"] -->|"padre: 31 dic"| O["Objetivo<br/>propia: 30 jun"]
    O -->|"padre: 30 jun"| T["Tarea<br/>propia: 20 jun"]
    T -->|"padre: 20 jun"| P["Paso<br/>propia: 10 jun"]
    P -->|"padre: 10 jun"| S["Sesión<br/>propia: 8 jun"]
```

La tarea simple no tiene pasos; la compuesta sí.

## 4. Qué lleva cada nivel

La meta y el objetivo solo llevan su fecha límite. La tarea simple y el paso, además, llevan un patrón semanal o fechas específicas. La sesión lleva la fecha en que se realiza y su tiempo.

```mermaid
flowchart LR
    M["Meta<br/>fecha límite"]
    O["Objetivo<br/>fecha límite"]
    T["Tarea simple / Paso<br/>fecha límite<br/>+ patrón semanal (ej. lun, mié, vie)<br/>o fechas específicas"]
    T --> R["Se hace en esos días<br/>hasta que se cumpla,<br/>antes o igual a la fecha límite"]
    R --> S["Sesión<br/>fecha en que se realiza<br/>+ tiempo"]
```

## 4.1 Otras propiedades

Como las tenemos hoy, solo añadidas.

| Nivel | Propiedades |
|-------|-------------|
| Meta | título, horizonte (corto, mediano o largo plazo) |
| Objetivo | título, naturaleza (personal, profesional, salud, finanzas, aprendizaje, hábito, bienestar u otro) |
| Tarea | título, tipo (simple o compuesta), prioridad (alta, media, baja), criticidad (vital, esencial recurrente, flexible), complejidad (baja, media, alta) |
| Tarea simple | además: plan de ejecución y recurrencia (única, patrón semanal o fechas específicas), que se determina sola según el plan |
| Tarea compuesta | sin plan ni recurrencia; los llevan sus pasos |
| Paso | título, complejidad, plan de ejecución (no tiene recurrencia) |

El **plan de ejecución** es un patrón semanal (con sus días) o fechas específicas, más la duración de cada sesión.

## 5. Tarea simple o compuesta

La compuesta solo lleva su fecha límite; el patrón y el tiempo los llevan sus pasos.

```mermaid
flowchart TD
    A([Crear tarea]) --> B{¿Tipo?}
    B -->|Simple| C["Tarea sola"]
    B -->|Compuesta| D["Tarea con pasos"]
    D --> E["Paso 1"]
    D --> F["Paso 2"]
    D --> G["Paso 3"]
```

## 6. Qué se puede hacer (CRUD)

Cada nivel se puede crear solo si existe el de arriba.

```mermaid
flowchart LR
    M["Meta"] -->|"al crearla puedes crear"| O["Objetivo"]
    O -->|"al crearlo puedes crear"| T["Tarea"]
    T -->|"al crearla puedes crear"| P["Paso"]
    T -->|"tarea simple"| S["Sesión"]
    P --> S
```

En cada nivel:

```mermaid
flowchart LR
    X["Meta / Objetivo / Tarea / Paso / Sesión"] --- C["Crear"]
    X --- R["Consultar"]
    X --- U["Editar"]
    X --- D["Eliminar"]
```

## 7. Estados

Meta, objetivo, tarea, paso y sesión comparten estas tres propiedades, independientes entre sí.

```mermaid
flowchart LR
    X["Meta / Objetivo / Tarea / Paso / Sesión"] --- A["Estado: abierto / pausado / cerrado<br/>¿en qué situación está?"]
    X --- C["Resultado: completo / incompleto<br/>¿se logró?"]
    X --- V["Vencido: verdadero / falso<br/>¿pasó su fecha sin cumplirse?"]
```

Cuando se cambia el estado de un padre, sus hijos cambian igual: cerrar, reabrir o pausar.

Vencido se apaga extendiendo la fecha límite:

```mermaid
flowchart TD
    A["Pasa la fecha límite<br/>y no se cumplió"] --> B["vencido = verdadero"]
    B --> C["Se extiende la fecha límite"]
    C --> D["vencido = falso"]
    D --> E["Ya se pueden cambiar<br/>las fechas de las sesiones<br/>(sin pasar de la fecha límite)"]
```

## 8. Calendario y sesiones

El calendario solo muestra las fechas de las sesiones de cada tarea simple o paso. No guarda nada propio.

La **sesión** es su propio modelo, hija de una tarea simple o de un paso. Tiene su identificador, **fecha**, **tiempo** (ej. 45 min), **tiempo realizado** (se llena al marcarla) y **notas**. Comparte con los demás niveles estado, resultado, vencido y productividad. No tiene constancia, porque no tiene sentido en una sola sesión. Se crean al elegir en el calendario (fechas específicas o patrón semanal), sin pasar de la fecha límite:

```mermaid
flowchart LR
    A["Fechas específicas"] --> L
    B["Patrón semanal"] --> L
    L["Tarea simple / Paso<br/>sesiones: [ {id, fecha, tiempo, tiempo realizado, notas}, ... ]"] --> C["Calendario"]
```

Cada sesión puede tener el mismo tiempo que las demás o el suyo. En pantalla, al crear o editar, un check decide cómo se reparte:

```mermaid
flowchart LR
    C{"Check: mismo tiempo"} -->|Marcado| A["Todas iguales"]
    C -->|Sin marcar| B["Cada una con su tiempo"]
```

En pantalla se ve como el calendario actual: mes y año navegables, y se marca hoy.

Ejemplo: "Estudiar inglés" con patrón lun, mié, vie.

| Lun | Mar | Mié | Jue | Vie | Sáb | Dom |
|-----|-----|-----|-----|-----|-----|-----|
| Estudiar inglés | | Estudiar inglés | | Estudiar inglés | | |

### La sesión en cada momento

```mermaid
flowchart TD
    S["Sesión"] --> Q{"¿Cómo está?"}
    Q -->|"Su fecha aún no llega"| A["Abierta<br/>incompleta · no vencida · 0 %"]
    Q -->|"Se hizo con todo su tiempo"| B["Cerrada<br/>completa · no vencida · 100 %"]
    Q -->|"Se hizo con menos tiempo"| E["Cerrada<br/>incompleta · no vencida · menos de 100 %"]
    Q -->|"Pasó su fecha y no se hizo"| C["Cerrada<br/>incompleta · vencida · 0 %"]
    Q -->|"Se pausó el padre"| D["Pausada<br/>incompleta · no vencida · 0 %"]
```

Si no se hizo, la sesión vale 0 %. Si se hizo, vale el promedio entre 100 % y su productividad. Como todos, solo es completa al llegar a 100 %, es decir, hecha con todo su tiempo.

## 9. Cálculos

Meta, objetivo, tarea y paso tienen dos medidas (la sesión solo la segunda):

```mermaid
flowchart LR
    X["Meta / Objetivo / Tarea / Paso"] --- A["Constancia<br/>sesiones realizadas ÷ sesiones totales"]
    X --- B["Productividad<br/>tiempo realizado ÷ tiempo definido"]
```

Ejemplo: 3 de 4 sesiones realizadas = 75 % de constancia.

En la sesión, la productividad es su tiempo realizado ÷ su tiempo (ej. 45 de 45 min = 100 %). No tiene constancia.

Ejemplo: se hizo la sesión pero solo 30 de 45 min. Productividad 67 %, avance (100 + 67) ÷ 2 = 83 %, así que queda incompleta. Si no se hizo, 0 %.

El **avance** es el promedio de las dos. Con él se decide el resultado:

```mermaid
flowchart LR
    C["Constancia"] --> V["Avance<br/>(constancia + productividad) ÷ 2"]
    P["Productividad"] --> V
    V -->|"100 %"| A["Completo"]
    V -->|"menos de 100 %"| B["Incompleto"]
```

## 10. Historial diario

Cada día del calendario guarda un registro diario con las sesiones de ese día.

```mermaid
flowchart TD
    T["Tarea simple / Paso"] --> S["Sesión<br/>id, fecha, tiempo, tiempo realizado, notas,<br/>estado, resultado, vencido"]
    D["Registro diario<br/>fecha, notas del día,<br/>sesiones hechas ÷ totales,<br/>tiempo realizado"] --- S
```

En la misma agenda, el calendario sirve para viajar a cualquier fecha y ver cómo estuvo ese día. Esto reemplaza la pantalla de historial actual:

```mermaid
flowchart LR
    C["Calendario"] -->|"eliges una fecha"| D["Registro diario<br/>de esa fecha"]
```

Al marcar cada sesión con su check se ponen su tiempo realizado y su nota. Al cerrar el día se escribe la nota del día y se guarda el registro.

## 11. Métricas

Con los datos de las secciones anteriores se puede evaluar cómo voy. Para cada nivel (metas, objetivos, tareas, pasos y sesiones) se cuenta cuántos hay en cada caso, más sus medidas:

```mermaid
flowchart LR
    X["Metas / Objetivos / Tareas / Pasos / Sesiones"] --> A["Cuántos completos"]
    X --> B["Cuántos incompletos"]
    X --> C["Cuántos cerrados"]
    X --> D["Cuántos vencidos"]
    X --> E["Constancia y productividad<br/>(las sesiones, solo productividad)"]
```

Ejemplo: de mis 5 metas, 2 completas, 3 incompletas, 4 cerradas y 1 vencida.

## 12. Todo junto

```mermaid
flowchart TD
    M["Meta<br/>fecha límite"] -->|"Idea"| I["Se queda como idea"]
    M -->|"Plazo: corto / mediano / largo"| O["Objetivo<br/>fecha límite"]
    O --> TS["Tarea simple"]
    O --> TC["Tarea compuesta"]
    TC --> P1["Paso"]
    TC --> P2["Paso"]
    TS --> S1["Sesiones"]
    P1 --> S2["Sesiones"]
    P2 --> S3["Sesiones"]
    S1 & S2 & S3 --> R["Registro diario"]
```
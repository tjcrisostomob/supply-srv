# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
El proyecto aún no tiene versiones publicadas: no hay código, solo los
documentos que lo gobiernan.

## [No publicado]

### Añadido

- **`docs/constitution.md`** — seis principios innegociables del proyecto: stack
  mínimo, la spec manda, lógica fuera del handler, sin test no se mergea,
  persistencia declarativa, e inglés en el código con español para el usuario.
- **`docs/specs/001-supply-mvp/spec.md`** — especificación de las solicitudes de
  abastecimiento (MVP): 50 requisitos funcionales en notación EARS, 4 no
  funcionales, 13 casos límite y el fuera de alcance. Sin dudas abiertas.
- **`docs/specs/001-supply-mvp/plan.md`** — plan técnico: siete decisiones
  justificadas con su alternativa descartada, estructura de módulos, modelo de
  datos, contrato OData V2, estrategia de tests y matriz que asocia cada uno de
  los 50 RF con el sitio donde se cumple y el test que lo prueba.
- **`docs/specs/001-supply-mvp/tasks.md`** — 36 tareas de 20-30 minutos en seis
  fases, en orden de dependencia, cada una con los RF que cubre y una condición
  de cierre comprobable.
- **`AGENTS.md`** y **`CLAUDE.md`** — convenciones para agentes: comandos, estilo,
  reglas y qué hacer al terminar una tarea.
- **`.claude/skills/spec-generator/`** — skill que conduce la entrevista de
  requisitos y produce la spec según la plantilla del equipo.
- **`CHANGELOG.md`** — este archivo.

### Decidido

Decisiones de producto cerradas en las dos entrevistas de requisitos del
2026-09-18, todas recogidas en la spec 001:

- El ciclo de vida es `BORRADOR → REGISTRADA → LIBERADA` e irreversible. La
  solicitud es **editable hasta liberar**, no hasta registrar.
- La validación es **escalonada**: registrar exige al menos una posición
  completa; el transportista se exige solo al liberar.
- Una solicitud REGISTRADA **no puede quedarse sin posiciones**: se rechaza
  borrar la última.
- El **número de solicitud** es único y creciente desde 1000000; se aceptan
  huecos en la secuencia.
- El **catálogo de transportistas** se mantiene en el propio servicio, sin baja
  lógica. Un transportista asignado a alguna solicitud no se puede borrar.
- La cabecera guarda solo una descripción; la posición, material, cantidad y
  unidad, los tres obligatorios.
- Las **posiciones se numeran** 10, 20, 30…, las asigna el sistema y no se
  renumeran al borrar.
- La **cantidad** debe ser mayor que cero y un **material no se repite** dentro de
  una solicitud.
- Los datos del transportista que muestra una solicitud son siempre los
  **vigentes**, también en las solicitudes ya liberadas.
- Se pueden **listar y filtrar** solicitudes por número, estado y transportista.
- No se fija ningún **umbral de rendimiento** en este MVP.

Decisiones técnicas cerradas en el plan 001, cada una con su alternativa
descartada documentada:

- **OData V2 se sirve con `@cap-js-community/odata-v2-adapter`.** CAP para Node
  sirve V4; `cds-serve` por sí solo no expone V2. Es la primera dependencia que
  el principio 1 de la constitución obliga a justificar, y arrastra que las
  acciones `register` y `release` se publiquen como *function imports* y que los
  decimales se serialicen como cadena.
- **El BORRADOR es estado de dominio, no draft de CAP.** Se descarta
  `@odata.draft.enabled`: su ciclo de edición con tablas sombra y bloqueo por
  usuario contradice lo que la spec deja fuera de alcance.
- **El número de solicitud sale de una tabla contador con bloqueo**, no de una
  secuencia de HANA (sería DDL manual, prohibido por el principio 5) ni de un
  `max() + 1` (dos registros simultáneos pedirían el mismo número).
- **El número de posición sale de un contador en la cabecera.** El `max() + 10`
  evidente incumple RF-24: al borrar la posición más alta, su número se
  reutilizaría.
- **El código del transportista es la clave**, lo que hace estructural su
  inmutabilidad, en lugar de un UUID con el código como campo único.
- **Las validaciones cuyo mensaje debe nombrar el dato concreto viven en módulos
  puros**, no en anotaciones: `@readonly` descarta en silencio donde la spec
  exige rechazar, y `@assert.range` no expresa un límite inferior abierto.
- **Los valores de estado se almacenan en español** (`BORRADOR`, `REGISTRADA`,
  `LIBERADA`) con identificadores de enum en inglés: son dato y contrato de
  filtrado, no texto de interfaz.

### Corregido

- **`README.md`** alineado con la spec 001. Se retira el bloqueo en exclusiva de
  una solicitud, que nunca llegó a ser un requisito; REGISTRADA pasa de "solo
  lectura" a editable; y se sustituye "registrar no valida nada" por la
  validación escalonada real. El diagrama de ciclo de vida refleja ahora lo que
  exige cada transición.

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

### Corregido

- **`README.md`** alineado con la spec 001. Se retira el bloqueo en exclusiva de
  una solicitud, que nunca llegó a ser un requisito; REGISTRADA pasa de "solo
  lectura" a editable; y se sustituye "registrar no valida nada" por la
  validación escalonada real. El diagrama de ciclo de vida refleja ahora lo que
  exige cada transición.

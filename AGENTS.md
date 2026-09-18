# AGENTS.md — supply-srv

## Proyecto
Servicio SAP CAP en Node.js que expone por OData V2 las solicitudes de
abastecimiento: cabecera con sus posiciones (composición) y transportista
asignado (asociación). Ciclo de vida `BORRADOR → REGISTRADA → LIBERADA`,
irreversible. Las posiciones se borran de forma directa y definitiva, sin marca
de eliminación. El catálogo de transportistas también se mantiene aquí: se dan
de alta, se modifican y se borran desde el propio servicio, y no hay baja
lógica.
Persistencia declarativa en `db/schema.cds`, desplegada sobre HDI.
El detalle funcional está en `docs/specs/001-supply-mvp/spec.md`.

## Comandos
- Ejecutar: `cds-serve`
- Tests: `npm test`

## Estilo
- SAP CAP v9 sobre Node.js, expuesto vía `cds-serve` en OData V2.
- Solo lo que trae CAP; Jest únicamente para tests.
- Identificadores, comentarios y commits en inglés; mensajes de usuario en
  español, externalizados en `_i18n/*.properties`.
- Handlers finos: `before/on/after` solo validan, delegan y mapean. Las reglas
  de negocio viven en módulos puros, sin dependencia de `cds`. Ningún archivo
  de `srv/` supera 100 líneas.
- El esquema cambia solo vía `db/schema.cds`: nada de DDL manual.

## Reglas
- Lee `docs/constitution.md` y la spec activa en `docs/specs/**/spec.md` antes
  de tocar código.
- No implementes nada que no esté en la spec aprobada.
- No añadas dependencias sin justificarlo en el PR.
- No modifiques archivos dentro de `docs/specs/` salvo petición explícita.
- La distribución concreta de archivos dentro de `srv/` la fija el plan, no
  este documento.

## Al terminar cualquier tarea
- Ejecuta `npm test` y confirma en tu respuesta que todo pasa.

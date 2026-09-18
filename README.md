# supply-srv

Servicio SAP CAP que expone por OData V2 las **solicitudes de abastecimiento**:
una cabecera con sus posiciones y el transportista que se encarga del
transporte.

El punto del servicio es el cierre. Una solicitud nace como borrador, se
registra —y recibe entonces su número— y se sigue trabajando hasta que se
libera. Una vez liberada, nadie la modifica: queda como registro firme de lo
que se pidió. El catálogo de transportistas se mantiene en el mismo servicio.

## Ciclo de vida

```
BORRADOR ──registrar──> REGISTRADA ──liberar──> LIBERADA
editable                editable                inmutable
sin número              nº ≥ 1000000            final

registrar exige: ≥1 posición con datos completos
liberar   exige: transportista asignado
borrar la solicitud: solo en BORRADOR
```

Ambas transiciones son irreversibles y la validación es escalonada: registrar
exige al menos una posición con material, cantidad y unidad; el transportista
se exige solo al liberar. Una vez registrada, la solicitud ya no puede quedarse
sin posiciones: se rechaza borrar la última. Un transportista asignado a alguna
solicitud tampoco se puede borrar.

## Estado actual

El proyecto está en fase de especificación: **todavía no hay código**.

| Documento | Estado |
|---|---|
| [docs/constitution.md](docs/constitution.md) | 6 principios innegociables |
| [docs/specs/001-supply-mvp/spec.md](docs/specs/001-supply-mvp/spec.md) | Redactada — pendiente de aprobación |
| Plan técnico | Pendiente |

## Cómo se trabaja aquí

1. La **constitución** fija las reglas que no se negocian: stack mínimo, tests,
   persistencia declarativa, idioma.
2. La **spec** define el QUÉ y el POR QUÉ, con criterios de aceptación en
   notación EARS. Si algo no está en la spec, no se implementa.
3. El **plan** decidirá el CÓMO: modelo de datos, distribución de archivos,
   despliegue. Aún no existe.

Antes de tocar código, lee la constitución y la spec activa. Las convenciones
para agentes están en [AGENTS.md](AGENTS.md).

## Comandos previstos

```bash
cds-serve     # arranca el servicio
npm test      # ejecuta los tests
```

Ninguno de los dos funciona todavía: no hay `package.json` ni implementación.
Llegarán con el plan.
"# supply-srv" 

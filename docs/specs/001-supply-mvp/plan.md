# Plan 001 — Solicitudes de abastecimiento (MVP)

Plan técnico de [spec.md](spec.md). Aquí va el **CÓMO**; el QUÉ y el POR QUÉ
están en la spec y no se repiten. Toda decisión se justifica contra la
[constitución](../../constitution.md) y se marca qué RF cubre.

---

## 1. Decisiones técnicas

### D-1. OData V2 mediante adaptador, no nativo

**Decisión.** CAP para Node.js sirve OData **V4**; `cds-serve` por sí solo no
expone V2. Se añade `@cap-js-community/odata-v2-adapter`, que **se registra solo
como plugin de CDS**: no hace falta `server.js`. El servicio se define una sola
vez en CDS y el adaptador traduce V2 ↔ V4 en ambos sentidos.

> **Corregido en T-02 (2026-09-18).** La primera redacción de esta decisión decía
> que el adaptador se montaba a mano en un `server.js`. Es innecesario: el
> paquete trae `cds-plugin.js` y CAP lo descubre al arrancar. Un `server.js` que
> repitiera ese montaje sería código muerto, así que el proyecto no lo tiene.

**Por qué.** Es la vía soportada por SAP para V2 en CAP Node y la única que
mantiene un solo modelo CDS. La spec y `AGENTS.md` fijan V2 como contrato de
salida, así que el adaptador no es opcional.

**Alternativa descartada.** Escribir a mano un express router que emule V2 sobre
los servicios CAP: más código propio que el servicio entero, sin `$metadata`
EDMX v2 correcto y sin soporte de `$expand`/`$filter`.

**Tensión con la constitución.** El principio 1 pide stack mínimo y justificar
toda dependencia nueva. Esta es la primera y la más cara: se justifica aquí y
debe repetirse en el PR. Ver §7.

---

### D-2. El BORRADOR es estado de dominio, no draft de CAP

**Decisión.** `status` es un campo del modelo con tres valores. **No** se usa
`@odata.draft.enabled`.

**Por qué.** El draft de CAP es un mecanismo de edición en dos tablas
(`_drafts`) pensado para Fiori elements: crea entidades sombra, bloqueos por
usuario y un ciclo `draftActivate`. La spec pide justo lo contrario —
edición libre sin bloqueo (fuera de alcance: «bloqueo o reserva en exclusiva»)
y un BORRADOR que es un registro de pleno derecho, persistente y consultable.

**Alternativa descartada.** `@odata.draft.enabled`: arrastraría tablas de draft
que nadie lee, un ciclo de vida paralelo al de la spec y, además, el soporte de
draft en el adaptador V2 es parcial.

**Cubre.** RF-1, RF-20.

---

### D-3. Numeración de solicitudes con tabla contador y bloqueo

**Decisión.** Entidad `NumberRanges` en `db/schema.cds` con una fila por rango.
Al registrar, dentro de la misma transacción:

```
SELECT.one.from(NumberRanges).where({name:'SUPPLY_REQUEST'}).forUpdate()
→ si no existe, se crea con nextValue = 1000000
→ requestNo = nextValue; UPDATE nextValue = nextValue + 1
```

La fila se crea de forma perezosa en el primer registro, sin CSV de carga.

**Por qué.** `forUpdate()` serializa los registros concurrentes, que es lo que
RNF-3 exige. Vive en `db/schema.cds`, así que `cds-deploy` la reconstruye desde
cero (constitución 5) y funciona igual en SQLite para los tests y en HANA en
producción. Es monótona, luego nunca decrece: RF-10 sale gratis.

**Alternativa descartada (a).** Secuencia nativa de HANA en un `.hdbsequence`:
es DDL manual escrito a mano, que el principio 5 prohíbe, y no existe en SQLite,
con lo que los tests dejarían de cubrir el camino real.

**Alternativa descartada (b).** `SELECT max(requestNo) + 1`: dos registros
simultáneos leen el mismo máximo y piden el mismo número. Habría que apoyarse en
la restricción de unicidad y reintentar, que es más código y más frágil que el
bloqueo.

**Nota sobre RF-10.** Solo se puede eliminar una solicitud en BORRADOR (RF-5,
RF-6) y un BORRADOR nunca tiene número. Ninguna eliminación libera un número, así
que la reutilización es imposible por construcción, además de por el contador.

**Cubre.** RF-8, RF-9, RF-10, RNF-3.

---

### D-4. Numeración de posiciones con contador en la cabecera

**Decisión.** La cabecera guarda `lastItemNo` (técnico, **no expuesto**). Al
crear una posición: `itemNo = lastItemNo + 10`, y se actualiza `lastItemNo`.
Nunca decrece.

**Por qué.** La opción evidente —`max(itemNo) + 10` sobre las posiciones
vivas— **incumple RF-24**: con las posiciones 10 y 20, al borrar la 20 el máximo
vuelve a 10 y la siguiente posición se numeraría otra vez como 20, reutilizando
el número de una posición eliminada. Un contador monótono por cabecera lo evita
y reproduce exactamente el caso límite 7 de la spec.

**Alternativa descartada.** `max(itemNo) + 10` calculado al vuelo: más simple, y
correcto solo mientras no se borre la posición más alta. No cumple RF-24.

**Tensión con RF-2.** RF-2 dice que la solicitud guarda «únicamente» descripción,
estado, número y transportista. `lastItemNo` es estado técnico, no dato de
negocio: se declara en `db/schema.cds` y se **excluye de la proyección del
servicio**, de modo que no aparece en `$metadata` ni en ninguna respuesta. Lo que
RF-2 enumera es lo que el servicio expone, y eso se cumple.

**Cubre.** RF-23, RF-24.

---

### D-5. El código del transportista es la clave

**Decisión.** `Carriers` tiene `key code : String(10)`. No hay UUID.

**Por qué.** Es la clave de negocio que el usuario teclea al dar de alta y que
la spec declara inmutable. Siendo clave, RF-37 se cumple de forma estructural: en
OData no existe la operación «cambiar la clave», y cualquier intento se rechaza
antes de llegar a la lógica. También hace que RF-36 tenga red de seguridad en la
restricción de clave primaria, aunque el mensaje bonito lo dé el handler.

**Alternativa descartada.** UUID como clave y `code` como campo con
`@assert.unique`: obligaría a implementar la inmutabilidad a mano en un handler,
y a exponer dos identificadores donde el negocio solo reconoce uno.

**Consecuencia.** Es exactamente el caso límite 9 de la spec: un código mal
tecleado en un transportista ya asignado es permanente.

**Cubre.** RF-34, RF-37.

---

### D-6. Las validaciones con mensaje propio van en handler, no en anotación

**Decisión.** Se usan anotaciones declarativas donde el mensaje genérico basta
(`@mandatory`, `@assert.target`), redefiniendo su texto en `_i18n`. Donde la
spec exige un mensaje que **nombre el dato concreto**, la comprobación vive en un
módulo puro invocado desde un `before`.

| Regla | Mecanismo | Motivo |
|---|---|---|
| RF-35 código y nombre obligatorios | `@mandatory` | mensaje genérico suficiente |
| RF-45 transportista inexistente | `@assert.target` | CAP ya valida el destino de la asociación |
| RF-26 cantidad > 0 | módulo puro | `@assert.range` no expresa un límite inferior abierto |
| RF-27 material duplicado | módulo puro | el mensaje debe decir **qué** material se repite |
| RF-12 posición incompleta | módulo puro | el mensaje debe decir **qué posición** lo está |
| RF-25 número de posición | módulo puro | `@readonly` **descarta en silencio**; la spec exige rechazar |

**Alternativa descartada.** `@assert.unique` sobre `[request, material]` para
RF-27: es declarativo y elegante, pero su mensaje no puede nombrar el material
duplicado y la comprobación hace falta igualmente en el camino de alta múltiple.

**Cubre.** RF-12, RF-25, RF-26, RF-27, RF-35, RF-45, RF-49.

---

### D-7. Los valores de estado se guardan en español

**Decisión.** Identificadores del enum en inglés (`DRAFT`, `REGISTERED`,
`RELEASED`), valores almacenados en español (`'BORRADOR'`, `'REGISTRADA'`,
`'LIBERADA'`).

**Por qué.** El principio 6 separa identificadores (inglés) de texto visible
(español externalizado). Un valor de enum no es ninguna de las dos cosas: es
dato. La spec define los tres estados con esos nombres y RF-48 filtra por ellos,
así que son parte del contrato con el consumidor. Cambiarlos a inglés obligaría a
traducir en cada filtro.

**Cubre.** RF-48.

---

## 2. Estructura de módulos

Los `srv/lib/*` son funciones puras: reciben datos planos, devuelven datos
planos, **no importan `cds`** y no tocan la base de datos. Los handlers leen,
delegan y mapean el resultado a `req.error`. Ningún archivo llega a 100 líneas
(constitución 3).

```
db/
  schema.cds                    modelo persistente (§3)

srv/
  supply-service.cds            servicio, proyecciones y acciones (§4)
  supply-service.js             solo registro de handlers  (~35 líneas)
  handlers/
    request-guards.js           before UPDATE/DELETE de SupplyRequests
    request-lifecycle.js        on register / on release
    item-guards.js              before CREATE/UPDATE/DELETE de posiciones
    carrier-guards.js           before CREATE/UPDATE/DELETE de transportistas
  lib/
    lifecycle.js                máquina de estados (tabla de transiciones)
    request-rules.js            qué se puede hacer según el estado
    item-rules.js               completitud, cantidad, duplicados, numeración
    carrier-rules.js            campos obligatorios e inmutabilidad del código
    number-range.js             cálculo del siguiente número (sin E/S)
    messages.js                 constantes de código de mensaje

_i18n/
  messages.properties           español (por defecto)
  messages_en.properties        inglés

test/
  unit/                         un fichero por módulo de lib/
  integration/                  un fichero por entidad expuesta, sobre OData V2
```

### Responsabilidad de cada módulo puro

| Módulo | Exporta | RF |
|---|---|---|
| `lifecycle.js` | `canTransition(from, to)`, `isEditable(status)`, `isFinal(status)` | RF-13, RF-16, RF-20 |
| `request-rules.js` | `canEditHeader`, `canDelete`, `canRegister`, `canRelease`, `canChangeCarrier` | RF-4, RF-6, RF-11, RF-15, RF-17, RF-19, RF-43, RF-44 |
| `item-rules.js` | `isComplete`, `firstIncomplete`, `checkQuantity`, `findDuplicateMaterial`, `nextItemNo`, `canDeleteItem` | RF-12, RF-22, RF-23, RF-26, RF-27, RF-31, RF-32 |
| `carrier-rules.js` | `requiredFields`, `isCodeChange` | RF-35, RF-37 |
| `number-range.js` | `nextRequestNo(current)` | RF-8 |
| `messages.js` | constantes de código, sin texto | RF-49 |

### Por qué esta división

`lifecycle.js` es la única pieza que conoce la tabla de transiciones; los demás
módulos preguntan por ella en vez de comparar cadenas, de forma que RF-20 se
cumple en un solo sitio. `number-range.js` no lee la base de datos: recibe el
valor actual y devuelve el siguiente, para que sea testeable sin transacción; la
lectura con bloqueo vive en `request-lifecycle.js`, que es E/S y no regla.

---

## 3. Modelo de datos — `db/schema.cds`

Toda la persistencia es declarativa; no hay DDL escrito a mano (constitución 5).

```cds
namespace supply;

using { cuid } from '@sap/cds/common';

type RequestStatus : String(10) enum {
  DRAFT      = 'BORRADOR';
  REGISTERED = 'REGISTRADA';
  RELEASED   = 'LIBERADA';
}

entity SupplyRequests : cuid {
  requestNo   : Integer;                    // null hasta registrar
  description : String(200);                // opcional (RF-3)
  status      : RequestStatus default #DRAFT;
  carrier     : Association to Carriers @assert.target;
  items       : Composition of many SupplyRequestItems
                  on items.request = $self;
  lastItemNo  : Integer default 0;          // técnico, no expuesto (D-4)
}

entity SupplyRequestItems : cuid {
  request  : Association to SupplyRequests;
  itemNo   : Integer;
  material : String(40);
  quantity : Decimal(13,3);
  unit     : String(3);
}

entity Carriers {
  key code : String(10)  @mandatory;
      name : String(100) @mandatory;
      phone: String(30);
      email: String(100);
}

entity NumberRanges {
  key name      : String(20);               // 'SUPPLY_REQUEST'
      nextValue : Integer;
}
```

### Justificación campo a campo

| Elemento | Decisión | RF |
|---|---|---|
| `cuid` en `SupplyRequests` | UUID técnico generado por CAP, independiente del número de negocio | RF-1 |
| `requestNo : Integer` nulo | separa identificador técnico de número de negocio; nulo mientras es BORRADOR | RF-1, RF-7 |
| `description` sin `@mandatory` | la spec la admite vacía en cualquier estado | RF-2, RF-3 |
| `status` con `default #DRAFT` | toda solicitud nace en BORRADOR sin que el handler intervenga | RF-1 |
| `carrier` como `Association` | referencia viva: el cambio de nombre se ve en todas las solicitudes, también liberadas | RF-40 |
| `@assert.target` | CAP rechaza asignar un transportista inexistente sin código propio | RF-45 |
| `items` como `Composition` | contención: borrado en cascada y ninguna posición huérfana | RF-5, RF-33 |
| sin campo de anulación | el borrado de posiciones es físico, sin marca | RF-30 |
| `Carriers` sin UUID | ver D-5 | RF-34, RF-37 |
| `NumberRanges` no se expone | tabla interna, ausente del servicio | RF-8 |

**Lo que deliberadamente no está:** solicitante, fecha de necesidad, centro,
texto de posición, marca de borrado y copia histórica del transportista. Todos
figuran en «Fuera de alcance» de la spec; añadirlos ahora violaría el principio 2.

---

## 4. Servicio y salida OData V2

### `srv/supply-service.cds`

```cds
using supply from '../db/schema';

service SupplyService @(path: '/supply') {

  entity SupplyRequests as projection on supply.SupplyRequests
    excluding { lastItemNo }
    actions {
      action register() returns SupplyRequests;
      action release()  returns SupplyRequests;
    };

  entity SupplyRequestItems as projection on supply.SupplyRequestItems;

  entity Carriers as projection on supply.Carriers;
}
```

`NumberRanges` no se proyecta: no forma parte del contrato. `lastItemNo` se
excluye de la proyección, de modo que no aparece en `$metadata` (D-4).

### Endpoints resultantes

**Rutas reales, medidas en T-02** con una sonda contra CAP 9.9.3 y el adaptador
1.16.1. El servicio declara `@(path:'/supply')`, que al ser absoluto fija la ruta
V4; el adaptador publica la V2 bajo su base por defecto `odata/v2`:

- **V2 (el contrato):** `/odata/v2/supply/…` — responde `DataServiceVersion: 2.0`
- **V4 (solo para depurar):** `/supply/…`

> **Corregido en T-02 (2026-09-18).** La primera redacción daba `/odata/v2/supply` y
> `/supply`. `/odata/v2/supply` devuelve 404: la base por defecto del adaptador es
> `odata/v2` desde CDS 7. Se adoptan las rutas por defecto en vez de forzar la
> opción `path`, porque cambiarla obliga a alinear también `targetPath` con la
> ruta V4 y eso no se puede verificar de verdad hasta que haya datos (T-04).

| Operación | Petición V2 | RF |
|---|---|---|
| Metadatos | `GET /odata/v2/supply/$metadata` → EDMX 2.0 | — |
| Crear borrador | `POST /odata/v2/supply/SupplyRequests` `{"description":"Obra norte"}` | RF-1 |
| Leer una | `GET /odata/v2/supply/SupplyRequests(guid'…')?$expand=items,carrier` | RF-46 |
| Listar | `GET /odata/v2/supply/SupplyRequests?$inlinecount=allpages` | RF-47 |
| Filtrar | `GET /odata/v2/supply/SupplyRequests?$filter=status eq 'REGISTRADA'` | RF-48 |
| | `…?$filter=requestNo eq 1000000` | RF-48 |
| | `…?$filter=carrier_code eq 'TR-01'` | RF-48 |
| Editar cabecera | `MERGE /odata/v2/supply/SupplyRequests(guid'…')` | RF-4 |
| Asignar transportista | `MERGE …` `{"carrier_code":"TR-01"}` | RF-43 |
| Quitar transportista | `MERGE …` `{"carrier_code":null}` | RF-44 |
| Borrar borrador | `DELETE /odata/v2/supply/SupplyRequests(guid'…')` | RF-5 |
| Añadir posición | `POST /odata/v2/supply/SupplyRequests(guid'…')/items` | RF-28 |
| Editar posición | `MERGE /odata/v2/supply/SupplyRequestItems(guid'…')` | RF-29 |
| Borrar posición | `DELETE /odata/v2/supply/SupplyRequestItems(guid'…')` | RF-30 |
| Registrar | `POST /odata/v2/supply/SupplyRequests_register?ID=guid'…'` | RF-7 |
| Liberar | `POST /odata/v2/supply/SupplyRequests_release?ID=guid'…'` | RF-14 |
| Catálogo | `GET|POST|MERGE|DELETE /odata/v2/supply/Carriers('TR-01')` | RF-38, RF-41 |

### Particularidades de V2 que condicionan la implementación

1. **Las acciones enlazadas se exponen como *function imports*, con el nombre de
   la entidad por delante.** V2 no tiene acciones enlazadas; el adaptador las
   publica como `<Entidad>_<acción>`, con la clave por query string. Los tests de
   integración deben llamarlas así, no con la sintaxis V4
   `SupplyRequests(…)/SupplyService.register`.

   > **Medido en T-04 (2026-09-18).** El nombre lleva prefijo: la primera
   > redacción daba `/odata/v2/supply/register`, que devuelve **404**. El real es
   > `/odata/v2/supply/SupplyRequests_register`, que ya responde **501 «no
   > handler»** porque la acción está declarada y aún sin implementar. En el
   > `$metadata` V2 aparecen como
   > `<FunctionImport Name="SupplyRequests_register" m:HttpMethod="POST"
   > sap:action-for="SupplyService.SupplyRequests">`.
2. **`Decimal` se serializa como cadena.** `quantity` vuelve como `"5.000"`, no
   como número. Las aserciones de los tests lo tienen en cuenta.
3. **La clave UUID se escribe `guid'…'`** en la URL, no entre comillas simples.
4. **No hay `$count`;** el recuento es `$inlinecount=allpages`.
5. **Formato de error V2:** `{"error":{"code":"…","message":{"lang":"es","value":"…"}}}`.
   El adaptador traduce los errores de CAP a esta forma conservando código y
   texto, que es lo que RF-49 necesita.

---

## 5. Mensajes y lenguaje

`lib/messages.js` solo declara constantes; el texto vive en `_i18n`
(constitución 6, RNF-1). Los handlers hacen `req.error(409, MSG.ITEM_REQUIRED)` y
CAP resuelve la clave contra el bundle.

> **Medido en T-05 (2026-09-18).** Los dos bundles llevan sufijo de idioma
> —`messages_es.properties` y `messages_en.properties`— y **no hay fichero
> genérico** `messages.properties`. Un fichero sin sufijo pierde frente al
> `messages_es.properties` que trae el propio CAP, de modo que las redefiniciones
> de `ASSERT_MANDATORY` y `ASSERT_TARGET` se quedaban sin efecto en silencio.
> Además hace falta `cds.i18n.default_language = 'es'` en `package.json`: el
> valor por defecto de CAP es `'en'`, y sin cambiarlo una petición sin
> `Accept-Language` recibía todo en inglés, incumpliendo RNF-1.

```properties
# _i18n/messages_es.properties  (español, idioma por defecto)
ITEM_REQUIRED       = La solicitud necesita al menos una posición para registrarse.
ITEM_INCOMPLETE     = La posición {0} está incompleta: faltan material, cantidad o unidad.
ITEM_LAST_ON_REG    = Una solicitud registrada debe conservar al menos una posición.
ITEM_NO_READONLY    = El número de posición lo asigna el sistema.
QUANTITY_POSITIVE   = La cantidad debe ser mayor que cero.
MATERIAL_DUPLICATED = El material {0} ya está en otra posición de esta solicitud.
ALREADY_REGISTERED  = La solicitud ya fue registrada.
NOT_REGISTERED      = Solo se puede liberar una solicitud registrada; esta está {0}.
CARRIER_REQUIRED    = No se puede liberar sin transportista asignado.
RELEASED_IMMUTABLE  = Una solicitud liberada no se puede modificar.
DELETE_ONLY_DRAFT   = Solo se pueden eliminar solicitudes en borrador.
CARRIER_IN_USE      = El transportista está asignado a {0} solicitud(es) y no se puede eliminar.
CARRIER_DUPLICATED  = Ya existe un transportista con el código {0}.
CARRIER_CODE_FIXED  = El código de un transportista no se puede modificar.
```

También se redefinen aquí los textos por defecto de CAP para `@mandatory` y
`@assert.target`, para que ningún mensaje salga en inglés.

**Cubre.** RF-49, RNF-1.

---

## 6. Atomicidad y aplicación en servidor

- Cada petición corre en una transacción de CAP. Un `req.error` emitido en fase
  `before` aborta antes de tocar la base de datos; en `on`, el `throw` provoca
  rollback. No hay escritura parcial posible. **RF-50, RNF-2.**
- El registro lee el contador con `forUpdate()` **dentro de** la transacción de
  la acción, de modo que número y cambio de estado se confirman juntos o ninguno.
  **RF-7, RNF-3.**
- Todas las guardas son handlers `before` del servicio, no anotaciones de UI ni
  validaciones de cliente: una llamada directa a la API pasa por ellas. **RNF-4.**

---

## 7. Dependencias y su justificación

El principio 1 exige justificar cada una. Estas son todas las que habrá — **siete
desde T-06**, no seis como decía la primera redacción:

| Paquete | Ámbito | Justificación |
|---|---|---|
| `@sap/cds` | runtime | El framework. No es una adición. |
| `@cap-js-community/odata-v2-adapter` | runtime | **Sin él no hay OData V2.** CAP Node sirve V4; la spec y `AGENTS.md` fijan V2 como contrato. Ver D-1. |
| `express` | runtime | Peer del adaptador, necesario para montar el middleware en `server.js`. |
| `@cap-js/hana` | runtime | Driver de la base de datos de destino (HDI). |
| `@cap-js/sqlite` | dev | Base en memoria para los tests; permite que `cds-deploy` reconstruya desde cero en cada suite (constitución 5). |
| `@cap-js/cds-test` | dev | **Añadida en T-06.** `cds.test` dejó de venir dentro de `@sap/cds` en CAP 9 y vive en este paquete, que no es dependencia suya. Sin él no hay forma razonable de arrancar el servicio en proceso: se verificó que hacerlo a mano deja el adaptador V2 devolviendo 404. Constitución 4 exige test de integración contra OData V2, así que el arranque no es opcional. Solo `dev`: no llega a producción. |
| `jest` | dev | Único framework de test permitido por `AGENTS.md`. |

No se añade ORM, ni validador (Joi/Zod), ni logger, ni utilidades: las reglas son
funciones planas sobre objetos planos.

---

## 8. Estrategia de tests

Constitución 4: cada módulo de lógica con test unitario y cada entidad expuesta
con test de integración contra OData V2, CRUD más un caso de error.

### 8.1 Unitarios — `test/unit/`

Sin `cds`, sin base de datos, sin servidor. Un fichero por módulo de `lib/`.
Son los que cubren la combinatoria de estados, que es donde está el riesgo real.

| Fichero | Qué comprueba | RF |
|---|---|---|
| `lifecycle.test.js` | las 9 combinaciones de transición: las 2 válidas y las 7 que no, incluidos los retrocesos y `LIBERADA → *` | RF-13, RF-16, RF-20 |
| `request-rules.test.js` | permisos por estado en tabla: editar, borrar, registrar, liberar, cambiar transportista × 3 estados | RF-4, RF-6, RF-11, RF-15, RF-17, RF-19, RF-43, RF-44 |
| `item-rules.test.js` | completitud con cada campo ausente; cantidad 0, negativa y positiva; duplicado de material; `nextItemNo` desde 0, 10 y 30; borrado de la última según estado | RF-12, RF-22, RF-23, RF-26, RF-27, RF-31, RF-32 |
| `carrier-rules.test.js` | obligatorios presentes y ausentes; detección de cambio de código | RF-35, RF-37 |
| `number-range.test.js` | primer valor 1000000; incremento; monotonía | RF-8 |

### 8.2 Integración — `test/integration/`

`cds.test` levanta el servicio con SQLite en memoria y el adaptador V2 montado;
las llamadas van por HTTP contra `/odata/v2/supply`, no contra la API de Node. Cada
suite despliega el esquema desde cero, lo que verifica de paso el principio 5.

| Fichero | Recorrido | RF |
|---|---|---|
| `supply-requests.test.js` | CRUD de cabecera: crear (nace BORRADOR sin número), leer con `$expand`, listar, filtrar por los tres criterios, editar descripción, borrar borrador. **Error:** borrar una REGISTRADA → 409 en español | RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-46, RF-47, RF-48 |
| `supply-items.test.js` | CRUD de posiciones por navegación: alta (llega con `itemNo` 10, 20, 30), modificación, borrado. **Errores:** cantidad 0, material duplicado, enviar `itemNo`, borrar la última de una REGISTRADA | RF-21, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33 |
| `carriers.test.js` | CRUD del catálogo: alta, lectura, modificación de nombre y contacto, baja de uno libre. **Errores:** código duplicado, intento de cambiar el código, borrar uno en uso | RF-34, RF-35, RF-36, RF-37, RF-38, RF-39, RF-41, RF-42 |
| `register.test.js` | registro correcto (asigna 1000000 y pasa a REGISTRADA); **errores:** sin posiciones, con posición incompleta, sobre una ya registrada | RF-7, RF-8, RF-11, RF-12, RF-13 |
| `release.test.js` | liberación correcta; **errores:** sin transportista, sobre un BORRADOR, sobre una ya LIBERADA | RF-14, RF-15, RF-16 |
| `immutability.test.js` | sobre una LIBERADA: editar descripción, añadir/modificar/borrar posición, cambiar y quitar transportista — seis rechazos, y relectura que confirma que nada cambió | RF-17, RF-18, RF-19, RF-50 |
| `numbering.test.js` | dos registros seguidos dan 1000000 y 1000001; borrar la posición más alta y crear otra **no** reutiliza su número; huecos tras borrar la intermedia | RF-9, RF-10, RF-23, RF-24 |
| `carrier-reference.test.js` | asignar transportista inexistente → rechazo; cambiar el nombre del transportista y comprobar que una solicitud **LIBERADA** muestra el nombre nuevo | RF-40, RF-45 |
| `messages.test.js` | recorre los rechazos anteriores comprobando que el cuerpo V2 trae `error.message.value` en español y un `error.code` estable | RF-49, RNF-1 |
| `odata-v2.test.js` | el endpoint V2 responde con `DataServiceVersion: 2.0` y envoltorio `{d:{results}}`; una escritura vuelve con `__metadata` y clave V2; `Decimal` llega como cadena; `$inlinecount` funciona | — |

> **Limitación medida en T-06 (2026-09-18).** La ruta `$metadata` del adaptador
> **falla dentro de `cds.test`**: entrega un valor que no es cadena a
> `res.write` y responde 500. Bajo `cds-serve` funciona y devuelve EDMX v2
> correcto, así que afecta solo al entorno en proceso, y solo a `$metadata`:
> todas las peticiones de datos V2 funcionan. El test queda marcado como
> `test.failing`, de modo que avisará cuando el adaptador lo arregle. Lo que
> `$metadata` demostraría está cubierto en `test/unit/service-model.test.js`
> contra el EDMX compilado.

### 8.3 Concurrencia

`numbering.test.js` incluye un caso que lanza dos registros en paralelo con
`Promise.all` sobre solicitudes distintas y comprueba que los números son
distintos. Con SQLite las transacciones se serializan, así que el test verifica
la lógica, no el aislamiento de HANA; queda anotado como tal en el propio test
para no dar una falsa sensación de cobertura. **RNF-3.**

### 8.4 Comprobación de la constitución

`npm run check:lines` — script de una línea, sin dependencias, que falla si algún
fichero de `srv/` supera las 100 líneas. Se encadena en `npm test` para que el
principio 3 sea verificable de forma automática y no por revisión visual.

---

## 9. Cobertura: cada RF y dónde se cumple

| RF | Dónde | Test |
|---|---|---|
| RF-1 | `schema.cds`: `cuid` + `default #DRAFT` | `supply-requests` |
| RF-2 | `schema.cds` + proyección `excluding lastItemNo` | `supply-requests` |
| RF-3 | `description` sin `@mandatory` | `supply-requests` |
| RF-4 | `request-guards` ← `request-rules.canEditHeader` | `supply-requests`, unit |
| RF-5 | `Composition` (cascada) + `request-guards` | `supply-requests` |
| RF-6 | `request-guards` ← `request-rules.canDelete` | `supply-requests`, unit |
| RF-7 | `request-lifecycle.register` | `register` |
| RF-8 | `number-range` + `NumberRanges` | `register`, unit |
| RF-9 | `forUpdate()` en el registro | `numbering` |
| RF-10 | contador monótono; el BORRADOR no tiene número | `numbering` |
| RF-11 | `request-rules.canRegister` | `register`, unit |
| RF-12 | `item-rules.firstIncomplete` | `register`, unit |
| RF-13 | `lifecycle.canTransition` | `register`, unit |
| RF-14 | `request-lifecycle.release` | `release` |
| RF-15 | `request-rules.canRelease` | `release`, unit |
| RF-16 | `lifecycle.canTransition` | `release`, unit |
| RF-17 | `request-guards` (UPDATE) | `immutability` |
| RF-18 | `item-guards` (CREATE/UPDATE/DELETE) | `immutability` |
| RF-19 | `request-guards` (campo `carrier_code`) | `immutability` |
| RF-20 | `lifecycle` tabla de transiciones | unit |
| RF-21 | `schema.cds`: `SupplyRequestItems` | `supply-items` |
| RF-22 | `item-rules.isComplete` | unit |
| RF-23 | `item-rules.nextItemNo` + `lastItemNo` | `supply-items`, `numbering` |
| RF-24 | `lastItemNo` monótono (D-4) | `numbering` |
| RF-25 | `item-guards` rechaza `itemNo` en el cuerpo | `supply-items` |
| RF-26 | `item-rules.checkQuantity` | `supply-items`, unit |
| RF-27 | `item-rules.findDuplicateMaterial` | `supply-items`, unit |
| RF-28 | `item-guards` ← `lifecycle.isEditable` | `supply-items` |
| RF-29 | `item-guards` ← `lifecycle.isEditable` | `supply-items` |
| RF-30 | sin campo de anulación; DELETE físico | `supply-items` |
| RF-31 | `item-rules.canDeleteItem` | `supply-items`, unit |
| RF-32 | `item-rules.canDeleteItem` | `supply-items`, unit |
| RF-33 | `Composition` + alta solo por navegación | `supply-items` |
| RF-34 | `schema.cds`: `Carriers` | `carriers` |
| RF-35 | `@mandatory` en `code` y `name` | `carriers` |
| RF-36 | `carrier-guards` (CREATE) + clave primaria | `carriers` |
| RF-37 | `code` es clave (D-5) + `carrier-guards` | `carriers`, unit |
| RF-38 | proyección `Carriers` | `carriers` |
| RF-39 | `carrier-guards` (UPDATE) | `carriers` |
| RF-40 | `Association` sin copia + `$expand` | `carrier-reference` |
| RF-41 | `carrier-guards` (DELETE) | `carriers` |
| RF-42 | `carrier-guards` cuenta referencias | `carriers` |
| RF-43 | `request-guards` ← `request-rules.canChangeCarrier` | `supply-requests`, unit |
| RF-44 | `request-guards` admite `carrier_code = null` | `supply-requests`, unit |
| RF-45 | `@assert.target` | `carrier-reference` |
| RF-46 | proyección + `$expand` | `supply-requests` |
| RF-47 | proyección (GET colección) | `supply-requests` |
| RF-48 | `$filter` sobre `requestNo`, `status`, `carrier_code` | `supply-requests` |
| RF-49 | `_i18n/messages.properties` + `lib/messages.js` | `messages` |
| RF-50 | transacción de CAP; `req.error` antes del commit | `immutability` |
| RNF-1 | `_i18n` con español por defecto | `messages` |
| RNF-2 | transacción por petición | `immutability` |
| RNF-3 | `forUpdate()` en el contador | `numbering` |
| RNF-4 | todas las guardas son handlers `before` | toda la suite de integración |

---

## 10. Orden de implementación

Cada paso deja `npm test` en verde antes de pasar al siguiente.

1. **Andamiaje.** `package.json`, `server.js` con el adaptador V2, `db/schema.cds`
   y `srv/supply-service.cds` vacío de lógica. Test: `$metadata` responde EDMX 2.0.
2. **Catálogo de transportistas.** Entidad, guardas y `carriers.test.js`
   completo. Es la pieza independiente: no depende de nada.
3. **Cabecera y ciclo de vida.** `lifecycle.js`, `request-rules.js`, guardas de
   cabecera, `supply-requests.test.js`. Sin acciones todavía.
4. **Posiciones.** `item-rules.js`, guardas, numeración con `lastItemNo`,
   `supply-items.test.js` y `numbering.test.js`.
5. **Registro.** `number-range.js`, `NumberRanges`, acción `register`.
6. **Liberación e inmutabilidad.** Acción `release` y `immutability.test.js`.
7. **Consulta, mensajes y cierre.** Filtros, `_i18n` completo,
   `check:lines` encadenado en `npm test`.

---

## 11. Riesgos conocidos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El adaptador V2 traduce parcialmente algún constructo (`$expand` anidado, formato de error) | El contrato de salida no es el esperado | Paso 1 del orden de implementación: `odata-v2.test.js` lo verifica antes de escribir lógica, cuando cambiar de enfoque aún es barato |
| `forUpdate()` se comporta distinto en SQLite y en HANA | La concurrencia solo está probada de verdad en desarrollo | El test de concurrencia se documenta como parcial (§8.3); la validación real es en el primer despliegue a HDI |
| Las guardas de posición necesitan leer el estado del padre en cada operación | Una lectura extra por petición | Aceptado: no hay requisito de rendimiento (fuera de alcance en la spec) |
| `@assert.target` podría no cubrir el caso de asignación por `MERGE` | RF-45 sin cumplir en una vía | `carrier-reference.test.js` prueba la asignación por `MERGE`, que es la vía real del servicio |

---

## 12. Fuera de este plan

No se planifica nada que la spec sitúe fuera de alcance: bloqueo en exclusiva,
anulación o reapertura, baja lógica de transportistas, copia histórica de sus
datos, roles y permisos, auditoría, notificaciones, umbrales de rendimiento,
interfaz de usuario. Tampoco se planifica el despliegue a HDI más allá de elegir
el driver: el `mta.yaml` y la configuración de HDI son trabajo posterior.

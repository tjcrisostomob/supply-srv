# Tareas 001 — Solicitudes de abastecimiento (MVP)

Desglose ejecutable de [plan.md](plan.md) contra [spec.md](spec.md). Cada tarea
cabe en 20-30 minutos, está en orden de dependencia y trae una condición de
cierre comprobable. Nada se da por hecho hasta que su línea **Hecho cuando**
pasa.

**Regla de avance:** `npm test` queda en verde al terminar cada tarea. Si una
tarea no puede cerrarse sin romper otra cosa, es que está mal cortada: pártela.

---

## Fase 0 — Andamiaje

### - [x] T-01 · `package.json` y guiones

**Depende de:** nada · **Cubre:** constitución 1

- Declarar las seis dependencias de §7 del plan y ninguna más.
- Guiones: `start` (`cds-serve`), `test` (`jest`), `deploy` (`cds-deploy`).
- Namespace `supply`, Node 20+.

**Hecho cuando:** `npm install` termina sin errores y `npm test` falla con
«no tests found», no con ENOENT.

**Cerrada el 2026-09-18.** `npm install` añade 430 paquetes sin vulnerabilidades
y `npm test` pasa 6 de 6. Se cierra por encima de la condición escrita: en vez de
dejar la suite vacía, `test/unit/package-manifest.test.js` fija el conjunto de
dependencias permitidas, de modo que el principio 1 deja de depender de la
revisión visual del PR. Versiones instaladas: `@sap/cds@9.9.3`,
`@cap-js-community/odata-v2-adapter@1.16.1`, `express@4.22.3`,
`@cap-js/hana@2.8.3`, `@cap-js/sqlite@2.4.3`, `jest@30.5.2`.

El namespace `supply` no se declara aquí: en CAP vive en `db/schema.cds`, y lo
fija T-03.

---

### - [x] T-02 · Adaptador OData V2

**Depende de:** T-01 · **Cubre:** D-1 del plan

- Montar `@cap-js-community/odata-v2-adapter` sobre el servidor de CAP.
- Dejar V4 accesible en `/supply` para depurar; V2 en `/odata/v2/supply`.

**Hecho cuando:** `cds-serve` arranca y `GET /odata/v2/supply/$metadata` devuelve 200
con `DataServiceVersion: 2.0` en la cabecera.

**Cerrada el 2026-09-18, sin escribir `server.js`.** La tarea se titulaba
«`server.js` con el adaptador» y esa premisa era falsa: el adaptador trae
`cds-plugin.js` y CAP lo descubre solo al arrancar. Un `server.js` que repitiera
ese montaje sería código muerto, así que el proyecto no lo tiene y
`test/unit/odata-v2-adapter.test.js` fija esa ausencia como decisión.

**Rutas reales, medidas con una sonda desechable** (un `.cds` mínimo fuera del
proyecto, para no adelantar T-03):

| Ruta | Resultado |
|---|---|
| `GET /odata/v2/supply/$metadata` | **200**, `dataserviceversion: 2.0`, EDMX v2 |
| `GET /supply/$metadata` | 200, EDMX `Version="4.0"` |
| `GET /v2/supply/$metadata` | **404** — era la ruta que decía el plan |

La condición «Hecho cuando» quedó verificada así, a mano. Su versión automática
llega en T-06, que es la primera tarea con modelo propio contra el que arrancar
`cds.test`.

**Corregido de paso, fuera del alcance nominal de T-02:** el guion `deploy` de
T-01 decía `cds deploy`, un binario que no existe — `@sap/cds` solo publica
`cds-serve` y `cds-deploy`; la CLI `cds` vive en `@sap/cds-dk`, que no está entre
las seis dependencias justificadas. Ahora es `cds-deploy`, y un test nuevo
comprueba que todo guion apunte a un binario instalado.

---

### - [x] T-03 · `db/schema.cds`

**Depende de:** T-01 · **Cubre:** RF-2, RF-3, RF-21, RF-30, RF-33, RF-34

- Las cuatro entidades de §3 del plan: `SupplyRequests`, `SupplyRequestItems`,
  `Carriers`, `NumberRanges`, más el tipo `RequestStatus`.
- `carrier` como asociación con `@assert.target`; `items` como composición.
- `lastItemNo` con valor por defecto 0.
- **Sin** campo de anulación en las posiciones (RF-30) y **sin** los campos que
  la spec deja fuera de alcance.

**Hecho cuando:** `cds compile db/schema.cds` no da avisos y `cds-deploy` crea la
base SQLite desde cero.

**Cerrada el 2026-09-18.** Ambas mitades verificadas: el compilador devuelve
**0 mensajes** y genera las cuatro tablas, y el despliegue a SQLite en memoria
funciona desde el modelo solo. `npm test` pasa 32 de 32, 21 de ellos nuevos en
`test/unit/schema.test.js`.

La condición se comprobó **desde el test**, no desde la CLI: `cds compile` no
existe como binario —igual que pasó con `cds deploy` en T-02—, así que el test
usa `cds.load`, `cds.compile.to.sql` y `cds.deploy`. Queda mejor cubierto que con
el comando, porque la comprobación se repite en cada `npm test`.

Los tests fijan lo que la spec **no** permite: sin marca de anulación en ninguna
entidad (RF-30), sin solicitante, fecha de necesidad ni centro en la cabecera, y
sin copia histórica del transportista. Un campo fuera de alcance rompe la suite.

DDL generado, como comprobación de que las decisiones del plan llegaron a la base:

```sql
status     NVARCHAR(10) DEFAULT 'BORRADOR'   -- D-7: valor en español
lastItemNo INTEGER      DEFAULT 0            -- D-4: contador monótono
carrier_code NVARCHAR(10)                    -- D-5: la clave es el código
```

---

### - [x] T-04 · `srv/supply-service.cds` y handler vacío

**Depende de:** T-03 · **Cubre:** RF-2, RF-38, RF-46, RF-47

- Proyecciones de las tres entidades expuestas; `NumberRanges` **no** se proyecta.
- `excluding { lastItemNo }` en `SupplyRequests`.
- Declarar las acciones `register` y `release` sin implementarlas.
- `srv/supply-service.js` solo con el esqueleto de registro de handlers.

**Hecho cuando:** `$metadata` lista `SupplyRequests`, `SupplyRequestItems` y
`Carriers`, no lista `NumberRanges` y no contiene `lastItemNo`.

**Cerrada el 2026-09-18.** `npm test` pasa 44 de 44, 12 nuevos en
`test/unit/service-model.test.js`. La condición se verificó dos veces: en el test
sobre el EDMX compilado, y a mano contra el `$metadata` V2 real servido por
`cds-serve`, que lista los tres `EntitySet` y devuelve **cero** coincidencias de
`NumberRanges` y de `lastItemNo`.

**Segunda corrección al plan en dos tareas.** Las acciones en V2 llevan el nombre
de la entidad por delante: `SupplyRequests_register`, no `register`. La URL que
daba el plan devuelve **404**; la real responde **501 «no handler»**, que es el
estado correcto aquí, con la acción declarada y sin implementar (llega en T-27 y
T-30). Corregido en §4 del plan, con el `FunctionImport` real como evidencia.

**`srv/supply-service.js` sí se creó**, a diferencia del `server.js` de T-02.
La diferencia: aquel habría duplicado lo que el framework ya hace, mientras que
este es el punto de enganche que CAP resuelve **por convención de nombre**, y el
test lo comprueba. Si el fichero se llamara mal, no fallaría nada de forma
ruidosa: simplemente ninguna guarda posterior quedaría registrada. Verificado en
el arranque, donde `impl` pasa de `node_modules\@sap\cds\srv\app-service.js` a
`srv\supply-service.js`.

---

### - [x] T-05 · Mensajes: `_i18n` y `lib/messages.js`

**Depende de:** T-01 · **Cubre:** RF-49, RNF-1

- `_i18n/messages_es.properties` con las catorce claves de §5 del plan, en español.
- `_i18n/messages_en.properties` con las mismas claves en inglés.
- Redefinir los textos por defecto de CAP para `@mandatory` y `@assert.target`.
- `srv/lib/messages.js`: solo constantes de código, cero texto.

**Hecho cuando:** `grep` sobre `srv/` no encuentra ninguna cadena en español, y
las claves de `messages.js` coinciden una a una con las de ambos `.properties`.

**Cerrada el 2026-09-18.** `npm test` pasa 62 de 62, 18 nuevos en
`test/unit/messages.test.js`.

**Dos fallos silenciosos encontrados por los tests**, ambos del tipo que no
rompe nada visiblemente y deja el idioma equivocado en producción:

1. **`default_language` de CAP es `'en'`.** Con los bundles escritos y sin tocar
   configuración, *todo* resolvía a inglés, incluso pidiendo `es`. Corregido con
   `cds.i18n.default_language = 'es'` en `package.json`. Ahora cualquier idioma
   sin traducir cae a español, que es lo que pide RNF-1.
2. **Un `messages.properties` sin sufijo pierde** frente al
   `messages_es.properties` que trae CAP: las redefiniciones de
   `ASSERT_MANDATORY` y `ASSERT_TARGET` no llegaban a aplicarse y salía el texto
   de CAP. Por eso el bundle español lleva sufijo y **no existe fichero
   genérico** — dos ficheros, sin duplicación.

El test no se conforma con que la clave esté definida: comprueba que el valor que
**resuelve** CAP sea el nuestro. La primera versión solo miraba el fichero y
habría dado verde con el bug puesto.

También se comprobó que los `.properties` se leen como UTF-8, así que el español
va con tildes. Y un test impide que vuelva a aparecer texto en español bajo
`srv/`, o cualquier cadena entrecomillada larga que huela a mensaje.

---

### - [x] T-06 · Arranque de la suite de tests

**Depende de:** T-02, T-04 · **Cubre:** constitución 4

- Configurar Jest y un helper que levante `cds.test` con SQLite en memoria y el
  adaptador V2 montado.
- Primer test (`test/integration/odata-v2.test.js`): el endpoint V2 responde por
  HTTP en formato V2.

**Hecho cuando:** `npm test` pasa con un test verde que hace una llamada HTTP real
a `/odata/v2/supply`.

**Cerrada el 2026-09-18.** `npm test` pasa 72 de 72, 10 nuevos en
`test/integration/odata-v2.test.js`, el primer fichero que va por HTTP.

**Séptima dependencia, decidida contigo.** `cds.test` dejó de venir dentro de
`@sap/cds` en CAP 9: vive en `@cap-js/cds-test`, que no estaba instalado. El plan
mandaba usarlo sin haberlo incluido entre las seis dependencias, así que se
contradecía. Antes de proponerlo se verificó que la alternativa sin dependencia
no era viable: arrancar CAP en proceso a mano sirve V4 en 200 pero deja el
adaptador V2 en **404**, con puerto fijo y con puerto aleatorio. Añadida como
`devDependency` y justificada en §7 del plan.

**La condición de cierre cambió, porque `$metadata` no funciona aquí.** La ruta
`$metadata` del adaptador falla dentro de `cds.test` —entrega a `res.write` algo
que no es cadena y responde 500— mientras que bajo `cds-serve` devuelve EDMX v2
correcto. Se descartaron como causa el idioma por defecto de T-05 y los tres
modos de `cacheMetadata`. Afecta **solo** a `$metadata`: todas las peticiones de
datos V2 funcionan.

El test queda como `test.failing`, no como `skip`: así avisará el día que el
adaptador lo arregle y haya que borrarlo. Lo que `$metadata` demostraría ya está
cubierto en `test/unit/service-model.test.js` contra el EDMX compilado.

En su lugar el arranque se demuestra con algo más fuerte: el envoltorio V2. Un
`GET` devuelve `{d:{results:[]}}` —V4 devolvería `{value:[]}`— y un `POST`
devuelve 201 con `__metadata.type` y la uri `Carriers('TR-01')`, sintaxis de
clave V2. Eso prueba que el adaptador **traduce**, no que solo enruta.

---

### - [ ] T-07 · Guardián de las 100 líneas

**Depende de:** T-01 · **Cubre:** constitución 3

- Guion `check:lines` sin dependencias que falle si algún fichero de `srv/`
  supera las 100 líneas.
- Encadenarlo en `npm test`.

**Hecho cuando:** `npm run check:lines` sale con código 0, y sale con código 1 si
se le añaden 101 líneas a un fichero de prueba.

---

## Fase 1 — Catálogo de transportistas

Se hace primero porque no depende de nada más y las solicitudes sí dependen de él.

### - [ ] T-08 · `lib/carrier-rules.js` y su test unitario

**Depende de:** T-05 · **Cubre:** RF-35, RF-37

- `requiredFields(carrier)` devuelve qué falta de código y nombre.
- `isCodeChange(before, after)` detecta el intento de cambiar el código.
- Módulo puro: no importa `cds`.

**Hecho cuando:** `test/unit/carrier-rules.test.js` cubre alta sin código, sin
nombre, completa, y cambio de código detectado y no detectado. Los cuatro verdes.

---

### - [ ] T-09 · Guardas de alta y modificación de transportista

**Depende de:** T-08 · **Cubre:** RF-36, RF-37, RF-39

- `before CREATE`: rechazar si el código ya existe (`CARRIER_DUPLICATED`).
- `before UPDATE`: rechazar el cambio de código (`CARRIER_CODE_FIXED`);
  permitir nombre, teléfono y correo.

**Hecho cuando:** `POST` de un código repetido devuelve 409 con el mensaje en
español, y `MERGE` que cambia el código devuelve 400 mientras el que cambia solo
el nombre devuelve 204.

---

### - [ ] T-10 · Guarda de baja de transportista

**Depende de:** T-09 · **Cubre:** RF-41, RF-42

- `before DELETE`: contar solicitudes que lo referencian.
- Si hay al menos una, rechazar con `CARRIER_IN_USE` indicando cuántas.

**Hecho cuando:** borrar un transportista libre devuelve 204 y borrar uno
asignado devuelve 409 con el recuento dentro del mensaje.

---

### - [ ] T-11 · Test de integración del catálogo

**Depende de:** T-10 · **Cubre:** RF-34, RF-35, RF-36, RF-37, RF-38, RF-39, RF-41, RF-42

- `test/integration/carriers.test.js`: alta, lectura, listado, modificación de
  nombre y contacto, baja de uno libre.
- Errores: código duplicado, código obligatorio ausente, cambio de código, baja
  de uno en uso.

**Hecho cuando:** la entidad `Carriers` tiene CRUD completo y cuatro casos de
error verdes contra `/odata/v2/supply/Carriers`.

---

## Fase 2 — Cabecera y ciclo de vida

### - [ ] T-12 · `lib/lifecycle.js` y su test unitario

**Depende de:** T-05 · **Cubre:** RF-13, RF-16, RF-20

- Tabla de transiciones con las dos únicas válidas.
- `canTransition(from, to)`, `isEditable(status)`, `isFinal(status)`.

**Hecho cuando:** `test/unit/lifecycle.test.js` recorre las nueve combinaciones
de origen y destino: dos permitidas, siete rechazadas, incluidos los retrocesos.

---

### - [ ] T-13 · `lib/request-rules.js` y su test unitario

**Depende de:** T-12 · **Cubre:** RF-4, RF-6, RF-11, RF-15, RF-17, RF-19, RF-43, RF-44

- `canEditHeader`, `canDelete`, `canRegister`, `canRelease`, `canChangeCarrier`.
- Cada una pregunta a `lifecycle`, no compara cadenas por su cuenta.

**Hecho cuando:** el test unitario prueba las cinco funciones contra los tres
estados en forma de tabla, quince casos, todos verdes.

---

### - [ ] T-14 · Guarda de modificación de cabecera

**Depende de:** T-13 · **Cubre:** RF-4, RF-17, RF-19, RF-43, RF-44, RF-45

- `before UPDATE` de `SupplyRequests`: rechazar cualquier cambio si está LIBERADA
  (`RELEASED_IMMUTABLE`).
- Permitir descripción y transportista —asignar, sustituir y dejar a nulo—
  mientras sea BORRADOR o REGISTRADA.
- Rechazar los intentos de fijar `status` o `requestNo` desde el cliente.

**Hecho cuando:** sobre una REGISTRADA, `MERGE` de descripción y de
`carrier_code` (con valor y con `null`) devuelven 204; sobre una LIBERADA, 409.

---

### - [ ] T-15 · Guarda de borrado de solicitud

**Depende de:** T-13 · **Cubre:** RF-5, RF-6

- `before DELETE`: solo BORRADOR; en otro caso `DELETE_ONLY_DRAFT`.
- Confirmar que la composición borra las posiciones en cascada.

**Hecho cuando:** borrar un BORRADOR con dos posiciones devuelve 204 y deja cero
posiciones en la base; borrar una REGISTRADA devuelve 409 y no borra nada.

---

### - [ ] T-16 · Test de integración de la cabecera

**Depende de:** T-15 · **Cubre:** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6

- Crear sin descripción y comprobar que nace BORRADOR, con UUID y **sin** número.
- Editar descripción, borrar borrador.
- Error: borrar una REGISTRADA.

**Hecho cuando:** `test/integration/supply-requests.test.js` verde, incluida la
aserción de que `requestNo` viene nulo tras crear.

---

### - [ ] T-17 · Consulta: lectura, listado y filtros

**Depende de:** T-16 · **Cubre:** RF-46, RF-47, RF-48

- Lectura de una solicitud con `$expand=items,carrier`.
- Listado con `$inlinecount=allpages`.
- Los tres filtros: `requestNo`, `status` y `carrier_code`.

**Hecho cuando:** cinco aserciones verdes, una por operación, y el `$expand`
devuelve posiciones y transportista anidados en formato V2.

---

## Fase 3 — Posiciones

### - [ ] T-18 · `lib/item-rules.js`: completitud y cantidad

**Depende de:** T-05 · **Cubre:** RF-22, RF-26

- `isComplete(item)` y `firstIncomplete(items)` devolviendo el `itemNo`.
- `checkQuantity(quantity)` rechazando cero y negativos.

**Hecho cuando:** el test unitario cubre la ausencia de cada uno de los tres
campos por separado, y las cantidades -1, 0 y 0,001.

---

### - [ ] T-19 · `lib/item-rules.js`: material duplicado

**Depende de:** T-18 · **Cubre:** RF-27

- `findDuplicateMaterial(items, candidate)` devuelve el material repetido o nulo.
- Debe ignorar la propia posición al modificarla, o modificar una posición sin
  tocar su material fallaría contra sí misma.

**Hecho cuando:** el test unitario cubre alta duplicada, alta no duplicada, y
modificación de una posición conservando su material sin falso positivo.

---

### - [ ] T-20 · `lib/item-rules.js`: numeración y borrado

**Depende de:** T-19 · **Cubre:** RF-23, RF-31, RF-32

- `nextItemNo(lastItemNo)` → 10, 20, 30…
- `canDeleteItem(status, itemCount)`: libre en BORRADOR, prohibido en REGISTRADA
  cuando queda una sola.

**Hecho cuando:** el test unitario prueba `nextItemNo` desde 0, 10 y 30, y
`canDeleteItem` en las seis combinaciones de estado y recuento 1 o más.

---

### - [ ] T-21 · Guarda de alta de posición

**Depende de:** T-20 · **Cubre:** RF-18, RF-23, RF-25, RF-26, RF-27, RF-28

- Rechazar si la solicitud está LIBERADA.
- Rechazar si el cuerpo trae `itemNo` (`ITEM_NO_READONLY`).
- Asignar `itemNo` desde `lastItemNo` e incrementarlo en la misma transacción.
- Aplicar cantidad y material duplicado.

**Hecho cuando:** tres altas seguidas reciben 10, 20 y 30; enviar `itemNo`,
cantidad 0 o material repetido devuelven 400 en español.

---

### - [ ] T-22 · Guarda de modificación de posición

**Depende de:** T-21 · **Cubre:** RF-18, RF-25, RF-26, RF-27, RF-29

- Rechazar si la solicitud está LIBERADA o si se intenta tocar `itemNo`.
- Permitir material, cantidad y unidad con las mismas validaciones del alta.

**Hecho cuando:** cambiar la cantidad de una posición de una REGISTRADA devuelve
204, y cambiar su `itemNo` devuelve 400.

---

### - [ ] T-23 · Guarda de borrado de posición

**Depende de:** T-22 · **Cubre:** RF-18, RF-30, RF-31, RF-32

- Leer el estado de la cabecera y el número de posiciones vivas.
- Rechazar en LIBERADA, y en REGISTRADA cuando sea la última
  (`ITEM_LAST_ON_REG`).
- Borrado físico, sin marca.

**Hecho cuando:** borrar la única posición de un BORRADOR devuelve 204; la de una
REGISTRADA devuelve 409; la base no conserva ninguna fila de la borrada.

---

### - [ ] T-24 · Test de integración de posiciones

**Depende de:** T-23 · **Cubre:** RF-21, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33

- CRUD por navegación: `POST` sobre `SupplyRequests(guid'…')/items`.
- Los cuatro errores: `itemNo` enviado, cantidad 0, material duplicado, última
  posición de una REGISTRADA.

**Hecho cuando:** `test/integration/supply-items.test.js` verde, con `quantity`
comparada como cadena (particularidad 2 de §4 del plan).

---

### - [ ] T-25 · Test de numeración de posiciones

**Depende de:** T-24 · **Cubre:** RF-23, RF-24

- Crear 10, 20, 30; borrar la 20; comprobar que la siguiente es 40.
- **Borrar la 30 (la más alta) y comprobar que la siguiente no vuelve a ser 30.**

**Hecho cuando:** ambos casos verdes. El segundo es el que justifica `lastItemNo`
frente a `max(itemNo)`; sin él, RF-24 no está probado.

---

## Fase 4 — Registro

### - [ ] T-26 · `lib/number-range.js` y su test unitario

**Depende de:** T-05 · **Cubre:** RF-8

- `nextRequestNo(current)` puro: sin valor previo devuelve 1000000; con valor,
  el siguiente.

**Hecho cuando:** el test unitario prueba el primer número, el incremento y que
la función nunca devuelve un valor menor o igual al recibido.

---

### - [ ] T-27 · Acción `register`

**Depende de:** T-26, T-20, T-13 · **Cubre:** RF-7, RF-9, RF-11, RF-12, RF-13, RF-50

- Validar estado, al menos una posición y completitud de todas.
- Leer `NumberRanges` con `forUpdate()`, creándolo si no existe; asignar número y
  pasar a REGISTRADA en la misma transacción.

**Hecho cuando:** registrar un borrador con una posición completa devuelve la
solicitud con `requestNo` 1000000 y estado REGISTRADA.

---

### - [ ] T-28 · Test de integración del registro

**Depende de:** T-27 · **Cubre:** RF-7, RF-11, RF-12, RF-13

- Camino correcto y los tres errores: sin posiciones, con posición incompleta,
  sobre una ya registrada.
- Comprobar que el error de posición incompleta **nombra el `itemNo`**.

**Hecho cuando:** `test/integration/register.test.js` verde, y tras un registro
fallido la solicitud sigue en BORRADOR y sin número.

---

### - [ ] T-29 · Test de numeración de solicitudes

**Depende de:** T-28 · **Cubre:** RF-8, RF-9, RF-10, RNF-3

- Dos registros consecutivos dan 1000000 y 1000001.
- Dos registros en paralelo con `Promise.all` dan números distintos.
- Borrar un borrador y registrar otro no reutiliza ningún número.

**Hecho cuando:** los tres casos verdes, con el de concurrencia comentado en el
propio fichero como cobertura parcial (SQLite serializa; HANA se valida en el
primer despliegue).

---

## Fase 5 — Liberación e inmutabilidad

### - [ ] T-30 · Acción `release`

**Depende de:** T-27 · **Cubre:** RF-14, RF-15, RF-16

- Validar estado REGISTRADA y transportista asignado.
- Pasar a LIBERADA.

**Hecho cuando:** liberar una REGISTRADA con transportista devuelve estado
LIBERADA; sin transportista devuelve 409 y la deja en REGISTRADA.

---

### - [ ] T-31 · Test de integración de la liberación

**Depende de:** T-30 · **Cubre:** RF-14, RF-15, RF-16

- Camino correcto y tres errores: sin transportista, sobre un BORRADOR, sobre una
  ya LIBERADA.

**Hecho cuando:** `test/integration/release.test.js` verde y el mensaje de error
sobre un BORRADOR menciona el estado en que está.

---

### - [ ] T-32 · Test de inmutabilidad

**Depende de:** T-31 · **Cubre:** RF-17, RF-18, RF-19, RF-20, RF-50, RNF-2

- Sobre una LIBERADA, seis intentos: editar descripción, añadir posición,
  modificar posición, borrar posición, cambiar transportista, quitar
  transportista.
- Releer después y comprobar que **nada** cambió.

**Hecho cuando:** los seis devuelven error y la relectura coincide campo a campo
con el estado previo a los intentos.

---

## Fase 6 — Cierre

### - [ ] T-33 · Test de la referencia al transportista

**Depende de:** T-32 · **Cubre:** RF-40, RF-45

- Asignar un transportista inexistente → rechazo.
- Cambiar el nombre de un transportista y comprobar que una solicitud **LIBERADA**
  que lo referencia muestra el nombre nuevo.

**Hecho cuando:** ambos verdes. El segundo es el que demuestra que no se guardó
copia histórica, que es lo decidido en la spec.

---

### - [ ] T-34 · Test de mensajes

**Depende de:** T-33 · **Cubre:** RF-49, RNF-1

- Recorrer los rechazos ya implementados comprobando el formato de error V2:
  `error.code` estable y `error.message.value` en español.

**Hecho cuando:** un test recorre al menos ocho códigos distintos y ninguno
devuelve texto en inglés ni la clave sin resolver.

---

### - [ ] T-35 · Verificación contra la constitución y la spec

**Depende de:** T-34 · **Cubre:** RNF-4, criterios de finalización 1-5

- `npm test` en verde con `check:lines` encadenado.
- `cds-deploy` reconstruye desde cero y la suite vuelve a pasar.
- Recorrido manual del flujo principal de la spec, de crear a liberar.
- Repasar la matriz de §9 del plan y marcar cada RF con el test que lo cubre.

**Hecho cuando:** los 50 RF tienen al menos un test asociado, ningún fichero de
`srv/` supera 100 líneas y no queda ninguna cadena en español dentro de `srv/`.

---

### - [ ] T-36 · Documentación

**Depende de:** T-35 · **Cubre:** criterio de finalización 6

- README: sustituir «Ninguno de los dos funciona todavía» por los comandos
  reales, y actualizar la tabla de estado.
- CHANGELOG: entrada de la implementación bajo *No publicado*.

**Hecho cuando:** el README describe el mismo ciclo de vida que la spec y sus
comandos funcionan tal como están escritos.

---

## Cobertura

Cada RF aparece en al menos una tarea. Los que solo se cierran en un sitio, por
si se tiene la tentación de saltarse la tarea:

| RF | Única tarea que lo cierra |
|---|---|
| RF-10 | T-29 |
| RF-24 | T-25 |
| RF-33 | T-24 |
| RF-40 | T-33 |
| RF-48 | T-17 |
| RNF-3 | T-29 |

Las fases 0 a 2 dejan un servicio que ya sirve para algo: catálogo y borradores
editables. Si hay que parar antes de tiempo, el corte limpio es al final de la
fase 3; parar dentro de la 4 deja el registro a medias y las solicitudes sin
número.

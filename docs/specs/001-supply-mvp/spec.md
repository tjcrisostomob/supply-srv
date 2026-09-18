# Spec 001 — Solicitudes de abastecimiento (MVP)

## Contexto y objetivo

Hoy las solicitudes de abastecimiento se acuerdan de forma informal y no existe
un registro firme de qué se pidió, a quién y cuándo dejó de ser negociable.
Esta funcionalidad da a la solicitud un ciclo de vida explícito e irreversible
—BORRADOR, REGISTRADA, LIBERADA— que permite trabajarla mientras se está
decidiendo y la congela en el momento en que se cierra. El valor está en el
cierre: una vez liberada, la solicitud es prueba de lo pedido y nadie la puede
reescribir.

## Usuarios / actores

- **Solicitante.** Crea la solicitud, mantiene sus posiciones y la registra y
  libera. En este MVP no hay roles diferenciados: cualquier usuario del servicio
  puede ejecutar cualquier operación.
- **Responsable de datos maestros.** Da de alta y mantiene el catálogo de
  transportistas. Es el mismo usuario en la práctica; se distingue solo porque
  la operación es de naturaleza distinta.
- **Sistema consumidor.** Cualquier cliente que lee solicitudes ya liberadas
  para tratarlas aguas abajo.

## Historias de usuario

- **H1:** Como solicitante quiero crear una solicitud vacía y guardarla para
  poder ir completándola en varias sesiones sin que nada me lo impida.
- **H2:** Como solicitante quiero añadir, modificar y eliminar posiciones para
  ajustar lo que pido hasta el último momento.
- **H3:** Como solicitante quiero registrar la solicitud para que reciba un
  número de solicitud con el que referirme a ella fuera del sistema.
- **H4:** Como solicitante quiero seguir corrigiendo una solicitud ya registrada
  para no tener que empezar de cero cuando cambia un dato.
- **H5:** Como solicitante quiero asignar el transportista que se hará cargo del
  transporte para que quede constancia de quién lo mueve.
- **H6:** Como solicitante quiero liberar la solicitud para dejarla cerrada y
  que nadie, ni yo, pueda alterarla después.
- **H7:** Como solicitante quiero que el sistema me impida liberar algo
  incompleto para no cerrar en firme una solicitud inservible.
- **H8:** Como solicitante quiero encontrar una solicitud por su número, su
  estado o su transportista para no depender de haber guardado su enlace.
- **H9:** Como responsable de datos maestros quiero mantener el catálogo de
  transportistas para que las solicitudes se asignen a transportistas reales.
- **H10:** Como responsable de datos maestros quiero que el sistema me impida
  borrar un transportista en uso para no dejar huérfana una solicitud liberada.
- **H11:** Como responsable de datos maestros quiero corregir el nombre o el
  contacto de un transportista y que la corrección valga para todas las
  solicitudes, también las ya liberadas.
- **H12:** Como sistema consumidor quiero leer una solicitud liberada con la
  certeza de que su contenido ya no cambiará.

## Requisitos funcionales (criterios de aceptación en EARS)

### Creación y edición de la solicitud

- **RF-1:** CUANDO se cree una solicitud, EL SISTEMA la creará en estado
  BORRADOR con un identificador técnico único y sin número de solicitud.
- **RF-2:** EL SISTEMA guardará de cada solicitud únicamente su descripción, su
  estado, su número de solicitud y su transportista asignado.
- **RF-3:** EL SISTEMA admitirá que la descripción de una solicitud esté vacía,
  en cualquier estado.
- **RF-4:** MIENTRAS una solicitud esté en BORRADOR o en REGISTRADA, EL SISTEMA
  permitirá modificar su descripción.
- **RF-5:** MIENTRAS una solicitud esté en BORRADOR, EL SISTEMA permitirá
  eliminarla junto con todas sus posiciones.
- **RF-6:** SI se intenta eliminar una solicitud que no está en BORRADOR,
  ENTONCES EL SISTEMA rechazará la operación, no borrará nada e informará de que
  solo se pueden eliminar borradores.

### Registro

- **RF-7:** CUANDO se solicite registrar una solicitud en BORRADOR que tenga al
  menos una posición y todas sus posiciones completas, EL SISTEMA le asignará un
  número de solicitud y la pasará a REGISTRADA.
- **RF-8:** EL SISTEMA asignará como número de solicitud un valor mayor que
  cualquier número asignado anteriormente, siendo 1000000 el primero.
- **RF-9:** EL SISTEMA no asignará el mismo número de solicitud a dos solicitudes
  distintas, aunque la secuencia presente huecos.
- **RF-10:** EL SISTEMA no reutilizará el número de una solicitud eliminada.
- **RF-11:** SI se intenta registrar una solicitud sin ninguna posición, ENTONCES
  EL SISTEMA rechazará la operación, la dejará en BORRADOR e informará de que se
  requiere al menos una posición.
- **RF-12:** SI se intenta registrar una solicitud con alguna posición
  incompleta, ENTONCES EL SISTEMA rechazará la operación e indicará qué posición
  lo está.
- **RF-13:** SI se intenta registrar una solicitud que no está en BORRADOR,
  ENTONCES EL SISTEMA rechazará la operación e informará de que ya fue
  registrada.

### Liberación e inmutabilidad

- **RF-14:** CUANDO se solicite liberar una solicitud REGISTRADA que tenga
  transportista asignado, EL SISTEMA la pasará a LIBERADA.
- **RF-15:** SI se intenta liberar una solicitud sin transportista asignado,
  ENTONCES EL SISTEMA rechazará la operación, la dejará en REGISTRADA e
  informará de que falta el transportista.
- **RF-16:** SI se intenta liberar una solicitud que no está en REGISTRADA,
  ENTONCES EL SISTEMA rechazará la operación e informará del estado en que se
  encuentra.
- **RF-17:** MIENTRAS una solicitud esté LIBERADA, EL SISTEMA rechazará toda
  modificación de su descripción.
- **RF-18:** MIENTRAS una solicitud esté LIBERADA, EL SISTEMA rechazará el alta,
  la modificación y la eliminación de sus posiciones.
- **RF-19:** MIENTRAS una solicitud esté LIBERADA, EL SISTEMA rechazará cambiar o
  quitar su transportista.
- **RF-20:** EL SISTEMA no permitirá que una solicitud retroceda a un estado
  anterior.

### Posiciones

- **RF-21:** EL SISTEMA guardará de cada posición únicamente su número de
  posición, su material, su cantidad y su unidad de medida.
- **RF-22:** EL SISTEMA considerará completa una posición cuando su material, su
  cantidad y su unidad de medida tengan valor.
- **RF-23:** CUANDO se añada una posición, EL SISTEMA le asignará como número de
  posición el múltiplo de 10 siguiente al mayor ya usado en esa solicitud,
  siendo 10 el primero.
- **RF-24:** EL SISTEMA no reutilizará dentro de una solicitud el número de una
  posición eliminada.
- **RF-25:** SI se intenta fijar o modificar el número de una posición, ENTONCES
  EL SISTEMA rechazará la operación e informará de que lo asigna el sistema.
- **RF-26:** SI se intenta guardar una posición con cantidad menor o igual que
  cero, ENTONCES EL SISTEMA rechazará la operación, sea cual sea el estado de la
  solicitud.
- **RF-27:** SI se intenta guardar una posición cuyo material ya esté presente en
  otra posición de la misma solicitud, ENTONCES EL SISTEMA rechazará la operación
  e informará de que el material está duplicado.
- **RF-28:** MIENTRAS una solicitud esté en BORRADOR o en REGISTRADA, EL SISTEMA
  permitirá añadirle posiciones.
- **RF-29:** MIENTRAS una solicitud esté en BORRADOR o en REGISTRADA, EL SISTEMA
  permitirá modificar el material, la cantidad y la unidad de sus posiciones.
- **RF-30:** CUANDO se elimine una posición, EL SISTEMA la borrará de forma
  definitiva, sin conservar marca de eliminación ni copia.
- **RF-31:** MIENTRAS una solicitud esté en BORRADOR, EL SISTEMA permitirá
  eliminar cualquiera de sus posiciones, incluida la última.
- **RF-32:** MIENTRAS una solicitud REGISTRADA tenga una única posición, EL
  SISTEMA rechazará la eliminación de esa posición e informará de que la
  solicitud debe conservar al menos una.
- **RF-33:** EL SISTEMA expondrá cada posición únicamente como parte de su
  solicitud, de modo que no exista ninguna posición sin solicitud.

### Transportistas

- **RF-34:** EL SISTEMA guardará de cada transportista un código, un nombre, un
  teléfono y una dirección de correo electrónico.
- **RF-35:** EL SISTEMA exigirá código y nombre para dar de alta un
  transportista, y admitirá vacíos el teléfono y el correo electrónico.
- **RF-36:** SI se intenta dar de alta un transportista con un código que ya
  existe en el catálogo, ENTONCES EL SISTEMA rechazará la operación e informará
  del conflicto.
- **RF-37:** SI se intenta modificar el código de un transportista existente,
  ENTONCES EL SISTEMA rechazará la operación.
- **RF-38:** EL SISTEMA permitirá consultar el catálogo de transportistas.
- **RF-39:** EL SISTEMA permitirá modificar el nombre, el teléfono y el correo
  electrónico de un transportista existente.
- **RF-40:** CUANDO se modifiquen los datos de un transportista, EL SISTEMA los
  mostrará actualizados en todas las solicitudes que lo referencian, incluidas
  las LIBERADAS.
- **RF-41:** EL SISTEMA permitirá eliminar un transportista que no esté asignado
  a ninguna solicitud.
- **RF-42:** SI se intenta eliminar un transportista asignado a al menos una
  solicitud, ENTONCES EL SISTEMA rechazará la operación e informará de que está
  en uso.
- **RF-43:** MIENTRAS una solicitud esté en BORRADOR o en REGISTRADA, EL SISTEMA
  permitirá asignarle un transportista o sustituir el que tenga.
- **RF-44:** MIENTRAS una solicitud esté en BORRADOR o en REGISTRADA, EL SISTEMA
  permitirá dejarla sin transportista asignado.
- **RF-45:** SI se intenta asignar a una solicitud un transportista que no existe
  en el catálogo, ENTONCES EL SISTEMA rechazará la operación.

### Consulta

- **RF-46:** EL SISTEMA permitirá leer una solicitud concreta con sus posiciones
  y su transportista.
- **RF-47:** EL SISTEMA permitirá listar las solicitudes existentes.
- **RF-48:** EL SISTEMA permitirá filtrar el listado de solicitudes por número de
  solicitud, por estado y por transportista.

### Errores

- **RF-49:** CUANDO EL SISTEMA rechace una operación, devolverá un mensaje en
  español que identifique la regla incumplida.
- **RF-50:** CUANDO EL SISTEMA rechace una operación, no dejará ningún cambio
  parcial aplicado.

## Requisitos no funcionales

- **RNF-1:** Todo texto dirigido al usuario se emite en español.
- **RNF-2:** Cada operación es atómica: termina dejando el sistema íntegro o no
  deja rastro.
- **RNF-3:** Dos registros simultáneos obtienen números de solicitud distintos.
- **RNF-4:** Las reglas de estado se aplican en el servidor, de modo que un
  cliente que llame directamente a la API no las pueda saltar.

## Casos límite

1. **Borrador eternamente vacío.** Una solicitud en BORRADOR sin posiciones es
   válida y puede permanecer así indefinidamente; solo se bloquea al registrar
   (RF-11).
2. **Última posición según el estado.** Borrarla es legítimo en BORRADOR (RF-31)
   e ilegítimo en REGISTRADA (RF-32).
3. **Cambiar el material de la única posición de una REGISTRADA.** Se hace
   modificando esa posición (RF-29). Crear antes una segunda con el material
   nuevo y borrar después la vieja también funciona, porque el material nuevo no
   está duplicado (RF-27).
4. **Doble registro concurrente de la misma solicitud.** Solo una llamada asigna
   número; la otra se rechaza por RF-13.
5. **Registro concurrente de solicitudes distintas.** Ambas obtienen número y los
   números son distintos (RNF-3).
6. **Huecos en la numeración de solicitudes.** Un registro fallido o abortado
   puede dejar un número sin usar. Es aceptable: el requisito es unicidad y
   crecimiento (RF-8, RF-9), no consecutividad.
7. **Huecos en la numeración de posiciones.** Borrar la posición 20 deja la
   solicitud con las posiciones 10 y 30, y la siguiente que se cree será la 40.
   No se renumera ni se rellena el hueco (RF-24).
8. **Transportista bloqueado para siempre.** Un transportista asignado a una
   solicitud LIBERADA nunca se podrá eliminar, porque la referencia no se puede
   quitar (RF-19) y el borrado se rechaza (RF-42). Es la consecuencia aceptada de
   no tener baja lógica.
9. **Código de transportista mal tecleado.** El código no se puede cambiar
   (RF-37). Si el transportista aún no está asignado a ninguna solicitud se borra
   y se vuelve a crear; si ya lo está, el código erróneo es permanente. El nombre
   y el contacto sí se corrigen (RF-39).
10. **Corrección de datos visible en solicitudes liberadas.** Cambiar el nombre o
    el contacto de un transportista altera lo que muestran las solicitudes ya
    LIBERADAS (RF-40). Es deliberado: lo inmutable de una solicitud liberada es a
    qué transportista apunta, no cómo se llama hoy ese transportista.
11. **Modificación concurrente con la liberación.** Si una modificación y una
    liberación coinciden, la solicitud termina LIBERADA e íntegra: o la
    modificación entró antes de liberar, o se rechazó por RF-17/RF-18/RF-19.
12. **Eliminación de una solicitud con posiciones.** Eliminar un BORRADOR elimina
    sus posiciones; no quedan posiciones huérfanas (RF-5, RF-33).
13. **Agotamiento del rango numérico.** No se contempla en este MVP.

## Fuera de alcance

- **Bloqueo o reserva en exclusiva** de una solicitud para editarla sin
  interferencias.
- **Anulación, reapertura o copia** de una solicitud LIBERADA.
- **Baja lógica y reactivación** de transportistas.
- **Conservación histórica de los datos del transportista** tal como estaban al
  liberar la solicitud.
- Objetivos de rendimiento, límites de volumen y pruebas de carga: no se fija
  ningún umbral en este MVP.
- Roles, permisos y control de acceso: cualquier usuario puede hacer cualquier
  operación.
- Histórico de cambios, auditoría de quién hizo qué y cuándo.
- Flujo de aprobación, notificaciones o avisos.
- Integración con sistemas externos y validación del material contra un maestro
  de materiales.
- Datos de cabecera más allá de la descripción: solicitante, fecha de necesidad,
  centro o almacén de destino.
- Adjuntos, comentarios y texto libre en las posiciones.
- Interfaz de usuario: el MVP es solo el servicio.
- Numeración configurable por año, sociedad o rango.
- Informes, agregados o indicadores sobre las solicitudes.

## Criterios de finalización

1. Cada RF tiene al menos una prueba automática asociada, y `npm test` pasa en
   verde.
2. Cada entidad expuesta tiene prueba de integración con su CRUD y al menos un
   caso de error, según el principio 4 de la constitución.
3. El flujo principal se demuestra manualmente de principio a fin: crear
   borrador → añadir posición → registrar (aparece el número) → asignar
   transportista → liberar → intento de modificación rechazado.
4. Los intentos prohibidos devuelven mensaje en español: borrar la última
   posición de una REGISTRADA, liberar sin transportista, modificar una LIBERADA,
   guardar cantidad cero, duplicar material y borrar un transportista en uso.
5. Ningún literal de mensaje al usuario vive en el código (constitución 6).
6. El README describe el mismo ciclo de vida que esta spec.
7. Esta spec no contiene ningún `[NECESITA ACLARACIÓN]` sin resolver.

## Dudas abiertas

Ninguna. Las nueve dudas de la primera redacción se cerraron en la entrevista
del 2026-09-18 y sus respuestas están incorporadas a los requisitos.

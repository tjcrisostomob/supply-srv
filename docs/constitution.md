# Constitución — supply-srv

1. **Stack mínimo.** Solo CAP + CDS + OData V2, sin framework extra sobre lo que CAP ya trae. *Verificable:* toda dependencia nueva en `package.json` requiere justificación escrita en el PR.
2. **La spec manda.** Ninguna entidad, campo o acción existe en código sin estar antes en `docs/specs/**/spec.md`. *Verificable:* cada PR enlaza la sección de spec que implementa.
3. **Lógica fuera del handler.** Los handlers `before/on/after` solo validan, delegan y mapean; las reglas viven en módulos puros sin dependencia de `cds`. *Verificable:* ningún archivo de `srv/` supera 100 líneas ni contiene reglas de negocio.
4. **Sin test no se mergea.** Cada entidad expuesta tiene test de integración contra el servicio OData V2 (CRUD + un caso de error) y cada módulo de lógica su test unitario. *Verificable:* `npm test` en verde y cobertura no decreciente.
5. **Persistencia declarativa.** El esquema cambia solo vía `db/schema.cds` y despliegue generado; nada de DDL manual ni datos de prueba en producción. *Verificable:* `cds deploy` reconstruye la BD desde cero y pasa los tests.
6. **Inglés en el código, español para el usuario.** Identificadores, comentarios y commits en inglés; todo texto visible externaliza en `_i18n/*.properties` con español como idioma por defecto. *Verificable:* ningún literal de mensaje al usuario en `.cds` o `.js`.

// Message codes only. The text lives in _i18n/messages*.properties, so that no
// user-facing string ever appears in the code (constitution 6). Handlers pass
// one of these to req.error and CAP resolves it against the caller's locale.
module.exports = {
  // Registering
  ITEM_REQUIRED: 'ITEM_REQUIRED',
  ITEM_INCOMPLETE: 'ITEM_INCOMPLETE',
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',

  // Items
  ITEM_LAST_ON_REG: 'ITEM_LAST_ON_REG',
  ITEM_NO_READONLY: 'ITEM_NO_READONLY',
  QUANTITY_POSITIVE: 'QUANTITY_POSITIVE',
  MATERIAL_DUPLICATED: 'MATERIAL_DUPLICATED',

  // Releasing and immutability
  NOT_REGISTERED: 'NOT_REGISTERED',
  CARRIER_REQUIRED: 'CARRIER_REQUIRED',
  RELEASED_IMMUTABLE: 'RELEASED_IMMUTABLE',
  DELETE_ONLY_DRAFT: 'DELETE_ONLY_DRAFT',

  // Carrier catalogue
  CARRIER_IN_USE: 'CARRIER_IN_USE',
  CARRIER_DUPLICATED: 'CARRIER_DUPLICATED',
  CARRIER_CODE_FIXED: 'CARRIER_CODE_FIXED'
}

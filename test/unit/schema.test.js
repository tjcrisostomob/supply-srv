// T-03: the persistence model. These assertions pin down what the spec allows
// the model to carry, so that a field the spec puts out of scope cannot be
// added by accident later (constitution 2: nothing exists in code that is not
// in the spec first).
const path = require('path')
const cds = require('@sap/cds')

const SCHEMA = path.join(__dirname, '..', '..', 'db', 'schema.cds')

let model
const def = name => model.definitions[`supply.${name}`]
const elements = name => Object.keys(def(name).elements).sort()

beforeAll(async () => {
  model = await cds.load(SCHEMA)
})

describe('schema definitions', () => {
  test('declares the four entities and the status type of the plan', () => {
    for (const name of ['SupplyRequests', 'SupplyRequestItems', 'Carriers', 'NumberRanges']) {
      expect(def(name)).toBeDefined()
      expect(def(name).kind).toBe('entity')
    }
    expect(def('RequestStatus').kind).toBe('type')
  })
})

describe('SupplyRequests', () => {
  // RF-2: description, status, request number and carrier, and nothing else.
  // lastItemNo is technical state (plan D-4), excluded from the service later.
  test('carries only the business data RF-2 allows, plus the item counter', () => {
    expect(elements('SupplyRequests')).toEqual(
      ['ID', 'carrier', 'description', 'items', 'lastItemNo', 'requestNo', 'status'].sort()
    )
  })

  test('leaves the description optional, as RF-3 requires', () => {
    const description = def('SupplyRequests').elements.description
    expect(description['@mandatory']).toBeUndefined()
    expect(description.notNull).toBeFalsy()
  })

  test('offers exactly the three states of the spec', () => {
    expect(Object.values(def('RequestStatus').enum).map(e => e.val).sort())
      .toEqual(['BORRADOR', 'LIBERADA', 'REGISTRADA'])
  })

  test('starts every request as a draft', () => {
    expect(def('SupplyRequests').elements.status.default).toBeDefined()
  })

  test('has no request number until it is registered', () => {
    const requestNo = def('SupplyRequests').elements.requestNo
    expect(requestNo.type).toBe('cds.Integer')
    expect(requestNo.default).toBeUndefined()
  })

  test('points at the carrier by association, so RF-40 shows current data', () => {
    const carrier = def('SupplyRequests').elements.carrier
    expect(carrier.type).toBe('cds.Association')
    expect(carrier.target).toBe('supply.Carriers')
  })

  test('lets CAP reject a carrier that does not exist (RF-45)', () => {
    expect(def('SupplyRequests').elements.carrier['@assert.target']).toBe(true)
  })

  test('contains its items, so deleting a draft cascades (RF-5, RF-33)', () => {
    expect(def('SupplyRequests').elements.items.type).toBe('cds.Composition')
    expect(def('SupplyRequests').elements.items.target).toBe('supply.SupplyRequestItems')
  })

  test('counts items from zero, so the first one gets 10 (RF-23)', () => {
    expect(def('SupplyRequests').elements.lastItemNo.default.val).toBe(0)
  })
})

describe('SupplyRequestItems', () => {
  // RF-21: item number, material, quantity and unit of measure, nothing else.
  test('carries only what RF-21 allows', () => {
    expect(elements('SupplyRequestItems')).toEqual(
      ['ID', 'itemNo', 'material', 'quantity', 'request', 'unit'].sort()
    )
  })

  test('belongs to exactly one request (RF-33)', () => {
    const request = def('SupplyRequestItems').elements.request
    expect(request.type).toBe('cds.Association')
    expect(request.target).toBe('supply.SupplyRequests')
  })

  test('keeps quantity decimal, so fractional units are expressible', () => {
    expect(def('SupplyRequestItems').elements.quantity.type).toBe('cds.Decimal')
  })
})

describe('Carriers', () => {
  test('carries code, name and the two optional contact fields (RF-34)', () => {
    expect(elements('Carriers')).toEqual(['code', 'email', 'name', 'phone'])
  })

  // Plan D-5: the code is the key, which makes RF-37 structural.
  test('is keyed by its business code', () => {
    expect(def('Carriers').elements.code.key).toBe(true)
  })

  test('requires code and name, and only those (RF-35)', () => {
    const el = def('Carriers').elements
    expect(el.name['@mandatory']).toBe(true)
    expect(el.phone['@mandatory']).toBeUndefined()
    expect(el.email['@mandatory']).toBeUndefined()
  })
})

describe('NumberRanges', () => {
  test('is a keyed counter, ready for the register action (RF-8)', () => {
    expect(elements('NumberRanges')).toEqual(['name', 'nextValue'])
    expect(def('NumberRanges').elements.name.key).toBe(true)
    expect(def('NumberRanges').elements.nextValue.type).toBe('cds.Integer')
  })
})

describe('what the spec keeps out', () => {
  const entities = ['SupplyRequests', 'SupplyRequestItems', 'Carriers', 'NumberRanges']

  // RF-30: items are deleted outright, with no deletion marker kept.
  test('has no soft-delete marker anywhere', () => {
    for (const entity of entities) {
      for (const name of elements(entity)) {
        expect(name).not.toMatch(/delet|cancel|anul|void|archiv|inactiv/i)
      }
    }
  })

  test('has none of the header fields the spec puts out of scope', () => {
    const header = elements('SupplyRequests').join(' ')
    expect(header).not.toMatch(/requester|solicitante|needBy|dueDate|plant|warehouse|centro/i)
  })

  test('keeps no historical copy of the carrier on the request', () => {
    const header = elements('SupplyRequests')
    expect(header).not.toContain('carrierName')
    expect(header).not.toContain('carrierPhone')
  })
})

describe('deployment', () => {
  test('builds a fresh SQLite database from the model alone', async () => {
    const db = await cds.deploy(SCHEMA).to('sqlite::memory:')
    const { SupplyRequests, Carriers } = db.model.entities('supply')
    await db.run(INSERT.into(Carriers).entries({ code: 'TR-01', name: 'Transportes SA' }))
    await db.run(INSERT.into(SupplyRequests).entries({ description: 'Obra norte' }))
    const rows = await db.run(SELECT.from(SupplyRequests))
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('BORRADOR')
    expect(rows[0].requestNo).toBeNull()
    expect(rows[0].lastItemNo).toBe(0)
  })
})

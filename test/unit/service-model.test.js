// T-04: the service contract. What this file pins down is what $metadata will
// show a consumer, so the assertions are about exposure: which entities the
// service publishes, and which fields of them it keeps to itself.
const fs = require('fs')
const path = require('path')
const cds = require('@sap/cds')

const ROOT = path.join(__dirname, '..', '..')
const SERVICE = path.join(ROOT, 'srv', 'supply-service.cds')

let csn
let edmx
const def = name => csn.definitions[`SupplyService.${name}`]
const elements = name => Object.keys(def(name).elements).sort()

beforeAll(async () => {
  csn = cds.compile.for.odata(await cds.load(SERVICE))
  edmx = cds.compile.to.edmx(csn, { service: 'SupplyService' })
})

describe('service definition', () => {
  test('declares SupplyService on the path the plan documents', () => {
    expect(csn.definitions.SupplyService.kind).toBe('service')
    expect(csn.definitions.SupplyService['@path']).toBe('/supply')
  })

  test('exposes the three entities of the spec', () => {
    for (const name of ['SupplyRequests', 'SupplyRequestItems', 'Carriers']) {
      expect(def(name)).toBeDefined()
    }
  })

  // Plan D-3: the counter table is internal machinery, not part of the contract.
  test('keeps the number range table out of the service', () => {
    expect(def('NumberRanges')).toBeUndefined()
    expect(edmx).not.toMatch(/NumberRanges/)
  })
})

describe('SupplyRequests projection', () => {
  // RF-2 read as a statement about what the service exposes: the item counter
  // is technical state (plan D-4) and must not reach a consumer.
  test('hides the technical item counter', () => {
    expect(elements('SupplyRequests')).not.toContain('lastItemNo')
    expect(edmx).not.toMatch(/lastItemNo/)
  })

  test('still exposes every business field RF-2 lists', () => {
    const exposed = elements('SupplyRequests')
    for (const field of ['description', 'status', 'requestNo']) {
      expect(exposed).toContain(field)
    }
    expect(exposed.some(e => e.startsWith('carrier'))).toBe(true)
    expect(exposed).toContain('items')
  })

  test('offers register and release as bound actions', () => {
    const actions = def('SupplyRequests').actions
    expect(Object.keys(actions).sort()).toEqual(['register', 'release'])
  })

  test('takes no arguments on either action, the key identifies the request', () => {
    const actions = def('SupplyRequests').actions
    expect(actions.register.params).toBeUndefined()
    expect(actions.release.params).toBeUndefined()
  })
})

describe('metadata document', () => {
  test('publishes an entity set per exposed entity', () => {
    for (const name of ['SupplyRequests', 'SupplyRequestItems', 'Carriers']) {
      expect(edmx).toMatch(new RegExp(`EntitySet Name="${name}"`))
    }
  })

  test('carries both actions', () => {
    expect(edmx).toMatch(/register/)
    expect(edmx).toMatch(/release/)
  })
})

describe('Carriers projection', () => {
  test('exposes the catalogue for reading and maintenance (RF-38)', () => {
    expect(elements('Carriers')).toEqual(['code', 'email', 'name', 'phone'])
  })
})

describe('service implementation', () => {
  const IMPL = path.join(ROOT, 'srv', 'supply-service.js')

  // CAP wires the implementation by filename. Getting that name wrong would not
  // fail loudly, it would just leave every later guard unregistered, so the
  // convention is asserted here before any handler depends on it.
  test('sits next to the service definition, named to match', () => {
    expect(fs.existsSync(IMPL)).toBe(true)
    expect(fs.existsSync(SERVICE)).toBe(true)
    expect(path.basename(IMPL, '.js')).toBe(path.basename(SERVICE, '.cds'))
  })

  test('extends the CAP application service', () => {
    expect(Object.getPrototypeOf(require(IMPL))).toBe(cds.ApplicationService)
  })
})

// T-06: the first test that goes over the wire. Everything before this checked
// compiled models; this one proves the adapter answers real HTTP in real V2
// shape, which is the harness every later integration test builds on.
const { launch, V2, V4 } = require('./harness')

const srv = launch()

describe('the V2 endpoint answers', () => {
  let response

  beforeAll(async () => {
    response = await srv.GET(`${V2}/Carriers`)
  })

  test('over HTTP, on the path the plan documents', () => {
    expect(response.status).toBe(200)
  })

  test('declaring itself as OData V2', () => {
    expect(response.headers['dataserviceversion']).toBe('2.0')
  })

  // The envelope is the giveaway: V4 answers {value:[...]}, V2 wraps everything
  // in {d:{results:[...]}}. Getting this shape proves the adapter is translating
  // and not just proxying.
  test('in the V2 envelope, not the V4 one', () => {
    expect(response.data).toEqual({ d: { results: [] } })
    expect(response.data.value).toBeUndefined()
  })
})

describe('a write round-trips in V2 shape', () => {
  let created

  beforeAll(async () => {
    created = await srv.POST(`${V2}/Carriers`, { code: 'TR-01', name: 'Transportes SA' })
  })

  test('answers 201 with the stored entity', () => {
    expect(created.status).toBe(201)
    expect(created.data.d).toMatchObject({ code: 'TR-01', name: 'Transportes SA' })
  })

  test('leaves the optional contact fields empty', () => {
    expect(created.data.d.phone).toBeNull()
    expect(created.data.d.email).toBeNull()
  })

  test('carries the V2 __metadata block', () => {
    expect(created.data.d.__metadata.type).toBe('SupplyService.Carriers')
  })

  test('addresses the row with a V2 key, not a V4 one', () => {
    expect(created.data.d.__metadata.uri).toMatch(/\/Carriers\('TR-01'\)$/)
  })
})

describe('the database behind the harness', () => {
  test('is built in memory from the model, fresh for this file', async () => {
    const { data } = await srv.GET(`${V2}/SupplyRequests`)
    expect(data.d.results).toEqual([])
  })
})

describe('the V4 endpoint alongside it', () => {
  test('still serves V4, so the two can be told apart while debugging', async () => {
    const { status, data } = await srv.GET(`${V4}/$metadata`)
    expect(status).toBe(200)
    expect(data).toMatch(/<edmx:Edmx[^>]*Version="4\.0"/)
  })
})

describe('known limitation of the harness', () => {
  // Measured in T-06. The adapter's $metadata route works under cds-serve, but
  // inside cds.test's in-process server it hands a non-string to res.write and
  // answers 500. Only $metadata is affected; every data request above works.
  //
  // Marked failing rather than skipped, so the day the adapter fixes it this
  // test turns red and tells us to delete this block. What $metadata would have
  // proven is covered in test/unit/service-model.test.js against compiled EDMX.
  test.failing('serves the V2 metadata document in process', async () => {
    const { status } = await srv.GET(`${V2}/$metadata`)
    expect(status).toBe(200)
  })
})

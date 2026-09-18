// T-02: the OData V2 adapter registers itself as a CDS plugin, so this project
// needs no custom server.js. These assertions lock that contract in: if the
// adapter ever stops auto-registering, this fails here rather than surfacing as
// a confusing 404 in the integration tests.
const fs = require('fs')
const path = require('path')
const cds = require('@sap/cds')

const ADAPTER = '@cap-js-community/odata-v2-adapter'
const PROJECT_ROOT = path.join(__dirname, '..', '..')

describe('OData V2 adapter wiring', () => {
  test('registers itself as a CDS plugin', () => {
    expect(Object.keys(cds.env.plugins)).toContain(ADAPTER)
  })

  test('is loaded from the adapter package, not from project code', () => {
    // Normalised because the path separator differs between Windows and CI.
    const impl = cds.env.plugins[ADAPTER].impl.split(path.sep).join('/')
    expect(impl).toContain(`node_modules/${ADAPTER}`)
    expect(impl.endsWith('cds-plugin.js')).toBe(true)
  })

  // Deliberate absence, not an oversight. The plugin mounts the adapter on its
  // own; a server.js repeating that would be dead code. Deleting this test is
  // the way to reintroduce one, so the decision gets revisited on purpose.
  test('ships no server.js, because the plugin makes one unnecessary', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'server.js'))).toBe(false)
  })

  test('keeps the CAP database plugins registered alongside it', () => {
    const plugins = Object.keys(cds.env.plugins)
    expect(plugins).toContain('@cap-js/sqlite')
    expect(plugins).toContain('@cap-js/hana')
  })
})

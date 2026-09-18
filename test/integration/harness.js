const path = require('path')
const cds = require('@sap/cds')

const PROJECT_ROOT = path.join(__dirname, '..', '..')

// The contract is OData V2; V4 stays reachable and is only used to tell the two
// apart in the protocol tests. Both paths were measured in T-02.
const V2 = '/odata/v2/supply'
const V4 = '/supply'

// cds.test registers its own before/after hooks, so it has to be called at the
// top level of a test file, never from inside a hook.
const launch = () => cds.test(PROJECT_ROOT)

module.exports = { launch, PROJECT_ROOT, V2, V4 }

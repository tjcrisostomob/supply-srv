// Guards constitution principle 1 (minimal stack): every dependency below is
// justified in docs/specs/001-supply-mvp/plan.md section 7. Adding one without
// justifying it there is meant to break this test.
const pkg = require('../../package.json')

const JUSTIFIED_RUNTIME = [
  '@cap-js-community/odata-v2-adapter',
  '@cap-js/hana',
  '@sap/cds',
  'express'
]

// @cap-js/cds-test was added in T-06: cds.test no longer ships inside @sap/cds
// as of CAP 9, and constitution 4 requires integration tests against the OData
// V2 service. Dev-only, so it never reaches production.
const JUSTIFIED_DEV = ['@cap-js/cds-test', '@cap-js/sqlite', 'jest']

describe('package manifest', () => {
  test('declares only the runtime dependencies justified in the plan', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual(JUSTIFIED_RUNTIME)
  })

  test('declares only the dev dependencies justified in the plan', () => {
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(JUSTIFIED_DEV)
  })

  // The scripts must name binaries @sap/cds actually ships. It provides
  // cds-serve and cds-deploy only; the bare `cds` CLI lives in @sap/cds-dk,
  // which is not among the justified dependencies.
  test('exposes the scripts AGENTS.md and the plan rely on', () => {
    expect(pkg.scripts.start).toBe('cds-serve')
    expect(pkg.scripts.test).toBe('jest')
    expect(pkg.scripts.deploy).toBe('cds-deploy')
  })

  test('every script resolves to an installed binary', () => {
    const bins = Object.keys(require('@sap/cds/package.json').bin)
    for (const script of ['start', 'deploy']) {
      expect(bins).toContain(pkg.scripts[script])
    }
  })

  test('requires Node 20 or newer, as CAP v9 does', () => {
    expect(pkg.engines.node).toBe('>=20')
  })

  test('pins CAP to v9, the version AGENTS.md fixes', () => {
    expect(pkg.dependencies['@sap/cds']).toMatch(/^\^9(\.|$)/)
  })

  test('uses sqlite for development and tests, hana in production', () => {
    const db = pkg.cds.requires.db
    expect(db.kind).toBe('sqlite')
    expect(db['[production]'].kind).toBe('hana')
  })
})

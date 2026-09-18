// T-05: user-facing text. Constitution 6 keeps it out of the code entirely, so
// these assertions check two things: that the code only ever names a key, and
// that every key resolves in both bundles with matching placeholders.
const fs = require('fs')
const path = require('path')
const cds = require('@sap/cds')

const MSG = require('../../srv/lib/messages')

const ROOT = path.join(__dirname, '..', '..')
const I18N = path.join(ROOT, '_i18n')
const SRV = path.join(ROOT, 'srv')

// CAP's own validation texts, overridden so that no framework message reaches a
// user in English (plan D-6 relies on these two annotations).
const CAP_OVERRIDES = ['ASSERT_MANDATORY', 'ASSERT_TARGET']

const parse = file => {
  const bundle = {}
  for (const line of fs.readFileSync(path.join(I18N, file), 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    bundle[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return bundle
}

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name)
  return entry.isDirectory() ? walk(full) : [full]
})

const placeholders = text => (text.match(/\{\d+\}/g) || []).sort()

// Both bundles are locale-suffixed on purpose. An unsuffixed messages.properties
// loses to CAP's own messages_es.properties, which would silently keep CAP's
// wording for the two ASSERT keys; a suffixed file wins.
let es, en
beforeAll(() => {
  es = parse('messages_es.properties')
  en = parse('messages_en.properties')
})

describe('bundle layout', () => {
  test('ships one bundle per language and no unsuffixed fallback', () => {
    expect(fs.readdirSync(I18N).sort()).toEqual(['messages_en.properties', 'messages_es.properties'])
  })

  test('makes Spanish the default language (constitution 6)', () => {
    expect(cds.env.i18n.default_language).toBe('es')
  })

  test('falls back to Spanish for a language it does not translate', () => {
    expect(cds.i18n.messages.at(MSG.CARRIER_REQUIRED, 'de')).toBe(es.CARRIER_REQUIRED)
  })
})

describe('message codes', () => {
  test('are plain codes, never text', () => {
    for (const [name, code] of Object.entries(MSG)) {
      expect(code).toBe(name)
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/)
    }
  })

  test('cover the fourteen rejections the plan lists', () => {
    expect(Object.keys(MSG)).toHaveLength(14)
  })
})

describe('Spanish bundle', () => {
  test('defines every code the service can raise', () => {
    for (const code of Object.values(MSG)) {
      expect(es[code]).toBeDefined()
      expect(es[code].length).toBeGreaterThan(0)
    }
  })

  test('defines nothing the code cannot raise', () => {
    const allowed = [...Object.values(MSG), ...CAP_OVERRIDES].sort()
    expect(Object.keys(es).sort()).toEqual(allowed)
  })

  // Not just "defined": the resolved value must be ours, not the Spanish text
  // CAP ships for the same key.
  test('overrides the CAP validation texts, and wins (RNF-1)', () => {
    for (const key of CAP_OVERRIDES) {
      expect(es[key]).toBeDefined()
      expect(cds.i18n.messages.at(key, 'es')).toBe(es[key])
      expect(cds.i18n.messages.at(key)).toBe(es[key])
    }
  })
})

describe('English bundle', () => {
  test('carries exactly the same keys as the Spanish one', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  })

  test('is actually a translation, not a copy', () => {
    for (const key of Object.keys(es)) {
      expect(en[key]).not.toBe(es[key])
    }
  })

  test('keeps the same placeholders, so no argument is dropped', () => {
    for (const key of Object.keys(es)) {
      expect(placeholders(en[key])).toEqual(placeholders(es[key]))
    }
  })
})

describe('placeholder safety', () => {
  // CAP runs these through MessageFormat, where a lone apostrophe swallows the
  // rest of the pattern. CAP's own bundle writes doesn''t for that reason.
  test('escapes apostrophes in every parameterised message', () => {
    for (const bundle of [es, en]) {
      for (const [key, text] of Object.entries(bundle)) {
        if (!placeholders(text).length) continue
        expect(text.replace(/''/g, '')).not.toMatch(/'/)
      }
    }
  })
})

describe('resolution at runtime', () => {
  test('answers in Spanish when the caller states no preference (RNF-1)', () => {
    for (const code of Object.values(MSG)) {
      expect(cds.i18n.messages.at(code)).toBe(es[code])
    }
  })

  test('answers in Spanish for an explicit Spanish locale', () => {
    expect(cds.i18n.messages.at(MSG.CARRIER_REQUIRED, 'es')).toBe(es.CARRIER_REQUIRED)
  })

  test('answers in English for an explicit English locale', () => {
    expect(cds.i18n.messages.at(MSG.CARRIER_REQUIRED, 'en')).toBe(en.CARRIER_REQUIRED)
  })
})

describe('no user-facing text in the code', () => {
  const sources = walk(SRV).filter(f => /\.(js|cds)$/.test(f))

  test('finds source files to check', () => {
    expect(sources.length).toBeGreaterThan(0)
  })

  test('holds no Spanish anywhere under srv/', () => {
    for (const file of sources) {
      const content = fs.readFileSync(file, 'utf8')
      expect({ file, content }).toEqual({ file, content: expect.not.stringMatching(/[áéíóúüñ¿¡]/i) })
    }
  })

  test('holds no quoted sentence long enough to be a message', () => {
    for (const file of sources.filter(f => f.endsWith('.js'))) {
      const content = fs.readFileSync(file, 'utf8')
      // Bounded to a single line: otherwise the match runs from one constant's
      // closing quote to the next one's opening quote.
      const quoted = content.match(/'[^'\n]{25,}'|"[^"\n]{25,}"/g) || []
      expect({ file, quoted }).toEqual({ file, quoted: [] })
    }
  })
})

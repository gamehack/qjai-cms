import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtimeEnv = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
const migrationEnv = readFileSync(new URL('../.migration.env.example', import.meta.url), 'utf8')
const compose = readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8')

const containerCaPath = '/run/secrets/supabase-ca.crt'
const hostCaPath = '/etc/qjai-cms/supabase-ca.crt'

function serviceBlock(name) {
  const lines = compose.split('\n')
  const start = lines.findIndex((line) => line === `  ${name}:`)
  assert.notEqual(start, -1, `missing Compose service: ${name}`)

  const endOffset = lines
    .slice(start + 1)
    .findIndex((line) => /^  [a-zA-Z0-9_-]+:\s*$/.test(line))
  const end = endOffset === -1 ? lines.length : start + 1 + endOffset
  return lines.slice(start, end).join('\n')
}

function assertStrictTlsTemplate(contents, templateName) {
  assert.match(contents, /sslmode=verify-full(?:&|$)/, `${templateName} must verify the database hostname`)
  assert.match(
    contents,
    /sslrootcert=\/run\/secrets\/supabase-ca\.crt(?:&|\s|$)/,
    `${templateName} must use the mounted Supabase CA`,
  )
  assert.doesNotMatch(contents, /sslmode=require(?:&|\s|$)/, `${templateName} must not use sslmode=require`)
}

function assertReadOnlyCaMount(name) {
  const block = serviceBlock(name)
  const escapedHostPath = hostCaPath.replaceAll('/', '\\/').replaceAll('.', '\\.')
  const escapedContainerPath = containerCaPath.replaceAll('/', '\\/').replaceAll('.', '\\.')
  const caMount = new RegExp(
    [
      '- type: bind',
      `source: ${escapedHostPath}`,
      `target: ${escapedContainerPath}`,
      'read_only: true',
      'bind:',
      'create_host_path: false',
    ].join('\\s+'),
  )

  assert.match(block, caMount, `${name} must mount the Supabase CA read-only without creating the host path`)
}

test('production database templates enforce strict TLS', () => {
  assertStrictTlsTemplate(runtimeEnv, '.env.example')
  assertStrictTlsTemplate(migrationEnv, '.migration.env.example')
})

test('runtime and migration services mount the Supabase CA safely', () => {
  assertReadOnlyCaMount('qjai-cms')
  assertReadOnlyCaMount('qjai-cms-migrate')
})

test('the production CMS router uses cms.qjai.org, not the apex main-site hostname', () => {
  assert.match(compose, /traefik\\.http\\.routers\\.qjai-cms\\.rule=Host\\(\`cms\\.qjai\\.org\`\\)/)
  assert.doesNotMatch(compose, /traefik\\.http\\.routers\\.qjai-cms\\.rule=Host\\(\`qjai\\.org\`\\)/)
})

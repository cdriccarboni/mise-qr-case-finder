#!/usr/bin/env node
// Safe Android internal release contract. Never uploads, signs or changes code.
import { execFileSync } from 'node:child_process'
import { readFileSync, appendFileSync } from 'node:fs'

const capture = (text, re) => text.match(re)?.[1] ?? null

export function decideInternalRelease({
  sourceSha, liveMainSha, androidCurrent, androidPrevious, packageJson,
  expectedPackage = 'fr.acousmatictheatre.mises',
}) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha || '') || !/^[a-f0-9]{40}$/.test(liveMainSha || '')) {
    throw new Error('invalid commit SHA')
  }
  if (sourceSha !== liveMainSha) {
    return { eligible: false, reason: 'main moved since validated Android run' }
  }
  const version = JSON.parse(packageJson).version
  const gradleVersion = capture(androidCurrent, /versionName\s*=\s*"([^"]+)"/)
  const currentCode = Number(capture(androidCurrent, /versionCode\s*=\s*(\d+)/))
  const previousCode = Number(capture(androidPrevious, /versionCode\s*=\s*(\d+)/))
  const appId = capture(androidCurrent, /val\s+playApplicationId\s*=\s*"([^"]+)"/)
  if (!version || version !== gradleVersion) throw new Error('package and Android versionName mismatch')
  if (appId !== expectedPackage) throw new Error('Android applicationId changed')
  if (!Number.isSafeInteger(currentCode) || !Number.isSafeInteger(previousCode) ||
      currentCode < 1 || previousCode < 1) throw new Error('invalid Android versionCode')
  if (currentCode <= previousCode) {
    return { eligible: false, reason: `no strictly increasing versionCode: ${previousCode} -> ${currentCode}` }
  }
  return { eligible: true, reason: 'validated versionCode increment', version,
           code: currentCode, packageName: appId, track: 'internal' }
}

function cli() {
  const sourceSha = process.env.RELEASE_SOURCE_SHA || ''
  const liveMainSha = process.env.RELEASE_LIVE_MAIN_SHA || ''
  const previous = execFileSync('git', ['show', 'HEAD^:android/app/build.gradle.kts'], { encoding: 'utf8' })
  const result = decideInternalRelease({
    sourceSha, liveMainSha, androidPrevious: previous,
    androidCurrent: readFileSync('android/app/build.gradle.kts', 'utf8'),
    packageJson: readFileSync('package.json', 'utf8'),
  })
  const output = process.env.GITHUB_OUTPUT
  const lines = [
    `eligible=${result.eligible}`,
    `version=${result.version || ''}`,
    `version_code=${result.code || ''}`,
    `reason=${result.reason}`,
  ]
  if (output) appendFileSync(output, lines.join('\n') + '\n')
  console.log(JSON.stringify(result))
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try { cli() } catch (error) { console.error('Release blocked:', error.message); process.exit(1) }
}

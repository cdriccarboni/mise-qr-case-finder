import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(new URL('..', import.meta.url).pathname)
const dist = join(root, 'dist')
const androidRoot = join(root, 'android')
const www = join(androidRoot, 'app', 'src', 'main', 'assets', 'www')
const apk = join(androidRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const appId = 'fr.acousmatictheatre.mises'

const fail = message => {
  console.error('\nMISES! — ' + message)
  process.exit(1)
}

const commandPath = (names) => {
  for (const candidate of names.filter(Boolean)) {
    if (candidate.includes('/') && existsSync(candidate)) return candidate
    const hit = spawnSync('which', [candidate], { encoding: 'utf8' })
    if (hit.status === 0 && hit.stdout.trim()) return hit.stdout.trim()
  }
  return null
}

const gradle = () => commandPath([
  process.env.GRADLE_HOME && join(process.env.GRADLE_HOME, 'bin', 'gradle'),
  '/opt/homebrew/bin/gradle',
  '/usr/local/bin/gradle',
  'gradle'
])

const adb = () => commandPath([
  process.env.ANDROID_HOME && join(process.env.ANDROID_HOME, 'platform-tools', 'adb'),
  process.env.ANDROID_SDK_ROOT && join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb'),
  join(homedir(), 'Library', 'Android', 'sdk', 'platform-tools', 'adb'),
  '/opt/homebrew/bin/adb',
  'adb'
])

const run = (bin, args, options = {}) => {
  const result = spawnSync(bin, args, { stdio: 'inherit', cwd: root, ...options })
  if (result.error) fail(result.error.message)
  if (result.status !== 0) fail(`commande échouée: ${bin} ${args.join(' ')}`)
}

const syncWeb = () => {
  if (!existsSync(dist)) fail('dist/ absent. Lance npm run build avant la synchronisation Android.')
  rmSync(www, { recursive: true, force: true })
  mkdirSync(www, { recursive: true })
  cpSync(dist, www, { recursive: true })
  console.log('✓ PWA copiée dans android/app/src/main/assets/www')
}

const buildApk = () => {
  const bin = gradle()
  if (!bin) fail('Gradle introuvable. Installe Gradle une fois sur le Mac ou ajoute-le au PATH.')
  run(bin, ['-p', 'android', ':app:assembleDebug', '--stacktrace'])
  if (!existsSync(apk)) fail('APK attendu introuvable après le build.')
  console.log('✓ APK debug: ' + apk)
}

const launchPixel = () => {
  const bin = adb()
  if (!bin) fail('adb introuvable. Android platform-tools doit être installé et accessible.')
  const devices = spawnSync(bin, ['devices'], { encoding: 'utf8' })
  const ready = (devices.stdout || '').split('\n').some(line => /\tdevice$/.test(line.trim()))
  if (!ready) fail('aucun appareil Android autorisé. Branche le Pixel en USB et accepte le débogage USB.')
  run(bin, ['install', '-r', apk])
  run(bin, ['shell', 'am', 'force-stop', appId])
  run(bin, ['shell', 'monkey', '-p', appId, '-c', 'android.intent.category.LAUNCHER', '1'])
  console.log('✓ MISES! lancée sur le Pixel')
}

const action = process.argv[2]
if (action === 'sync') syncWeb()
else if (action === 'apk') buildApk()
else if (action === 'pixel') launchPixel()
else fail('action inconnue. Utilise sync, apk ou pixel.')

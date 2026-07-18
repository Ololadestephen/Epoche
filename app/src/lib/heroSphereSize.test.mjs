/**
 * Unit tests for hero size mapping + sphere video wiring.
 * Run: npx tsx src/lib/heroSphereSize.test.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  HERO_SPHERE_DEEP_VMIN,
  HERO_SPHERE_REST_VMIN,
  heroSphereSizePx,
  heroSphereSizeVmin,
} from './heroSphereSize.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const root = join(dir, '../..')

function note(msg) {
  console.log(msg)
}

const rest = heroSphereSizeVmin(0)
const deep = heroSphereSizeVmin(1)
const mid = heroSphereSizeVmin(0.5)
note(`rest=${rest} mid=${mid} deep=${deep}`)

assert.equal(rest, HERO_SPHERE_REST_VMIN)
assert.equal(deep, HERO_SPHERE_DEEP_VMIN)
assert.ok(rest < mid && mid < deep)
assert.ok(deep >= 100)
assert.ok(deep > rest * 2)

const short = 900
assert.ok(heroSphereSizePx(1, short) >= short)
assert.ok(heroSphereSizePx(0, short) < short * 0.7)

const videoPath = join(root, 'public/animated_rotate2.mp4')
assert.ok(existsSync(videoPath), 'public/animated_rotate2.mp4 exists')
note(`video bytes=${readFileSync(videoPath).byteLength}`)

const sphereVisual = readFileSync(
  join(dir, '../components/landing/SphereVisual.tsx'),
  'utf8',
)
assert.ok(sphereVisual.includes('animated_rotate2.mp4'))
assert.ok(sphereVisual.includes('<video'))
assert.ok(sphereVisual.includes('sphere-video'))

const scrollHero = readFileSync(
  join(dir, '../components/landing/ScrollHero.tsx'),
  'utf8',
)
assert.ok(scrollHero.includes('heroSphereSizeVmin'))
assert.ok(scrollHero.includes('HERO_SPHERE_DEEP_VMIN'))
assert.ok(scrollHero.includes('SphereVisual'))
// enlarge uses scale relative to fixed deep box (GPU, no layout thrash)
assert.ok(scrollHero.includes('transform') && scrollHero.includes('scale('))
assert.ok(scrollHero.includes('transformOrigin'))

const landing = readFileSync(join(dir, '../pages/Landing.tsx'), 'utf8')
assert.ok(landing.includes('id="steps"'))
assert.ok(landing.includes('SphereVisual'))

const css = readFileSync(join(dir, '../index.css'), 'utf8')
assert.ok(css.includes('mix-blend-mode: screen'))

note('ALL_ASSERTIONS_PASSED')

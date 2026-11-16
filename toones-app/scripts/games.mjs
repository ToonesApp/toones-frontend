// Checks the game data under src/components/features/games/data against public/games.
//   node scripts/games.mjs          validate; exits 1 on any problem
//   node scripts/games.mjs --fill   first give rounds without four options some from pools.json
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src/components/features/games/data')
const GAMES = { language: 'lang', instrument: 'inst', animal: 'anim' }
/** Licenses that allow redistributing a trimmed clip with credit. Pictures may also be share-alike. */
const CLIP_LICENSE = /^(CC0 1\.0|Public domain|CC BY \d\.\d)$/
const IMAGE_LICENSE = /^(CC0 1\.0|Public domain|CC BY(-SA)? \d\.\d)$/
const BANNED_SOURCE = /macaulay/i

const read = (name) => JSON.parse(readFileSync(join(dataDir, name), 'utf8'))
const text = (v) => typeof v === 'string' && v.trim().length > 0
const errors = []

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Three wrong answers that could be mistaken for the right one: its pool mates first, in an order fixed by the round id. */
function distractors(item, pools, items) {
  const mates = pools.filter((p) => p.includes(item.answer)).flat()
  const peers = items.filter((i) => i.difficulty === item.difficulty).map((i) => i.answer)
  const order = (list) => [...new Set(list)].filter((a) => a !== item.answer).sort((a, b) => hash(item.id + a) - hash(item.id + b))
  return [...new Set([...order(mates), ...order(peers)])].slice(0, 3)
}

function checkCredit(where, credit, allowed) {
  if (!credit || typeof credit !== 'object') return errors.push(`${where}: missing credit`)
  for (const key of ['source', 'author', 'url']) if (!text(credit[key])) errors.push(`${where}: credit.${key} is empty`)
  if (!text(credit.license)) errors.push(`${where}: missing license`)
  else if (!allowed.test(credit.license)) errors.push(`${where}: license "${credit.license}" is not on the allowed list`)
  if (BANNED_SOURCE.test(`${credit.source} ${credit.url}`)) errors.push(`${where}: Macaulay Library audio is not allowed`)
}

function checkFile(where, game, path) {
  if (!text(path) || !path.startsWith(`/games/${game}/`)) return errors.push(`${where}: "${path}" must be under /games/${game}/`)
  if (!existsSync(join(root, 'public', path))) errors.push(`${where}: file ${path} does not exist`)
}

function check(game, prefix, items) {
  if (!Array.isArray(items)) return errors.push(`${game}: the file must be an array`)
  const ids = new Set()
  for (const [n, item] of items.entries()) {
    const at = `${game} ${item?.id ?? `#${n}`}`
    if (!text(item?.id) || !new RegExp(`^${prefix}-\\d{3}$`).test(item.id)) errors.push(`${at}: id must look like ${prefix}-001`)
    if (ids.has(item.id)) errors.push(`${at}: duplicate id`)
    ids.add(item.id)
    if (item.audio !== undefined) checkFile(`${at} audio`, game, item.audio)
    if (!text(item.caption)) errors.push(`${at}: caption is empty, so the round is unplayable without sound`)
    if (!text(item.answer)) errors.push(`${at}: answer is empty`)
    const options = Array.isArray(item.options) ? item.options : []
    if (options.length !== 4 || new Set(options).size !== 4 || !options.every(text)) errors.push(`${at}: needs four different options`)
    else if (!options.includes(item.answer)) errors.push(`${at}: options do not include the answer`)
    if (![1, 2, 3].includes(item.difficulty)) errors.push(`${at}: difficulty must be 1, 2 or 3`)
    if (!text(item.reveal?.fact)) errors.push(`${at}: reveal.fact is empty`)
    const geo = item.reveal?.geo
    if (geo && !(Math.abs(geo.lat) <= 90 && Math.abs(geo.lng) <= 180)) errors.push(`${at}: reveal.geo is off the globe`)
    if (item.reveal?.image !== undefined) {
      checkFile(`${at} image`, game, item.reveal.image)
      checkCredit(`${at} image`, item.reveal.imageCredit, IMAGE_LICENSE)
    }
    checkCredit(at, item.credit, CLIP_LICENSE)
  }
}

const fill = process.argv.includes('--fill')
const pools = read('pools.json')
let total = 0

for (const [game, prefix] of Object.entries(GAMES)) {
  const items = read(`${game}.json`)
  if (fill && Array.isArray(items)) {
    for (const item of items) if (!(item.options?.length === 4)) item.options = [item.answer, ...distractors(item, pools[game] ?? [], items)]
    writeFileSync(join(dataDir, `${game}.json`), `${JSON.stringify(items, null, 2)}\n`)
  }
  check(game, prefix, items)
  total += items.length ?? 0

  const dir = join(root, 'public/games', game)
  const used = new Set(items.flatMap?.((i) => [i.audio, i.reveal?.image]) ?? [])
  for (const file of existsSync(dir) ? readdirSync(dir) : []) {
    if (!used.has(`/games/${game}/${file}`)) errors.push(`${game}: public/games/${game}/${file} is not used by any round`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} in the game data.`)
  process.exit(1)
}
console.log(`Game data OK: ${total} rounds, every clip present and licensed.`)

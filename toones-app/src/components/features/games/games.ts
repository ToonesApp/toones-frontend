import type { SpeciesId } from '../../characters/clay'
import type { GameId, GameItem, Mode } from './types'

export type GameDef = {
  id: GameId
  title: string
  tagline: string
  species: SpeciesId
  prompt: string
  /** Label for `reveal.where`. */
  whereLabel: string
  modes: readonly Mode[]
  /** The game's rounds, split into their own chunk. */
  load: () => Promise<GameItem[]>
}

const rounds = (mod: { default: unknown }) => mod.default as GameItem[]

/** Each game's mascot is the character whose color matches its category. */
export const GAMES: readonly GameDef[] = [
  {
    id: 'language',
    title: 'LanguageGuessr',
    tagline: 'Hear a phrase. Name the language.',
    species: 'ima',
    prompt: 'Which language is this?',
    whereLabel: 'Spoken in',
    modes: ['choice', 'type', 'pin'],
    load: () => import('./data/language.json').then(rounds),
  },
  {
    id: 'instrument',
    title: 'InstrumentGuessr',
    tagline: 'A few notes. Which instrument?',
    species: 'tomo',
    prompt: 'Which instrument is this?',
    whereLabel: 'Comes from',
    modes: ['choice'],
    load: () => import('./data/instrument.json').then(rounds),
  },
  {
    id: 'animal',
    title: 'AnimalSoundGuessr',
    tagline: 'Who made that noise?',
    species: 'moss',
    prompt: 'Which animal is this?',
    whereLabel: 'Lives in',
    modes: ['choice'],
    load: () => import('./data/animal.json').then(rounds),
  },
]

export const findGame = (id: string | undefined) => GAMES.find((g) => g.id === id)

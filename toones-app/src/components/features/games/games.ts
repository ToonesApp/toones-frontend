import type { SpeciesId } from '../../characters/clay'
import type { GameId } from './types'

export type GameDef = { id: GameId; title: string; tagline: string; species: SpeciesId }

/** Each game's mascot is the character whose color matches its category. */
export const GAMES: readonly GameDef[] = [
  { id: 'language', title: 'LanguageGuessr', tagline: 'Hear a phrase. Name the language.', species: 'ima' },
  { id: 'instrument', title: 'InstrumentGuessr', tagline: 'A few notes. Which instrument?', species: 'tomo' },
  { id: 'animal', title: 'AnimalSoundGuessr', tagline: 'Who made that noise?', species: 'moss' },
]

export const findGame = (id: string | undefined) => GAMES.find((g) => g.id === id)

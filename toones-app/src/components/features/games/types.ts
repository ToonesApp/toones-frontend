export type GameId = 'language' | 'instrument' | 'animal'

/** choice: pick one of four. type: write the answer. pin: place it on the globe. */
export type Mode = 'choice' | 'type' | 'pin'

export type Geo = { lat: number; lng: number }
export type Credit = { source: string; author: string; license: string; url: string }

/** One round. Each file under ./data is an array of these; adding a round is a data change only. */
export type GameItem = {
  id: string
  /** Static clip under /public/games/<game>/. A text-only round leaves it out and shows the caption. */
  audio?: string
  /** Text stand-in for the clip: the phrase itself, or a description of the sound. */
  caption: string
  answer: string
  /** Four choices including the answer, drawn from ./data/pools.json. */
  options: string[]
  difficulty: 1 | 2 | 3
  reveal: {
    fact: string
    geo?: Geo
    /** Region, culture or habitat, shown beside the globe. */
    where?: string
    /** Instrument family. */
    family?: string
    image?: string
    imageCredit?: Credit
  }
  credit: Credit
}

import type { SpeciesId } from '../../characters/clay'

export type MenuId = 'globe' | 'friends' | 'places' | 'inbox' | 'feed' | 'settings'

/** The characters are mascots for fixed menu items, never content categories. */
export const MENU: readonly { id: MenuId; label: string; species: SpeciesId }[] = [
  { id: 'globe', label: 'Globe', species: 'moss' },
  { id: 'friends', label: 'Friends', species: 'pip' },
  { id: 'places', label: 'Places', species: 'ima' },
  { id: 'inbox', label: 'Inbox', species: 'sol' },
  { id: 'feed', label: 'Feed', species: 'tomo' },
  { id: 'settings', label: 'Settings', species: 'ned' },
]

/** Where each menu item lives in the app. */
export const MENU_PATH: Record<MenuId, string> = {
  globe: '/home',
  friends: '/feed/friends',
  places: '/home?panel=places',
  inbox: '/feed/inbox',
  feed: '/feed',
  settings: '/feed/settings',
}

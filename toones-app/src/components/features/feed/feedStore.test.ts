import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/api', () => ({
  getToken: vi.fn(),
  getSounds: vi.fn(),
  uploadPhoto: vi.fn(),
  likeSound: vi.fn(),
  unlikeSound: vi.fn(),
  getComments: vi.fn(),
  postComment: vi.fn(),
  deleteComment: vi.fn(),
}))

import { deleteComment, getComments, getToken, likeSound, postComment, unlikeSound, type ApiComment } from '../../lib/api'
import { useFeed, visibleToones, type Toone } from './feedStore'

const token = vi.mocked(getToken)
const like = vi.mocked(likeSound)
const unlike = vi.mocked(unlikeSound)
const list = vi.mocked(getComments)
const post = vi.mocked(postComment)
const remove = vi.mocked(deleteComment)

const ID = 'a'.repeat(24)

function toone(over: Partial<Toone> = {}): Toone {
  return {
    id: ID, cat: 'Rain', name: 'Ana', handle: '@ana', when: 0, title: 'Rain', place: 'Here', caption: '',
    dur: 5, listens: 0, likes: 3, liked: false, comments: 1, lon: 0, lat: 0, audioUrl: null, mine: false,
    ...over,
  }
}

function apiComment(over: Partial<ApiComment> = {}): ApiComment {
  return {
    id: 'c1', text: 'nice', createdAt: '2026-01-01T00:00:00.000Z',
    author: { id: 'u1', username: 'bo', displayName: 'Bo', look: null }, mine: true, canDelete: true,
    ...over,
  }
}

const current = () => useFeed.getState().toones[0]

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  token.mockReturnValue('jwt')
  useFeed.setState({ toones: [toone()], threads: {}, toast: null })
})

afterEach(() => vi.useRealTimers())

describe('toggleLike', () => {
  it('updates right away, then takes the server count', async () => {
    const res = deferred<{ liked: boolean; likeCount: number }>()
    like.mockReturnValue(res.promise)
    useFeed.getState().toggleLike(ID)
    expect(current()).toMatchObject({ liked: true, likes: 4 })
    expect(like).toHaveBeenCalledWith(ID)

    res.resolve({ liked: true, likeCount: 10 })
    await vi.waitFor(() => expect(current().likes).toBe(10))
  })

  it('puts the like back when the request fails', async () => {
    useFeed.setState({ toones: [toone({ liked: true, likes: 3 })] })
    unlike.mockRejectedValue(new Error('Cannot reach the server.'))
    useFeed.getState().toggleLike(ID)
    expect(current()).toMatchObject({ liked: false, likes: 2 })

    await vi.waitFor(() => expect(current()).toMatchObject({ liked: true, likes: 3 }))
    expect(useFeed.getState().toast?.text).toBe('Cannot reach the server.')
  })

  it('ignores a slower response from an earlier tap', async () => {
    const first = deferred<{ liked: boolean; likeCount: number }>()
    like.mockReturnValue(first.promise)
    unlike.mockResolvedValue({ liked: false, likeCount: 3 })
    useFeed.getState().toggleLike(ID)
    useFeed.getState().toggleLike(ID)
    await vi.waitFor(() => expect(unlike).toHaveBeenCalled())

    first.resolve({ liked: true, likeCount: 4 })
    await Promise.resolve()
    await Promise.resolve()
    expect(current()).toMatchObject({ liked: false, likes: 3 })
  })

  it('asks to sign in instead of calling the server when signed out', () => {
    token.mockReturnValue(null)
    useFeed.getState().toggleLike(ID)
    expect(like).not.toHaveBeenCalled()
    expect(current().liked).toBe(false)
    expect(useFeed.getState().toast?.text).toBe('Sign in to like Toones')
  })

  it('never sends Toones that only live on this device', () => {
    useFeed.setState({ toones: [toone({ id: 'local-1' })] })
    useFeed.getState().toggleLike('local-1')
    expect(like).not.toHaveBeenCalled()
  })
})

describe('comments', () => {
  it('loads the thread and syncs the count', async () => {
    list.mockResolvedValue({ comments: [apiComment()], commentCount: 7, nextBefore: 'cur' })
    await useFeed.getState().loadComments(ID)
    expect(useFeed.getState().threads[ID]).toMatchObject({ status: 'ready', nextBefore: 'cur', items: [{ id: 'c1', name: 'Bo', handle: '@bo', text: 'nice', canDelete: true }] })
    expect(current().comments).toBe(7)
  })

  it('appends older comments using the cursor', async () => {
    list.mockResolvedValueOnce({ comments: [apiComment()], commentCount: 2, nextBefore: 'cur' })
    list.mockResolvedValueOnce({ comments: [apiComment({ id: 'c0' })], commentCount: 2, nextBefore: null })
    await useFeed.getState().loadComments(ID)
    await useFeed.getState().loadComments(ID, true)
    expect(list).toHaveBeenLastCalledWith(ID, { before: 'cur' })
    expect(useFeed.getState().threads[ID].items.map((c) => c.id)).toEqual(['c1', 'c0'])
    expect(useFeed.getState().threads[ID].nextBefore).toBeNull()
  })

  it('marks the thread as failed when loading fails', async () => {
    list.mockRejectedValue(new Error('down'))
    await useFeed.getState().loadComments(ID)
    expect(useFeed.getState().threads[ID].status).toBe('error')
  })

  it('posts a comment to the top of the thread', async () => {
    useFeed.setState({ threads: { [ID]: { status: 'ready', items: [], nextBefore: null } } })
    post.mockResolvedValue({ comment: apiComment({ id: 'new', text: 'hi' }), commentCount: 2 })
    await expect(useFeed.getState().addComment(ID, 'hi')).resolves.toBe(true)
    expect(post).toHaveBeenCalledWith(ID, 'hi')
    expect(useFeed.getState().threads[ID].items[0]).toMatchObject({ id: 'new', text: 'hi' })
    expect(current().comments).toBe(2)
  })

  it('keeps the text when posting fails', async () => {
    post.mockRejectedValue(new Error('Too many comments, slow down'))
    await expect(useFeed.getState().addComment(ID, 'hi')).resolves.toBe(false)
    expect(useFeed.getState().toast?.text).toBe('Too many comments, slow down')
    expect(current().comments).toBe(1)
  })

  it('requires sign-in to comment', async () => {
    token.mockReturnValue(null)
    await expect(useFeed.getState().addComment(ID, 'hi')).resolves.toBe(false)
    expect(post).not.toHaveBeenCalled()
  })

  it('removes a deleted comment', async () => {
    useFeed.setState({ threads: { [ID]: { status: 'ready', items: [{ id: 'c1', name: 'Bo', handle: '@bo', look: null, text: 'x', when: 0, canDelete: true }], nextBefore: null } } })
    remove.mockResolvedValue({ deleted: true, commentCount: 0 })
    await useFeed.getState().removeComment(ID, 'c1')
    expect(remove).toHaveBeenCalledWith(ID, 'c1')
    expect(useFeed.getState().threads[ID].items).toEqual([])
    expect(current().comments).toBe(0)
  })
})

describe('saved tab', () => {
  it('shows the Toones the server says you liked', () => {
    const toones = [toone({ id: 'x', liked: true }), toone({ id: 'y' })]
    expect(visibleToones({ toones, tab: 'saved', origin: null }).map((t) => t.id)).toEqual(['x'])
  })
})

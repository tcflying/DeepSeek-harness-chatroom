import sharp from 'sharp'
import { expect, it } from 'vitest'
import { ThumbnailCache } from '../src/thumbnails.js'
import { mkdtemp, readdir, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
it('produces a bounded real thumbnail and coalesces/cache hits without mutating the original', async () => {
  const input = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: '#649ad7' } }).png().toBuffer()
  const original = Buffer.from(input)
  const cache = new ThumbnailCache()
  const [left, right] = await Promise.all([cache.get('one', input), cache.get('one', input)])
  expect(left).toBe(right)
  expect(await cache.get('one', input)).toBe(left)
  expect(input).toEqual(original)
  expect(await sharp(left).metadata()).toMatchObject({ width: 480, height: 320, format: 'webp' })
  expect(left.length).toBeLessThan(input.length)
})
it('rejects invalid images and releases the pending slot', async () => {
  const cache = new ThumbnailCache()
  await expect(cache.get('invalid', Buffer.from('not an image'))).rejects.toThrow()
  await expect(cache.get('invalid', Buffer.from('not an image'))).rejects.toThrow()
})

it('stores a separate thumbnail file and reuses it after a cache instance restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'chatroom-thumbnails-'))
  try {
    const original = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#987654' } }).png().toBuffer()
    const first = await new ThumbnailCache(directory).get('../../not-a-path', original)
    const files = await readdir(directory)
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^[a-f0-9]{64}\.webp$/)
    expect(await readFile(join(directory, files[0]!))).toEqual(first)
    expect(await new ThumbnailCache(directory).get('../../not-a-path', original)).toEqual(first)
    expect((await readdir(directory)).length).toBe(1)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

import sharp from 'sharp'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Auth is checked by the route on every read, including cache hits. */
export class ThumbnailCache {
  private readonly cache = new Map<string, Buffer>()
  private readonly pending = new Map<string, Promise<Buffer>>()
  private bytes = 0
  private active = 0
  private readonly queue: Array<() => void> = []
  constructor(private readonly directory?: string) {}
  async get(key: string, data: Uint8Array): Promise<Buffer> {
    // Include source content and transform version: replacements never reuse stale pixels.
    key = createHash('sha256').update('webp-480x320-q72-v1\0').update(key).update(data).digest('hex')
    const cached = this.cache.get(key)
    if (cached) { this.cache.delete(key); this.cache.set(key, cached); return cached }
    const pending = this.pending.get(key)
    if (pending) return pending
    if (this.pending.size >= 16) throw new Error('Thumbnail capacity reached')
    const task = this.boundedCreate(key, data).then(buffer => {
      this.cache.set(key, buffer)
      this.bytes += buffer.length
      while (this.bytes > 16 * 1024 * 1024 || this.cache.size > 128) {
        const first = this.cache.keys().next().value!
        this.bytes -= this.cache.get(first)!.length
        this.cache.delete(first)
      }
      return buffer
    }).finally(() => this.pending.delete(key))
    this.pending.set(key, task)
    return task
  }

  private async boundedCreate(key: string, data: Uint8Array): Promise<Buffer> {
    if (this.active >= 2) await new Promise<void>(resolve => this.queue.push(resolve))
    else this.active++
    try { return await this.loadOrCreate(key, data) }
    finally {
      const next = this.queue.shift()
      if (next) next(); else this.active--
    }
  }

  private async loadOrCreate(key: string, data: Uint8Array): Promise<Buffer> {
    const path = this.directory ? join(this.directory, `${key}.webp`) : undefined
    if (path) {
      try {
        const saved = await readFile(path)
        const metadata = await sharp(saved).metadata()
        if (metadata.format === 'webp' && metadata.width! <= 480 && metadata.height! <= 320) return saved
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          // A partial/corrupt cache entry is disposable, never the original blob.
          await unlink(path).catch(() => undefined)
        }
      }
    }
    const buffer = await sharp(data, { limitInputPixels: 40_000_000, animated: false })
      .rotate().resize({ width: 480, height: 320, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 }).toBuffer()
    if (path && this.directory) {
      await mkdir(this.directory, { recursive: true, mode: 0o700 })
      const temporary = `${path}.${randomUUID()}.tmp`
      try {
        await writeFile(temporary, buffer, { flag: 'wx', mode: 0o600 })
        await rename(temporary, path)
      } finally { await unlink(temporary).catch(() => undefined) }
    }
    return buffer
  }
}

import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { generateImage, imageGenerationEndpoint, imageEditReferences, parseImageSelection } from '../src/image-generation.js'

const options = { baseUrl: 'http://127.0.0.1:10100/v1', model: 'gpt-image-2.5-flare', maxBytes: 1024 * 1024, timeoutMs: 1000 }
const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#3399ff' } }).png().toBuffer()
const response = () => Response.json({ data: [{ b64_json: png.toString('base64') }] })

describe('OpenCodex image generation', () => {
  it('uses the real original and a dimension-matched transparent rectangular mask on edits only', async () => {
    const selectionJson = JSON.stringify({ x: .25, y: .25, width: .5, height: .5 })
    const refs = await imageEditReferences({ data: png, mediaType: 'image/png' }, selectionJson)
    const mask = Buffer.from(refs.mask!.image_url.split(',')[1]!, 'base64')
    const decoded = await sharp(mask).raw().toBuffer({ resolveWithObject: true })
    expect(decoded.info).toMatchObject({ width: 8, height: 8, channels: 4 })
    expect(decoded.data[3]).toBe(255)
    expect(decoded.data[(3 * 8 + 3) * 4 + 3]).toBe(0)
    const request = vi.fn<typeof fetch>(async () => response())
    await generateImage({ prompt: 'Change only the selected region', sourceFileId: 'file-one', selectionJson }, { ...options, source: { data: png, mediaType: 'image/png' } }, undefined, request)
    expect(request.mock.calls[0]![0]).toBe('http://127.0.0.1:10100/v1/images/edits')
    expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toMatchObject(refs)
    expect(() => parseImageSelection('{"x":.9,"y":0,"width":.5,"height":1}')).toThrow()
    expect(() => parseImageSelection(JSON.stringify({ x: .9, y: 0, width: .5, height: 1 }))).toThrow()
    await expect(generateImage({ prompt: 'edit', sourceFileId: 'missing' }, options, undefined, request)).rejects.toThrow('缺少')
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('accepts only an administrator-configured loopback API, never caller URLs', () => {
    expect(imageGenerationEndpoint(options.baseUrl)).toBe('http://127.0.0.1:10100/v1/images/generations')
    for (const url of ['https://evil.example/v1', 'http://user:secret@localhost/v1', 'http://localhost/v1?token=x', 'http://localhost/v1#x']) {
      expect(() => imageGenerationEndpoint(url)).toThrow()
    }
  })
  it('calls once with the configured image model and returns validated PNG bytes', async () => {
    const request = vi.fn<typeof fetch>(async () => response())
    const result = await generateImage({ prompt: 'A blue circle', size: '1024x1024', quality: 'low' }, options, undefined, request)
    expect(result.data).toEqual(png)
    expect(result.mediaType).toBe('image/png')
    expect(request).toHaveBeenCalledOnce()
    const init = request.mock.calls[0]![1] as RequestInit
    expect(init.redirect).toBe('error')
    expect(JSON.parse(init.body as string)).toMatchObject({ model: options.model, n: 1, output_format: 'png', quality: 'low' })
  })
  it('fails closed without retrying, exposing credentials, or downloading supplied URLs', async () => {
    const request = vi.fn(async () => Response.json({ error: { message: 'Bearer SECRET_VALUE' } }, { status: 401 }))
    await expect(generateImage({ prompt: 'circle' }, options, undefined, request)).rejects.toThrow('HTTP 401')
    expect(request).toHaveBeenCalledOnce()
    await expect(generateImage({ prompt: 'circle' }, options, undefined, async () => Response.json({ data: [{ url: 'https://evil.example/file' }] }))).rejects.toThrow('图片数据')
  })
  it('rejects invalid, oversized or empty image data', async () => {
    for (const b64_json of ['', 'not base64', Buffer.from('not an image').toString('base64')]) {
      await expect(generateImage({ prompt: 'circle' }, options, undefined, async () => Response.json({ data: [{ b64_json }] }))).rejects.toThrow()
    }
    await expect(generateImage({ prompt: 'circle' }, { ...options, maxBytes: 4 }, undefined, async () => response())).rejects.toThrow('上限')
  })
  it('does not send cancelled or invalid requests', async () => {
    const request = vi.fn(async () => response())
    const controller = new AbortController()
    controller.abort()
    await expect(generateImage({ prompt: 'circle' }, options, controller.signal, request)).rejects.toThrow()
    await expect(generateImage({ prompt: ' ' }, options, undefined, request)).rejects.toThrow()
    expect(request).not.toHaveBeenCalled()
  })
})

import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'

export interface ImageGenerationInput {
  prompt: string
  size?: 'auto' | '1024x1024' | '1024x1536' | '1536x1024'
  quality?: 'low' | 'medium' | 'high'
  sourceFileId?: string
  selectionJson?: string
}

export interface ImageGenerationOptions {
  baseUrl: string
  model: string
  maxBytes: number
  timeoutMs: number
  source?: { data: Uint8Array; mediaType: string }
}

export interface ImageSelection { x: number; y: number; width: number; height: number }
export function parseImageSelection(value: string): ImageSelection {
  const selection = JSON.parse(value) as ImageSelection
  if (!selection || !['x', 'y', 'width', 'height'].every(key => typeof selection[key as keyof ImageSelection] === 'number' && Number.isFinite(selection[key as keyof ImageSelection]))
    || selection.x < 0 || selection.y < 0 || selection.width <= 0 || selection.height <= 0
    || selection.x + selection.width > 1.000001 || selection.y + selection.height > 1.000001) throw new Error('改图选区无效，必须位于原图内。')
  return selection
}

export async function imageEditReferences(source: { data: Uint8Array; mediaType: string }, selectionJson?: string) {
  const { default: sharp } = await import('sharp')
  const data = await sharp(source.data, { failOn: 'error', limitInputPixels: 16_777_216 }).rotate().png().toBuffer()
  if (data.length > 15 * 1024 * 1024) throw new Error('改图原图过大。')
  const images = [{ image_url: `data:image/png;base64,${data.toString('base64')}` }]
  if (!selectionJson) return { images }
  const selection = parseImageSelection(selectionJson)
  const { width, height } = await sharp(data).metadata()
  if (!width || !height) throw new Error('无法读取原图尺寸。')
  const mask = Buffer.alloc(width * height * 4, 255)
  const left = Math.floor(selection.x * width), top = Math.floor(selection.y * height)
  const right = Math.min(width, Math.ceil((selection.x + selection.width) * width))
  const bottom = Math.min(height, Math.ceil((selection.y + selection.height) * height))
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) mask[(y * width + x) * 4 + 3] = 0
  const encoded = await sharp(mask, { raw: { width, height, channels: 4 } }).png().toBuffer()
  return { images, mask: { image_url: `data:image/png;base64,${encoded.toString('base64')}` } }
}

/** Deployment-only route. Neither model arguments nor returned URLs control the destination. */
export function imageGenerationEndpoint(baseUrl: string): string {
  const url = new URL(baseUrl)
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)
    || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/u, '') !== '/v1') {
    throw new Error('生图接口必须是管理员配置的本机 OpenCodex /v1 地址。')
  }
  return `${url.origin}/v1/images/generations`
}

/** One bounded, cancellable request; an uncertain paid operation is never retried automatically. */
export async function generateImage(
  input: ImageGenerationInput,
  options: ImageGenerationOptions,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
): Promise<{ data: Buffer; mediaType: 'image/png' }> {
  signal?.throwIfAborted()
  const prompt = input.prompt.trim()
  if (!prompt || prompt.length > 16_000) throw new Error('图片描述必须为 1–16000 个字符。')
  const deadline = AbortSignal.any([AbortSignal.timeout(options.timeoutMs), ...(signal ? [signal] : [])])
  if (input.sourceFileId && !options.source) throw new Error('改图缺少已授权原图，未提交生成。')
  if (input.selectionJson && !options.source) throw new Error('选区不能用于没有原图的生成请求。')
  const references = options.source ? await imageEditReferences(options.source, input.selectionJson) : {}
  deadline.throwIfAborted()
  const endpoint = imageGenerationEndpoint(options.baseUrl).replace(/generations$/u, options.source ? 'edits' : 'generations')
  const response = await request(endpoint, {
    method: 'POST',
    redirect: 'error',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer OC_LOCAL_PLACEHOLDER' },
    body: JSON.stringify({ model: options.model, prompt, n: 1, output_format: 'png', size: input.size ?? 'auto', quality: input.quality ?? 'medium', ...references }),
    signal: deadline,
  })
  if (!response.ok) {
    await response.body?.cancel()
    // Upstream bodies can contain URLs, credentials and internal account identifiers.
    throw Object.assign(new Error(`OpenCodex 生图失败（HTTP ${response.status}）；未自动重试。`), { status: response.status })
  }
  const limit = Math.ceil(options.maxBytes / 3) * 4 + 65_536
  const reader = response.body?.getReader()
  if (!reader) throw new Error('生图接口没有返回图片数据。')
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    for (;;) {
      deadline.throwIfAborted()
      const next = await reader.read()
      if (next.done) break
      bytes += next.value.byteLength
      if (bytes > limit) throw new Error('生图响应超过文件大小上限。')
      chunks.push(next.value)
    }
  } finally { await reader.cancel().catch(() => undefined) }
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { data?: Array<{ b64_json?: unknown }> }
  const encoded = payload.data?.[0]?.b64_json
  if (typeof encoded !== 'string' || !encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded)) {
    throw new Error('生图接口没有返回有效的图片数据。')
  }
  const data = Buffer.from(encoded, 'base64')
  if (data.toString('base64') !== encoded) throw new Error('生图接口返回的图片编码无效。')
  if (data.byteLength > options.maxBytes) throw new Error('生成图片超过文件大小上限。')
  if (!data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('生图接口返回的不是 PNG 图片数据。')
  const { default: sharp } = await import('sharp')
  const image = sharp(data, { failOn: 'error', limitInputPixels: 16_777_216 })
  const metadata = await image.metadata()
  if (metadata.format !== 'png' || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) throw new Error('生成图片格式无法识别。')
  await image.stats() // Decode pixels, not just a forged header, before durable storage.
  deadline.throwIfAborted()
  return { data, mediaType: 'image/png' }
}

export function registerImageEditTool(ctx: Context, generate: (input: ImageGenerationInput, signal: AbortSignal) => Promise<string>): () => void {
  return ctx.tools.register(defineTool({
    name: 'chatroom_edit_image',
    description: 'Edit an existing authorized room image through OpenCodex. Available to GPT and MiniMax M3. Use the actual source file id from the original file marker, never guess it or substitute text-to-image. Optional selectionJson defines a normalized rectangle x,y,width,height in [0,1]. Keep the rest of the image as described. Never retry an uncertain paid call automatically.',
    parameters: {
      prompt: { type: 'string', required: true },
      sourceFileId: { type: 'string', required: true },
      selectionJson: { type: 'string', description: 'Optional JSON rectangle {"x":0.1,"y":0.2,"width":0.3,"height":0.4}, relative to the original image.' },
      quality: { type: 'string', enum: ['low', 'medium', 'high'] },
    },
    output: { schema: { type: 'object', additionalProperties: false, properties: { content: { type: 'string', required: true } } }, render: (_args, value) => [{ type: 'text', text: value.content }] },
    async execute(args, exec) {
      const content = await generate(args, exec.signal)
      exec.deferContext(createUserMessage({ content: [{ type: 'text', text: `Image edit succeeded. Return exactly this real preview and file marker, do not generate again:\n${content}` }], source: { kind: 'plugin', plugin: 'deepseek-harness-chatroom', form: 'notice', summary: 'Deliver edited image' } }))
      return { content }
    },
    presentCall: () => ({ card: 'generic', title: '框选改图 · OpenCodex', kind: 'other' }),
  }))
}

export function registerImageGenerationTool(
  ctx: Context,
  generate: (input: ImageGenerationInput, signal: AbortSignal) => Promise<string>,
): () => void {
  return ctx.tools.register(defineTool({
    name: 'chatroom_generate_image',
    description: 'Generate a real image using the configured OpenCodex OpenAI image engine and return its authenticated chat preview/download. Available to every chat model, including GPT and MiniMax M3. Use this tool for requests to draw or generate images; do not substitute shell code, prose, or invented files. One image per call. Do not automatically retry a failed or cancelled call.',
    parameters: {
      prompt: { type: 'string', required: true, description: 'Complete description of the requested image.' },
      size: { type: 'string', enum: ['auto', '1024x1024', '1024x1536', '1536x1024'] },
      quality: { type: 'string', enum: ['low', 'medium', 'high'] },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { content: { type: 'string', required: true } } },
      render: (_args, value) => [{ type: 'text', text: value.content }],
    },
    async execute(args, exec) {
      const content = await generate(args, exec.signal)
      exec.deferContext(createUserMessage({
        content: [{ type: 'text', text: `The image was generated and stored successfully. Include the following preview and download in your next assistant response exactly, including invisible metadata. Do not call chatroom_action or any other tool, invent another URL, or regenerate the same image:\n${content}` }],
        source: { kind: 'plugin', plugin: 'deepseek-harness-chatroom', form: 'notice', summary: 'Deliver generated image' },
      }))
      return { content }
    },
    presentCall: () => ({ card: 'generic', title: '生成图片 · OpenCodex', kind: 'other' }),
  }))
}

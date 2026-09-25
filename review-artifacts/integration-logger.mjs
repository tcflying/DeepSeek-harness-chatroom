import { Logger } from 'file:///C:/Users/datoo/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/cordis/lib/index.js'
export const name = 'integration-diagnostics'
export function apply(ctx) {
  const exporter = { colors: 0, levels: { default: 3 }, export(message) {
    if (!message.name?.includes('chatroom') && message.type !== 'error') return
    const text = Logger.format(exporter, message)
      .replace(/([?&]token=)[^\s&]+/gi, '$1[REDACTED]')
      .replace(/(Bearer\s+)[\w.-]+/gi, '$1[REDACTED]')
      .slice(0, 2400)
    console.error(JSON.stringify({ type: message.type, name: message.name, message: text }))
  } }
  for (const message of ctx.logger.buffer) exporter.export(message)
  ctx.logger.exporter(exporter)
}
export default { name, apply }

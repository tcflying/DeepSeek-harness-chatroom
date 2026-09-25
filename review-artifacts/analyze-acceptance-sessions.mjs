import { readFile } from 'node:fs/promises'
import { zstdDecompressSync } from 'node:zlib'
const root = 'C:/Users/datoo/.dsh/chatroom-server/sessions/--C-Users-datoo-.dsh-chatroom-workspace--/'
for (const id of [
  'chatroom-agent-v1-f9cb9dc4-23b6-46ad-b7ff-3944cced19ce-4b9093cd-d3ce-4d5e-8a10-39c8e9c5e7b4',
  'chatroom-agent-v1-f9cb9dc4-23b6-46ad-b7ff-3944cced19ce-ce11b24a-1b9e-401e-b6bf-af550bcedc46',
]) {
  const compressed = await readFile(root + id + '/session.jsonl.zstd')
  const chunks = []
  for (let offset = 0; offset < compressed.length;) {
    const decoded = zstdDecompressSync(compressed.subarray(offset), { info: true })
    if (!decoded.engine.bytesWritten) throw new Error('No progress decoding session frame')
    chunks.push(decoded.buffer)
    offset += decoded.engine.bytesWritten
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  const records = raw.split('\n').filter(Boolean).map(line => JSON.parse(line))
  console.log(JSON.stringify({ session: id, count: records.length, firstRecordKeys: records.slice(0, 3).map(record => Object.keys(record)) }))
  for (const record of records) {
    const event = record.event ?? record
    if (!['turn/start','step/start','assistant/chunk','assistant/message','turn/end'].includes(event.type)) continue
    console.log(JSON.stringify({ seq: event.seq, time: event.time, type: event.type,
      ...(event.type === 'assistant/chunk' ? { chunkType: event.data?.chunk?.type } : {}),
      ...(event.type === 'assistant/message' ? { source: event.data?.message?.source,
        usage: event.data?.usage,
        reply: event.data?.message?.content?.filter(part => part.type === 'text').map(part => part.text).join('\n') } : {}) }))
  }
}

import { lookup } from 'node:dns/promises'
import { readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const manifest = JSON.parse(await readFile(new URL('./GALLERY-MEDIA-MANIFEST-20260911.json', import.meta.url), 'utf8'))
const evidence = { at: new Date().toISOString(), dns: await lookup('talk.opcvip.net', { all: true }), proxyEnvironment: Object.keys(process.env).filter(k => /proxy/i.test(k)), probes: [] }
for (const path of ['/plugins/deepseek-harness-chatroom/api/health', manifest.clientUrl]) {
  const url = new URL(path, 'https://talk.opcvip.net').href
  try { const r = await fetch(url, { signal: AbortSignal.timeout(15000) }); evidence.probes.push({ client: 'node-fetch', kind: path.includes('/api/health') ? 'health' : 'client-module', status: r.status, bytes: (await r.arrayBuffer()).byteLength }) }
  catch (e) { evidence.probes.push({ client: 'node-fetch', kind: path.includes('/api/health') ? 'health' : 'client-module', error: e.cause?.code ?? e.name }) }
  try { const r = await promisify(execFile)('curl.exe', ['--max-time', '20', '-s', '-o', 'NUL', '-w', '%{http_code} %{remote_ip} %{time_total}', url], { windowsHide: true, timeout: 22000 }); evidence.probes.push({ client: 'curl', kind: path.includes('/api/health') ? 'health' : 'client-module', result: r.stdout }) }
  catch (e) { evidence.probes.push({ client: 'curl', error: e.code }) }
}
await writeFile(new URL('./GALLERY-MEDIA-tls-20260911.json', import.meta.url), JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence))

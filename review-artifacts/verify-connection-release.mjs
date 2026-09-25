import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const root = 'C:/Users/datoo/.dsh/chatroom-server'
const release = `${root}/profiles/web/plugin-releases/chatroom-1.5.0-codex.rc1.16`
const sha = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const overlay = await readFile(`${root}/profiles/web/cordis.patch.yml`, 'utf8')
assert.match(overlay, /- id: chatroom\s+disabled: true/)
assert.match(overlay, /chatroom-image-release-rc113\s+name:.*chatroom-1\.5\.0-codex\.rc1\.16\/dist\/index\.js/)
assert.match(overlay, /imageGenerationBaseUrl: http:\/\/127\.0\.0\.1:10100\/v1/)
const hashes = {}
for (const file of ['dist/index.js','dist/client.js']) {
  hashes[file] = await sha(`${release}/${file}`)
  assert.equal(hashes[file], await sha(new URL(`../${file}`, import.meta.url)))
}
const startupSha256 = await sha('C:/Users/datoo/.dsh/service/run-dsh-chatroom.ps1')
assert.equal(startupSha256,'4dbe5244a55eaf875c80d7069ee8de13232bad24a6ef7b54fda520bcb5cbba3e')
const coreSha256 = await sha('C:/Users/datoo/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/lib/profile-boot-BTzzdrGY.js')
assert.equal(coreSha256, await sha('C:/Users/datoo/.dsh/service/runtime-0.1.2-rc.1/lib/profile-boot-BTzzdrGY.js'))
const services = []
for (const base of ['http://127.0.0.1:3181','https://talk.opcvip.net']) {
  const response = await fetch(base+'/plugins/deepseek-harness-chatroom/api/health',{signal:AbortSignal.timeout(12000)})
  const health = await response.json()
  assert.equal(response.status,200)
  assert.deepEqual(health,{ready:true,diagnostics:{enabled:true,healthy:true,dropped:0}})
  const file = await fetch(base+'/plugins/deepseek-harness-chatroom/api/files/94902804-6df9-4c8b-a751-b6a0a3823e7e',{signal:AbortSignal.timeout(12000)})
  assert.equal(file.status,401)
  await file.body?.cancel()
  services.push({base,status:response.status,health,anonymousFileStatus:file.status})
}
const lines = (await readFile(`${root}/chatroom/diagnostics/events.jsonl`,'utf8')).trim().split('\n').map(s=>JSON.parse(s))
assert.ok(lines.some(r=>r.event==='runtime.start'))
assert.ok(lines.some(r=>r.event==='provider.probe'&&r.healthy===true&&r.providerPid>0))
const automation = await readFile('G:/CodexData/codex-home/automations/automation-4/automation.toml','utf8')
assert.match(automation,/status = "ACTIVE"/)
assert.match(automation,/INTERVAL=5/)
const result={at:new Date().toISOString(),version:'1.5.0-codex.rc1.16',hashes,startupSha256,coreSha256,services,journal:lines.slice(-5),automation:{id:'automation-4',active:true,intervalMinutes:5,schedulerExecution:'not claimed; immediate observer samples verified'}}
await writeFile(new URL('./CONNECTION-RELEASE-20260911.json',import.meta.url),JSON.stringify(result,null,2))
console.log(JSON.stringify(result,null,2))

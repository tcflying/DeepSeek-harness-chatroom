import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const version='1.5.0-codex.rc1.32',home='C:/Users/datoo/.dsh/chatroom-server'
const release=`${home}/profiles/web/plugin-releases/chatroom-${version}`
const sha=x=>createHash('sha256').update(x).digest('hex')
const json=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''))
const artifact=n=>new URL('./'+n,import.meta.url)
const overlay=await readFile(home+'/profiles/web/cordis.patch.yml','utf8')
assert.match(overlay,/id: chatroom-image-release-rc113\s+name:.*chatroom-1\.5\.0-codex\.rc1\.32\/dist\/index\.js/)
assert.ok(overlay.includes('imageGenerationBaseUrl: http://127.0.0.1:10100/v1'))
assert.ok(overlay.includes('miniMaxCodePath: C:/Users/datoo/.minimax/bin/mcode-tools.cmd'))
assert.equal((await json(release+'/package.json')).version,version)
const bundles=[]
for(const file of ['dist/index.js','dist/client.js']){
 const local=await readFile(new URL('../'+file,import.meta.url)),installed=await readFile(release+'/'+file)
 assert.equal(sha(local),sha(installed));bundles.push({file,sha256:sha(local),bytes:local.length})
}
assert.equal(bundles[0].sha256,sha(await readFile(home+'/profiles/web/plugin-releases/chatroom-1.5.0-codex.rc1.27/dist/index.js')))
const health=await fetch('http://127.0.0.1:3181/plugins/deepseek-harness-chatroom/api/health',{signal:AbortSignal.timeout(8000)}).then(r=>r.json())
assert.deepEqual(health,{ready:true,diagnostics:{enabled:true,healthy:true,dropped:0}})
const member=await json(artifact('RC132-member-stability.json'));assert.equal(member.passed,true)
assert.ok(member.roles[0].allStreamsConnected&&member.roles[0].realHistoryLoaded&&member.roles[0].controlsRestricted)
assert.ok(member.roles[0].api.every(x=>x.status===403))
const admin=await json(artifact('RC132-GPT-iab-live.json'));assert.ok(admin.admin&&admin.buttons.includes('设置')&&admin.buttons.includes('AI 成员')&&admin.buttons.includes('群管理'))
const providers=[]
for(const label of ['GPT','M3']){
 const proof=await json(artifact(`RC132-progress-${label}-stream.json`))
 assert.ok(proof.passed&&proof.cleaned);assert.equal(proof.events.at(-1).status,'completed')
 assert.ok(proof.events.some(e=>e.status==='writing'));assert.ok(!proof.events.some(e=>e.status==='tool'))
 providers.push({label,eventCount:proof.events.length,states:[...new Set(proof.events.map(e=>e.status))],cleaned:proof.cleaned})
}
const frames=await Promise.all([0,1,2].map(i=>json(artifact(`RC132-M3-iab-live-${i}.json`))))
assert.deepEqual(frames.map(f=>f.progress[0]?.state),['waiting','writing','completed'])
const isolated=await json(artifact('RC127-isolated-r2-acceptance.json'));assert.equal(isolated.passed,true)
const record={at:new Date().toISOString(),version,bundles,overlaySha256:sha(overlay),health,memberProof:'RC132-member-stability.json',adminProof:'RC132-GPT-iab-live.json',providers,originalBrowserFrames:frames,isolatedProof:{file:'RC127-isolated-r2-acceptance.json',scope:'Retained real native cold-start; byte-identical server bundle. Current client independently browser-tested.'},tests:{unit:396,affectedBrowser:6},limits:['Group/named-agent and branch progress; not a new Solo backend progress feed.','No claim of indefinite WAN uptime or historical 13:34 initiating-trigger recovery.','Earlier browser-control timeouts and pre-readiness 503 attempts retained; not counted as passes.']}
await writeFile(artifact('RC132-DELIVERY-MANIFEST.json'),JSON.stringify(record,null,2))
console.log(JSON.stringify({version,bundles,health,providers,member:true,originalBrowser:true}))

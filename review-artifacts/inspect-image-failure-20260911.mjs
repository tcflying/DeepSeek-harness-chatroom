import { readFile, readdir, writeFile } from 'node:fs/promises'
import { zstdDecompressSync } from 'node:zlib'
const root = 'C:/Users/datoo/.dsh/chatroom-server'
const roomId = '29f58452-d88b-4495-9aee-03028b49df15'
const compact = process.argv.includes('--compact')
const summaries = []
const redact = text => text.replace(/(Bearer\s+)[^\s"']+/gi,'$1<REDACTED>').replace(/([?&](?:token|key|auth|code)=)[^\s&"']+/gi,'$1<REDACTED>').replace(/("?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)"?\s*[:=]\s*"?)[^\s",}]+/gi,'$1<REDACTED>')
if(process.argv.includes('--lifecycle')) {
  for (const path of ['C:/Users/datoo/.opencodex/tray-actions.log','C:/Users/datoo/.opencodex/watchdog.log','C:/Users/datoo/.opencodex/service.log','C:/Users/datoo/.opencodex/crash.log','C:/ProgramData/Servy/managed-logs/opencodex-out.log','C:/ProgramData/Servy/managed-logs/opencodex-err.log']) {
    const all = await readFile(path,'utf8').catch(()=> '')
    console.log(JSON.stringify({path,lines:all.split(/\r?\n/).filter(l=>/2026-09-11[T ](?:05|13):[234]/.test(l)).slice(-25).map(l=>redact(l).slice(0,750))}))
  }
  process.exit(0)
}
if(process.argv.includes('--diagnostic-range')) {
  for(const path of ['C:/Users/datoo/.opencodex/runtime-diagnostics.jsonl.1','C:/Users/datoo/.opencodex/runtime-diagnostics.jsonl']) {
    const rows=(await readFile(path,'utf8')).split('\n').filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}})
    console.log(JSON.stringify({path,count:rows.length,first:rows.slice(0,1).map(r=>({time:r.at})),last:rows.slice(-1).map(r=>({time:r.at})),incident:rows.filter(r=>Date.parse(r.at)>=Date.parse('2026-09-11T05:20:00Z')&&Date.parse(r.at)<=Date.parse('2026-09-11T05:43:28Z')).map(r=>({time:r.at,pid:r.pid,kind:r.kind,keys:Object.keys(r)})).slice(-25),beforeIncident:rows.filter(r=>Date.parse(r.at)<Date.parse('2026-09-11T05:20:00Z')).slice(-3).map(r=>({time:r.at,pid:r.pid,kind:r.kind}))}))
  }
  process.exit(0)
}
const data = JSON.parse(await readFile(root+'/storages/chatroom_agents.json','utf8'))
const profiles=[]
function visit(value) {
  if (!value || typeof value !== 'object') return
  if(value.roomId===roomId && typeof value.name==='string') profiles.push(Object.fromEntries(['id','name','roomId','sessionId','provider','model','enabled','updatedAt'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]])))
  for(const item of Object.values(value)) if(item && typeof item==='object') visit(item)
}
visit(data)
if (!compact) console.log(JSON.stringify({profiles},null,2))
const workspace=(await readdir(root+'/sessions',{withFileTypes:true})).find(e=>e.isDirectory()&&e.name.includes('chatroom-workspace'))
if(workspace && !compact) console.log(JSON.stringify({sessionDirectory:root+'/sessions/'+workspace.name,entries:(await readdir(root+'/sessions/'+workspace.name)).filter(name=>name.includes('agent') || profiles.some(p=>p.sessionId&&name.includes(p.sessionId))).slice(-30)},null,2))
const log=await readFile('C:/Users/datoo/.opencodex/servy-runtime.log','utf8')
const lines=log.split(/\r?\n/).filter(line=>/listening|server (started|stopped)|shutting down|shutdown|EADDRINUSE|SIGTERM|SIGINT|starting opencodex/i.test(line)).slice(-30)
if (!compact) console.log(JSON.stringify({openCodexLifecycle:lines.map(line=>redact(line).slice(0,500))},null,2))
if (workspace) for (const profile of profiles) {
  const path=`${root}/sessions/${workspace.name}/chatroom-agent-v1-${roomId}-${profile.id}/session.jsonl.zstd`
  const compressed=await readFile(path)
  const chunks=[]
  for(let offset=0;offset<compressed.length;) {
    const decoded=zstdDecompressSync(compressed.subarray(offset),{info:true})
    if(!decoded.engine.bytesWritten) throw new Error('No zstd decode progress')
    chunks.push(decoded.buffer); offset+=decoded.engine.bytesWritten
  }
  const records=Buffer.concat(chunks).toString('utf8').split('\n').filter(Boolean).map(JSON.parse)
  const evidence=[]
  const types={}
  for(const record of records) {
    const event=record.event??record
    types[event.type]=(types[event.type]??0)+1
    const serial=JSON.stringify(event)
    const match=/fetch failed|ECONN[A-Z]+|UND_ERR_[A-Z_]+|socket hang up|no logon SID/.exec(serial)
    if(match) evidence.push({seq:event.seq,time:event.time,type:event.type,excerpt:redact(serial.slice(Math.max(0,match.index-120),match.index+1600))})
    if(event.time>1789102800000 && (event.type==='llm/retry' || event.type==='turn/end' || (event.type==='assistant/chunk' && /error/i.test(event.data?.chunk?.type??'')))) {
      evidence.push({seq:event.seq,time:event.time,type:event.type,detail:redact(JSON.stringify(event.data)).slice(0,2200)})
    }
  }
  const events = records.map(record => record.event ?? record)
  if(process.argv.includes('--context')) {
    console.log(JSON.stringify({profile:profile.name,contexts:events.filter(e=>['request/header','request/context','user/message'].includes(e.type)).slice(-4).map(e=>({seq:e.seq,time:e.time,type:e.type,data:e.type==='request/header'?{config:e.data.header.config,profileInstructions:e.data.header.system.match(/角色指令：[^\n]+/)?.[0],imageToolPresent:e.data.header.tools.some(t=>t.name==='chatroom_generate_image')}:redact(JSON.stringify(e.data)).slice(0,1500)}))},null,2))
  }
  const recentTools = events.filter(e => e.type === 'tool/call' || e.type === 'tool/result').slice(-2).map(e => ({ seq: e.seq, time: e.time, type: e.type, data: redact(JSON.stringify(e.data)).slice(0,2400) }))
  const summary = {profile:profile.name,types,...(compact?{}:{errors:evidence.slice(-10)}),recentTools,latest:events.slice(-3).map(e=>({seq:e.seq,time:e.time,type:e.type,...(e.type==='turn/end'?{data:e.data}:{dataKeys:Object.keys(e.data??{})})}))}
  summaries.push(summary)
  console.log(JSON.stringify(summary,null,2))
}
if(process.argv.includes('--save')) await writeFile(new URL('./RECHECK-20260911-native-events.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),summaries},null,2))

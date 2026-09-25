import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
const label=process.argv[2]; assert.ok(['GPT','M3'].includes(label))
const secrets=JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json','utf8')).replace(/^\uFEFF/,''))
const base='http://127.0.0.1:3181',prefix='/plugins/deepseek-harness-chatroom/api'
const login=await fetch(base+prefix+'/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:secrets.adminUsername,password:secrets.adminPassword}),signal:AbortSignal.timeout(15000)})
assert.equal(login.status,200)
const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; '), session=await login.json()
const templateRoom=session.rooms.find(r=>r.title.startsWith('GPT 与 M3 生图验收'));assert.ok(templateRoom)
const {room}=JSON.parse(await readFile(new URL('./RC130-acceptance-room.json',import.meta.url),'utf8'))
const post=async(path,data)=>{const r=await fetch(base+prefix+path,{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path);return r.json()}
const receipt={version:'1.5.0-codex.rc1.32',label,at:new Date().toISOString(),roomId:room.id,events:[],passed:false}
const save=()=>writeFile(new URL(`./RC132-progress-${label}-stream.json`,import.meta.url),JSON.stringify(receipt,null,2))
const stop=new AbortController(); let profile; let reader
try{
 const overview=await fetch(base+prefix+'/rooms/agents?roomId='+templateRoom.id,{headers:{Cookie:cookie},signal:AbortSignal.timeout(15000)}).then(r=>r.json())
 const template=overview.profiles.find(p=>p.name===label+'生图验收'); assert.ok(template)
 const name=label+'文字进展验收'+Date.now()
 const result=await post('/rooms/agents',{roomId:room.id,action:'create',name,role:'仅文字界面验收',instructions:'只回复文字，不调用任何工具，不生成图片、音频、视频。',provider:template.provider,model:template.model,reasoningEffort:template.reasoningEffort??'',enabled:true})
 profile=result.profiles.find(p=>p.name===name);assert.ok(profile)
 receipt.profileId=profile.id;receipt.name=name
 await save();console.log(JSON.stringify({stage:'created',name,roomId:room.id}))
 const stream=await fetch(base+prefix+'/events?roomId='+room.id,{headers:{Cookie:cookie},signal:stop.signal}); assert.equal(stream.status,200)
 reader=(async()=>{
  let buffer=''; const decoder=new TextDecoder()
  for await(const chunk of stream.body){
   buffer+=decoder.decode(chunk,{stream:true})
   for(;;){const end=buffer.indexOf('\n\n');if(end<0)break;const frame=buffer.slice(0,end);buffer=buffer.slice(end+2)
    const raw=frame.split('\n').find(l=>l.startsWith('data: '))?.slice(6);if(!raw)continue
    const event=JSON.parse(raw)
    if(event.type==='model-progress'&&event.progress.name===name){receipt.events.push(event.progress);console.log(JSON.stringify({status:event.progress.status,text:event.progress.text,seq:event.progress.seq}));await save()}
   }
  }
 })().catch(e=>{if(!stop.signal.aborted)receipt.streamError=String(e)})
 const marker=label+'-PROGRESS-'+Date.now()
 await post('/prompt',{roomId:room.id,requestId:marker,mode:'queue',content:[{type:'text',text:`@${name} 这是实时进展验收，不调用工具。请逐行给出 40 条简短的聊天界面验收项目，每条约 20 字，最后一行原样写 ${marker}。`}]})
 const deadline=Date.now()+90000
 while(!receipt.events.some(e=>['completed','failed','stopped'].includes(e.status))){assert.ok(Date.now()<deadline,'Provider deadline');await new Promise(r=>setTimeout(r,250))}
 assert.equal(receipt.events.at(-1).status,'completed')
 assert.ok(receipt.events.some(e=>e.status==='writing'||e.status==='thinking'))
 assert.ok(!receipt.events.some(e=>e.status==='tool'))
 receipt.passed=true;await save()
 console.log('Text-only stream completed; retaining progress briefly for screenshot')
 await new Promise(r=>setTimeout(r,10000))
}catch(e){receipt.error=String(e);process.exitCode=1}
finally{
 stop.abort();await reader
 if(profile){if(!receipt.passed)await post('/rooms/agents',{roomId:room.id,profileId:profile.id,action:'cancel'}).catch(()=>{});await post('/rooms/agents',{roomId:room.id,profileId:profile.id,action:'delete'}).then(()=>{receipt.cleaned=true},e=>{receipt.cleanupError=String(e)})}
 await save(); console.log(JSON.stringify({passed:receipt.passed,error:receipt.error,cleaned:receipt.cleaned}))
}

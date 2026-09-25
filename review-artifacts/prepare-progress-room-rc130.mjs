import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
const path=new URL('./RC130-acceptance-room.json',import.meta.url)
const s=JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json','utf8')).replace(/^\uFEFF/,''))
const base='http://127.0.0.1:3181',prefix='/plugins/deepseek-harness-chatroom/api'
async function login(admin){const r=await fetch(base+prefix+'/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:admin?s.adminUsername:s.testUsername,password:admin?s.adminPassword:s.testPassword}),signal:AbortSignal.timeout(15000)});assert.equal(r.status,200);return {cookie:r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; '),session:await r.json()}}
const admin=await login(true),member=await login(false)
let record;try{record=JSON.parse(await readFile(path,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
async function post(route,data,status=200){const r=await fetch(base+prefix+route,{method:'POST',headers:{Cookie:admin.cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});assert.equal(r.status,status);return r.json()}
if(!record){const result=await post('/rooms',{title:'权限与进展验收 20260912'},201);record={room:result.room,at:new Date().toISOString()};await writeFile(path,JSON.stringify(record,null,2))}
await post('/rooms/manage',{roomId:record.room.id,action:'add-members',participantIds:[member.session.identity.participantId]})
console.log(JSON.stringify({room:record.room,memberAdded:true}))

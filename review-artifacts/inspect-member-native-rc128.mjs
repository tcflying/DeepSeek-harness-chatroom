import { readFile } from 'node:fs/promises'
const s = JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json','utf8')).replace(/^\uFEFF/,''))
const b = 'http://127.0.0.1:3181', p = '/plugins/deepseek-harness-chatroom/api'
for (const role of ['member','super-admin']) {
  const login = await fetch(b+p+'/auth/login', {method:'POST',headers:{Origin:b,'Content-Type':'application/json'},body:JSON.stringify({username:role==='member'?s.testUsername:s.adminUsername,password:role==='member'?s.testPassword:s.adminPassword})})
  const cookie = login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; '), session=await login.json()
  console.log(JSON.stringify({role,roomCount:session.rooms.length,roomIds:session.rooms.map(r=>r.sessionId)}))
  for (const method of ['session/list','commands/list']) {
    const response = await fetch(b+'/api/'+method,{method:'POST',headers:{Origin:b,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:'inspect-only',method,payload:{args: method==='commands/list'?{agentId:session.rooms[0].sessionId}:{_request:{}}}})})
    const raw=await response.text()
    let data
    try { data=JSON.parse(raw) } catch { console.log(JSON.stringify({role,method,status:response.status,nonJson:true})); continue }
    const value=data.result?.value
    console.log(JSON.stringify({role,method,status:response.status,ok:data.result?.ok,error:data.result?.error,keys:Object.keys(value??{}),items:value?.items?.map(i=>({id:i.id,sessionId:i.sessionId,sessionIds:i.sessionIds,archived:i.archived,title:i.title})),array:Array.isArray(value)?value.map(i=>({id:i.id,name:i.name,sessionIds:i.sessionIds})):undefined}))
  }
}

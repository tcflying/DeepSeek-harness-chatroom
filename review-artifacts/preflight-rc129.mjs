import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const s=JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json','utf8')).replace(/^\uFEFF/,''))
const base='http://127.0.0.1:3181',prefix='/plugins/deepseek-harness-chatroom/api'
console.log('preflight: login')
const login=await fetch(base+prefix+'/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:s.adminUsername,password:s.adminPassword}),signal:AbortSignal.timeout(10000)})
assert.equal(login.status,200)
console.log('preflight: catalogue')
const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
const started=Date.now()
const response=await fetch(base+'/api/session/list',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:'release-preflight',method:'session/list',payload:{args:{_request:{}}}}),signal:AbortSignal.timeout(55000)}).then(r=>r.json())
assert.equal(response.result.ok,true)
const running=response.result.value.items.filter(i=>i.running)
console.log(JSON.stringify({visibleSessionCount:response.result.value.items.length,visibleRunningCount:running.length,elapsedMs:Date.now()-started}))
assert.equal(running.length,0,'Do not reload during a visible active turn')

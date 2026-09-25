import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
const base = 'http://127.0.0.1:3181'
const prefix = '/plugins/deepseek-harness-chatroom/api'
const targets = [{ model: 'GPT', id: '8ebaa47b-8dda-400b-9283-22283cb82566' }, { model: 'M3', id: '200c5997-832d-407f-9ce0-c4356c3b5852' }]
for(const id of process.argv.slice(2)) { assert.match(id, /^[0-9a-f-]{36}$/); targets.push({model:'M3-repeat',id}) }
const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
const login = await fetch(base+prefix+'/auth/login', { method:'POST', headers:{'Content-Type':'application/json',Origin:base}, body:JSON.stringify({username:secrets.testUsername,password:secrets.testPassword}), signal:AbortSignal.timeout(15000) })
assert.ok(login.ok)
const cookie = login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
try {
  const results=[]
  for(const target of targets) {
    const file = await fetch(base+prefix+'/files/'+target.id, {headers:{Cookie:cookie,Origin:base},signal:AbortSignal.timeout(15000)})
    assert.equal(file.status,200)
    const data=Buffer.from(await file.arrayBuffer())
    const info=await sharp(data).metadata()
    await sharp(data).stats()
    assert.equal(info.format,'png')
    const publicDenied=await fetch('https://talk.opcvip.net'+prefix+'/files/'+target.id,{signal:AbortSignal.timeout(15000)})
    assert.equal(publicDenied.status,401)
    const artifact=new URL(`./RECHECK-20260911-${target.model}.png`,import.meta.url)
    await writeFile(artifact,data)
    results.push({...target,width:info.width,height:info.height,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),authenticated:200,publicAnonymous:401})
  }
  await writeFile(new URL('./RECHECK-20260911.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),results},null,2))
  console.log(JSON.stringify({results},null,2))
} finally { await fetch(base+prefix+'/auth/logout',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:base},body:'{}',signal:AbortSignal.timeout(15000)}) }

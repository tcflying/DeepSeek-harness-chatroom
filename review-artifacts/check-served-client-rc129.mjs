import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const base='http://127.0.0.1:3181'
const html=await fetch(base,{signal:AbortSignal.timeout(10000)}).then(r=>r.text())
const url=html.match(/"id":"deepseek-harness-chatroom","url":"([^"]+)"/u)?.[1]
const served=await fetch(base+url,{signal:AbortSignal.timeout(10000)}).then(r=>r.text())
const built=await readFile(new URL('../dist/client.js',import.meta.url),'utf8')
console.log(JSON.stringify({url,servedHash:createHash('sha256').update(served).digest('hex'),builtHash:createHash('sha256').update(built).digest('hex'),equal:served===built,includesBuild:served.includes(built.trim()),lengths:[served.length,built.length],sessionSync:served.includes('generation.getSnapshot'),head:served.slice(0,90),tail:served.slice(-100)}))

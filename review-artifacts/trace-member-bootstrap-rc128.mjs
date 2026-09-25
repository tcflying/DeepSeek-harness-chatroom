import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const secrets=JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json','utf8')).replace(/^\uFEFF/,''))
const origin=process.argv.includes('--public')?'https://talk.opcvip.net':'http://127.0.0.1:3181'
console.log('stage: login')
const response=await fetch('http://127.0.0.1:3181/plugins/deepseek-harness-chatroom/api/auth/login',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Origin:'http://127.0.0.1:3181','Content-Type':'application/json'},body:JSON.stringify({username:secrets.testUsername,password:secrets.testPassword})})
const pairs=response.headers.getSetCookie().map(v=>v.split(';')[0])
const proxy=new URL(process.env.HTTPS_PROXY??process.env.HTTP_PROXY)
console.log('stage: launch')
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:20000,proxy:{server:proxy.origin,bypass:'localhost,127.0.0.1'}})
const evidence={origin,at:new Date().toISOString(),rpc:[],console:[],streams:[],pageErrors:[]}
try {
 console.log('stage: context')
 const context=await browser.newContext({locale:'zh-CN',viewport:{width:1440,height:900}})
 await context.addCookies(pairs.map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:origin,httpOnly:true,secure:origin.startsWith('https')})))
 const page=await context.newPage()
 console.log('stage: page')
 page.on('pageerror',e=>evidence.pageErrors.push(e.message))
 page.on('console',m=>{if(['warning','error'].includes(m.type()))evidence.console.push(m.text().slice(0,500))})
 page.on('response',async r=>{
  if(!new URL(r.url()).pathname.startsWith('/api/'))return
  let result;try{result=await r.json()}catch{}
  const request=r.request().postDataJSON()
  const value=result?.result?.value
  evidence.rpc.push({method:request?.method,argsKeys:Object.keys(request?.payload?.args??{}),status:r.status(),ok:result?.result?.ok,error:result?.result?.error??result?.error,keys:Object.keys(value??{}),count:value?.items?.length})
 })
 page.on('websocket',ws=>ws.on('framereceived',f=>{
  let data;try{data=JSON.parse(String(f.payload))}catch{return}
  // Only protocol shape and structural catalogue frames; never chat content.
  if(evidence.streams.length<30)evidence.streams.push(JSON.stringify(data).slice(0,1200))
 }))
 await page.goto(origin,{waitUntil:'commit',timeout:15000})
 console.log('stage: navigation')
 await page.getByRole('button',{name:'我的账号',exact:true}).waitFor({timeout:30000})
 const expand=page.getByRole('button',{name:'打开侧边栏',exact:true});if(await expand.count())await expand.click()
 await page.getByRole('treeitem').first().waitFor({timeout:10000}).catch(()=>{})
 evidence.sidebar=await page.getByRole('treeitem').allTextContents()
 evidence.page=(await page.locator('body').innerText()).slice(0,1200)
}finally{
 await writeFile(new URL('./RC128-member-bootstrap-'+(origin.startsWith('https')?'public':'local')+'.json',import.meta.url),JSON.stringify(evidence,null,2))
 console.log(JSON.stringify(evidence,null,2))
 await browser.close()
}

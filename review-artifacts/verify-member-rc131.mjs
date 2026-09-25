import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const secrets=JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json','utf8')).replace(/^\uFEFF/,''))
const base='https://talk.opcvip.net',prefix='/plugins/deepseek-harness-chatroom/api'
const receipt={version:'1.5.0-codex.rc1.32',at:new Date().toISOString(),roles:[],passed:false}
const stability=process.argv.includes('--member-stability')
const out=new URL(stability?'./RC132-member-stability.json':'./RC132-member-browser-r2.json',import.meta.url)
const proxy=new URL(process.env.HTTPS_PROXY??process.env.HTTP_PROXY)
let context
try{
 console.log('launching isolated persistent browser (existing user profile untouched)')
 context=await chromium.launchPersistentContext('',{headless:true,locale:'zh-CN',viewport:{width:1440,height:900},proxy:{server:proxy.origin,bypass:'localhost,127.0.0.1'},timeout:20000})
 console.log('browser ready')
 const page=context.pages()[0]
 page.setDefaultTimeout(12000)
 for(const role of stability?['member']:['member','super-admin']){
  await context.clearCookies()
  const response=await context.request.post(base+prefix+'/auth/login',{headers:{Origin:base},data:{username:role==='member'?secrets.testUsername:secrets.adminUsername,password:role==='member'?secrets.testPassword:secrets.adminPassword},timeout:20000})
  assert.equal(response.status(),200); const session=await response.json();assert.equal(session.auth.account.role,role)
  const row={role,api:[],errors:[]};receipt.roles.push(row)
  const room=session.rooms.find(r=>r.title==='权限与进展验收 20260912');assert.ok(room)
  for(const method of ['settings/describe','credentials/list','session/selectModel','agentPresets/select','commands/execute']){
   if(role!=='member')break
   const r=await context.request.post(base+'/api/'+method,{headers:{Origin:base},data:{type:'client-request',rpcId:'rc131-denial',method,payload:{args:{sessionId:room.sessionId,provider:'invalid-test-route',model:'invalid-test-model',presetId:'invalid-test-preset',line:'/permission full'}}},timeout:15000})
   row.api.push({method,status:r.status()});assert.equal(r.status(),403)
  }
  page.on('pageerror',e=>row.errors.push(e.message))
  await page.goto(base,{waitUntil:'commit',timeout:20000})
  const notice=page.getByRole('button',{name:'继续',exact:true})
  if(await notice.isVisible().catch(()=>false))await notice.click()
  await page.getByRole('button',{name:'我的账号',exact:true}).waitFor({timeout:30000})
  await page.getByRole('button',{name:'搜索会话',exact:true}).click()
  const closeSearch=page.getByRole('button',{name:'关闭搜索',exact:true})
  if(await closeSearch.isVisible().catch(()=>false))await closeSearch.click()
  await page.getByRole('textbox',{name:'搜索会话…'}).fill(room.title)
  await page.getByRole('treeitem').filter({hasText:room.title}).click({timeout:45000})
  await page.getByRole('button',{name:room.title,exact:true}).waitFor({timeout:30000})
  await page.getByRole('textbox',{name:/发消息或做任务/}).waitFor()
  row.roomOpened=true
  await page.getByText('GPT-PROGRESS-1789147397202',{exact:false}).first().waitFor({timeout:45000})
  row.realHistoryLoaded=true
  if(stability){
   await page.locator('.dsh-chatroom-server-status[data-state="connected"][data-native="connected"][data-room="online"]').waitFor({timeout:60000})
   row.allStreamsConnected=true
  }
  const admin=role==='super-admin'
  assert.equal(await page.getByRole('button',{name:'设置',exact:true}).isVisible().catch(()=>false),admin)
  assert.equal(await page.getByRole('button',{name:/^访问模式，当前/}).isVisible().catch(()=>false),admin)
  assert.equal(await page.getByRole('button',{name:/^选择模型，当前/}).isVisible().catch(()=>false),admin)
  assert.equal(await page.getByRole('button',{name:'AI 成员',exact:true}).isVisible().catch(()=>false),admin)
  assert.equal(await page.getByRole('button',{name:'群管理',exact:true}).isVisible().catch(()=>false),admin)
  row.controlsRestricted=!admin
  if(!admin){
   await page.keyboard.press('Control+,')
   assert.equal(await page.getByRole('dialog',{name:'设置',exact:true}).count(),0)
   await page.screenshot({path:new URL('./RC132-member-chat.png',import.meta.url).pathname.slice(1)})
   await page.getByRole('button',{name:'我的账号',exact:true}).click()
   const dialog=page.locator('dialog[aria-label="我的账号"]');await dialog.waitFor()
   assert.ok(await dialog.evaluate(el=>el.matches(':modal')))
   await page.setViewportSize({width:390,height:844})
   row.mobile=await dialog.evaluate(el=>({width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right,scroll:el.scrollWidth,text:el.textContent}))
   assert.ok(row.mobile.right<=390&&row.mobile.scroll<=390)
   await page.screenshot({path:new URL('./RC132-member-account-mobile.png',import.meta.url).pathname.slice(1)})
   await page.setViewportSize({width:1440,height:900})
  }
  await writeFile(out,JSON.stringify(receipt,null,2));console.log(JSON.stringify(row))
 }
 receipt.passed=true
}catch(e){receipt.error=String(e);process.exitCode=1;console.log(receipt.error)}
finally{await writeFile(out,JSON.stringify(receipt,null,2));console.log(JSON.stringify({passed:receipt.passed}));await context?.close()}

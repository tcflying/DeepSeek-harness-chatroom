import { execFileSync } from 'node:child_process'
const guard = 'G:/CodexData/codex-home/plugins/cache/personal/delivery-guard/0.1.0+codex.20260908124800/scripts/guard.cjs'
const session = '019fdcf8-20b6-7262-9ac5-d393a238a21e'
const items = [
  {step:'Inspect original in-app browser and native GPT/M3 failure evidence',status:'completed'},
  {step:'Correct test profile instructions and verify real GPT/M3 images in original browser',status:'completed'},
  {step:'Attribute initiating trigger of historical 13:34 transport outage',status:'pending'},
]
execFileSync(process.execPath,[guard,'plan','--session',session,'--items',JSON.stringify(items)],{stdio:'inherit'})
execFileSync(process.execPath,[guard,'release','--session',session,'--reason','Current GPT/M3 image generation and original UI verified. Historical 13:34 initiating trigger remains unknown: retained timestamped lifecycle records do not cover it; no safe current reproduction. Further root-cause attribution requires contemporaneous socket cause and process-exit evidence, not speculative service restarts.'],{stdio:'inherit'})

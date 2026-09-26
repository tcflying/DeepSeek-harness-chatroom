import { spawn } from 'node:child_process'
import { isAbsolute } from 'node:path'

/** Use the installed host-managed launcher. No token is extracted or copied. */
export function invokeMiniMaxCode(launcher: string, args: readonly string[], input?: unknown, signal?: AbortSignal): Promise<unknown> {
  if (!isAbsolute(launcher) || /["%\r\n&|<>!]/u.test(launcher)) return Promise.reject(new Error('MiniMax Code 启动器路径无效。'))
  const windows = process.platform === 'win32' && /\.cmd$/iu.test(launcher)
  if (args.some(arg => /["%\r\n&|<>!]/u.test(arg))) return Promise.reject(new Error('MiniMax Code 参数无效。'))
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('MiniMax Code 查询已取消。')); return }
    const command = windows ? process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe' : launcher
    const argv = windows ? ['/d', '/s', '/c', `""${launcher.replaceAll('/', '\\')}" ${args.map(arg => `"${arg}"`).join(' ')}"`] : [...args]
    const child = spawn(command, argv, { windowsHide: true, windowsVerbatimArguments: windows, stdio: ['pipe', 'pipe', 'pipe'] })
    let output = '', bytes = 0, done = false
    const kill = () => {
      if (process.platform === 'win32' && child.pid) { const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); killer.on('error', () => { child.kill() }) }
      else child.kill()
    }
    const abort = () => { kill(); finish(new Error('MiniMax Code 查询已取消；未自动重试。')) }
    const finish = (error?: Error) => { if (done) return; done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); if (error) reject(error); else { try { resolve(JSON.parse(output)) } catch { reject(new Error('MiniMax Code 返回格式无效；未自动重试。')) } } }
    const timer = setTimeout(() => { kill(); finish(new Error('MiniMax Code 响应超时；提交结果可能未知，未自动重试。')) }, 60_000)
    signal?.addEventListener('abort', abort, { once: true })
    child.stdout.on('data', (data: Buffer) => { bytes += data.length; if (bytes > 2 * 1024 * 1024) { kill(); finish(new Error('MiniMax Code 返回过大。')) } else output += data.toString('utf8') })
    child.stderr.on('data', () => {}) // May contain bearer/signed URLs. Never expose raw stderr.
    child.once('error', () => finish(new Error('MiniMax Code 无法启动或宿主授权不可用。')))
    child.once('close', code => finish(code === 0 ? undefined : new Error(`MiniMax Code 调用失败（退出码 ${code ?? 'unknown'}）；未自动重试。`)))
    child.stdin.on('error', () => {})
    child.stdin.end(input === undefined ? undefined : JSON.stringify(input))
  })
}

export function miniMaxConnector(launcher: string, tool: 'submit_video_generation' | 'query_video_generation', input: unknown, signal?: AbortSignal): Promise<unknown> {
  return invokeMiniMaxCode(launcher, ['connector', 'call', `connector__matrix__${tool}`, '--args-file', '-'], input, signal)
}

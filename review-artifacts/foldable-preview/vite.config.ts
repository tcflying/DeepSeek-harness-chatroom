import { fileURLToPath } from 'node:url'
export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { host:'127.0.0.1', port:3190, strictPort:true, fs:{ allow:[fileURLToPath(new URL('../../', import.meta.url))] } },
}

# talk.opcvip.net CDN 核对

时间：2026-09-10 01:00 前后（北京时间）。本次只读检测，未修改 Cloudflare 规则、DNS、隧道、DSH 或生产配置。

## 结论

CDN 部分生效，并非完全没开：主站带 hash 的 JS/CSS 已实测 MISS→HIT。主要插件合并包连续请求仍是 DYNAMIC，尚未完成该部分 CDN 加速配置。

## 真实响应证据

| 请求 | 第一次 | 第二次 | 备注 |
| --- | --- | --- | --- |
| `/assets/index-Df-65__b.js` | MISS，TTFB 1.910390s | HIT，Age 1，TTFB 0.476186s | 423038 字节；max-age=14400 |
| `/assets/index-b24khbeK.css` | MISS，TTFB 1.231361s | HIT，Age 0，TTFB 0.425128s | 37838 字节；max-age=14400 |
| 页面引用的 `/plugins/??…client.js,…&rev=2db3aea74f47` | DYNAMIC | DYNAMIC | 无 Accept-Encoding 的取样为 4137928 字节；返回 public, max-age=31536000, immutable；无 Set-Cookie |
| `/` | DYNAMIC | 未重复 | HTML，不应为加速而整体强制缓存 |
| `/plugins/deepseek-harness-chatroom/api/session` | DYNAMIC，no-store | 未重复 | 未携带账号 Cookie 的只读检测，HTTP 200 不代表已登录 |
| `/plugins/deepseek-harness-chatroom/api/health` | DYNAMIC，no-store | 未重复 | HTTP 200 |

上述 TTFB 是本机当前代理/网络线路访问 SIN 边缘节点的少量采样，不能外推成所有地区速度、稳定倍数或真实手机表现。4.14 MB 是未请求传输压缩时的包体大小，不当作浏览器实际下载量。另一次 gzip 响应确认存在 Content-Encoding，但未验证压缩内容一致性，故不据此计算压缩比例或宣称已经验收。

## 归因与证据边界

- CF-Cache-Status=HIT 证明上述静态文件由边缘缓存返回；仅域名走 Cloudflare 或隧道连通本身不是缓存命中证据。
- 合并包的真实 pathname 是 `/plugins/`，JavaScript 文件列表在 query 中。它没有普通 `.js` 路径后缀，且连续请求 DYNAMIC，即本次响应未命中 CF 边缘缓存；这与默认按静态扩展名判定缓存资格的行为一致。
- 源站已声明 public/immutable，不是本次观察到的 no-store 或 Set-Cookie 阻止它缓存。Cloudflare 后台规则未成功读取，因此是否有额外规则覆盖仍未知，不把推断写成已确认的后台配置。
- CDN 可以减少前端资源重复回源，不能缓存私人聊天或让模型推理本身变快。

## 后续最小规则方案（草案，未应用）

仅对 `talk.opcvip.net` 的 GET/HEAD、pathname 精确为 `/plugins/`、query 为页面实际合并包格式且包含版本指纹 `rev` 的公开 JS 合并包，增加 Cache eligibility。部署前核对现有规则顺序和该路由返回的内容边界。

- 保留完整 query 作为缓存键，不能忽略模块列表或 rev。
- 尊重源站 Cache-Control，不能设置强制忽略 private/no-store/Set-Cookie 的 TTL。
- 不对 `/plugins/*` 做泛匹配：这个前缀也包含会话 API、文件和通知等受权限控制的内容。
- 登录、会话、权限、聊天、上传下载、SSE/WebSocket 不纳入上述共享缓存规则。
- 应用后用同一合并包 URL 验证 MISS→HIT，再检查 API 的 no-store/DYNAMIC 及版本 rev 变化后不串包。
- 不改 DSH 源码，不需重新安装 CDN，不启用付费服务。

## 未完成原因及恢复条件

Neo 可以列出 Cloudflare 页，但本任务自有页导航/快照分别超时；Codex 内置浏览器创建/读取 Cloudflare 页也超时。常规 Chrome 返回 `Browser is not available: chrome`；当前控制面清单只列出内置浏览器，没有可用 Chrome Dev 表面。公开站点 HTTP 可访问，不能据此把控制面失败归因于 talk 服务宕机。

未继续原因：无法读取已有 CF 规则及进入可靠的配置控制面，不能盲目覆盖规则。下一步：恢复已登录 Cloudflare 后台的可操作通道后，核对规则并只添加上述最小静态合并包策略，完成命中与隐私旁路验收。当前状态是“已定位未完成项”，不是“CDN 全部完成”。

## 官方依据

- https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
- https://developers.cloudflare.com/cache/concepts/cache-responses/
- https://developers.cloudflare.com/cache/how-to/cache-rules/examples/cache-everything/
- https://developers.cloudflare.com/cache/how-to/cache-rules/order/

## 继续修复取证（2026-09-10 北京时间）

本次用户要求继续修复后，尚未写入任何 Cloudflare 规则。以下为新增证据，不把工具尝试当作部署成功。

### 管理入口

- 新建本任务自有 Neo Cloudflare 首页标签，保留原有用户和其他代理标签。快照 15 秒超时，普通页面读取 10 秒超时。
- 原始浏览器接口曾读到 `document.readyState = loading`、`document.body = null`，已有 Cloudflare 标题和 head 内的资源引用；因此并非“根本没有打开标签”。后续读取仍超时。
- 尝试对本任务自有页停止未完成加载并重新加载；重载调用返回，但后续无法取得可操作正文，不能算恢复。
- Codex 内置浏览器新建 Cloudflare 页 20 秒超时；普通 Chrome 控制入口实际返回 `Browser is not available: chrome`。当前控制面没有 Chrome Dev，三个常见 Chrome Dev 安装位置均不存在。没有安装浏览器、重建登录资料或关闭安全检查。
- 只读检查当前进程环境，没有 `CLOUDFLARE` / `CF_API` 命名的凭据变量；可执行程序有 cloudflared，没有发现 wrangler。此证据不等于整台机器绝无其他凭据，未进行全盘凭据搜索。
- 命令行访问 Cloudflare 后台根路径返回 403 / `Cf-Mitigated: challenge`；它与浏览器通道不同，只能证明这条匿名命令行路径不可直接作为后台登录替代，不能证明 Neo 的加载卡顿由该挑战引起。
- Cloudflare 后台引用的 JS/CSS 在命令行路径返回 200，但不能据此判断 Neo 内部每个依赖请求均已成功。具体导致浏览器加载停滞的请求和机制仍未知。

### 合并包压缩一致性

从实时首页同时提取 src/href 并正确还原 `&amp;`。不能只提取 src，否则只得到小模块包而漏掉预加载的主包。

| 合并包 rev | 不请求压缩的字节数 | 请求压缩、解压后的字节数 | 两者 SHA-256 |
| --- | ---: | ---: | --- |
| `2db3aea74f47` | 4137928 | 4137928 | `b8f422839163a2fbe8a9968a114fac06ce37752df7e6a607614c0eac0f66b8de` |
| `cddf5581d5d5` | 18683 | 18683 | `91e433dc0045b7ab2ebdcbdaf376c70f9758912d6d30c5b1d54e55349cb615fe` |

这次完整 URL 对照通过；之前孤立 gzip 小体积样本不再用于推断主包体积或压缩率。

### 待应用设置的官方核对

Cache Rules 的 `cache: true` 表示尝试缓存，不代表无条件忽略源站。可选 `edge_ttl.mode = bypass_by_default`，有 Cache-Control 时遵守、没有时不缓存；浏览器 TTL 尊重源站。不设置覆盖源站的 TTL 或状态码强制缓存，不忽略 query。实际应用前仍必须读出现有规则及优先级。

参考：

- https://developers.cloudflare.com/cache/how-to/cache-rules/create-api/
- https://developers.cloudflare.com/cache/how-to/cache-rules/settings/

未继续原因：当前没有能够读取并编辑现有规则的有效控制通道，无法完成安全增量修改；不是缺少用户的修复授权。下一步：在已登录 Neo 中打开 opcvip.net 的缓存规则页并恢复可操作状态，或接入已有且有相应权限的官方管理接口；读取现有规则后只补充公开版本化合并包缓存，再验收命中和隐私旁路。Cloudflare 写入、读回、MISS→HIT 与私人接口旁路联合验收均未完成。

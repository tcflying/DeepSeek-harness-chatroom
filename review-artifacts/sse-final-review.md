# SSE 初始快照背压终审

结论：PASS（在本次限定范围内未发现 P1/P2）。

## 已核对

- `src/room.ts:5159-5202` 先用 `writableLength` 与 `1 MiB + snapshotAllowance` 做写前判断；初始 `snapshot` 的 `write()` 返回 `false` 后以 `Buffer.byteLength(frame)` 记录实际 UTF-8 帧字节数。首次 `drain` 清零额度，原有 15 秒超时仍会移除并关闭慢客户端。
- `src/room.ts:1796-1807` 的订阅顺序是先登记客户端、写快照，再广播 presence；因此大快照写入已造成背压时，允许的首个 presence 仍经过同一额度判断。`src/room.ts:1812-1816`、`3915-3918`、`2007-2013` 和 `2457-2462` 均使用相同的写入/移除生命周期。
- `src/room.ts:726-736` 与 `5216-5224` 在运行时停止或订阅移除时清除背压计时器。HTTP 请求关闭时会取消订阅（`src/http.ts:1200-1204`、`1236-1240`）。
- `tests/room.test.ts:568-604` 构造超过 2 MiB 的真实 JSON 快照帧，并以 `Buffer.byteLength` 驱动模拟 `writableLength`；它断言初始 snapshot 加自动 presence 的两次写入不会关闭，模拟 drain 后再将积压设为大于 1 MiB，下一次广播即关闭该客户端。

## 证据边界

该测试是 `ServerResponse` 单元替身，不代表真实 TCP/Node HTTP socket 的排队、`drain` 事件时序或网络吞吐；本次按授权没有启动服务或做端到端慢客户端测试。未执行测试（父任务已说明此回归当前为 GREEN）。

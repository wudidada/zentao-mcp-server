# ZenTao MCP Server (API V1.0)

基于 `TypeScript + Node.js + @modelcontextprotocol/sdk` 的禅道 MCP 服务，支持：

- 登录初始化（`initZentao`）
- 查看产品（`getProducts`）
- 查看我的 bug（`getMyBugs`）
- 查看 bug 详情（`getBugDetail`）
- 解决 bug（`resolveBug`）
- 激活 bug（`activateBug`，重新打开）

## 1. 环境准备

```bash
npm install
cp .env.example .env
```

请在 `.env` 中配置禅道地址与鉴权信息（推荐在运行时通过 `initZentao` 传入账号密码，不在文件中存明文）。

## 2. 从 npm / npx 运行（其它机器推荐）

npm 包名：**`@wudidada/zentao-mcp-server`**（作用域包；可执行命令 **`zentao-mcp-server`**）。

要求：**Node.js >= 20**。Linux/macOS 建议安装系统 **`curl`**（默认 HTTP 后端为 `curl`）。

### 2.1 命令行试跑

```bash
npx -y @wudidada/zentao-mcp-server
```

HTTP 模式示例：

```bash
MCP_TRANSPORT=http npx -y @wudidada/zentao-mcp-server
```

### 2.2 Cursor `mcp.json`（stdio + 环境变量）

在项目或用户目录下的 `.cursor/mcp.json` 中配置，例如：

```json
{
  "mcpServers": {
    "zentao": {
      "command": "npx",
      "args": ["-y", "@wudidada/zentao-mcp-server"],
      "env": {
        "ZENTAO_BASE_URL": "http://your-host/zentao/api.php/v1",
        "ZENTAO_ACCOUNT": "your_account",
        "ZENTAO_PASSWORD": "your_password",
        "ZENTAO_HTTP_BACKEND": "curl",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

修改配置后请**完全重启 Cursor**。也可将 `args` 中的包名改为固定版本，例如 `@wudidada/zentao-mcp-server@1.0.1`。

### 2.3 维护者：发布到 npm

```bash
npm run build
npm test
npm publish --access public
```

首次发布前需 `npm login`，并确保 `package.json` 中 `version` 未被占用。

源码仓库：<https://github.com/wudidada/zentao-mcp-server>

## 3. 启动方式

### stdio（本地 IDE 首选）

```bash
npm run start:stdio
```

### HTTP/SSE（远程接入）

```bash
npm run start:http
```

默认端口 `3000`，健康检查：

```bash
curl http://localhost:3000/healthz
```

## 4. 构建与测试

```bash
npm run build
npm test
```

## 5. MCP 工具参数说明

### initZentao

- `baseUrl?: string`
- `account: string`
- `password?: string`
- `token?: string`

> `password` 与 `token` 二选一。

### getMyBugs

- `status?: "active" | "resolved" | "closed" | "all"`（默认 `active`）
- `productId?: number`

### getBugDetail

- `bugId: number`

### activateBug

- `bugId: number`
- `assignedTo?: string`（指派给，账号）
- `openedBuild?: string | string[]`（影响版本，文档为数组；**不传则默认 `["trunk"]`**）
- `comment?: string`

### resolveBug

- `bugId: number`
- `resolution.resolution: "fixed" | "notrepro" | "duplicate" | "bydesign" | "willnotfix" | "tostory" | "external"`
- `resolution.resolvedBuild?: string`（**当解决方案为 `fixed` 时，服务端固定提交 `trunk`**，忽略该字段，避免部分禅道网页端显示异常）
- `resolution.duplicateBug?: number`（当 `resolution=duplicate` 时必填）
- `resolution.comment?: string`

## 6. 安全与运维基线

- 日志默认对 `password/token/authorization` 做脱敏处理
- 默认请求超时 `10s`
- 查询接口（GET）支持指数退避重试
- HTTP 模式提供 `/healthz` 健康检查
- 若配置了 `ZENTAO_BASE_URL` + `ZENTAO_ACCOUNT` +（`ZENTAO_PASSWORD` 或 `ZENTAO_TOKEN`），进程启动时会自动登录，无需每次先调 `initZentao`
- `ZENTAO_HTTP_BACKEND`：`axios` 使用 Node 内置 HTTP；`curl` 调用系统 `curl`。在非 Windows 上默认 `curl`，用于规避部分禅道实例对「Node 客户端 + `Token` 头 + GET」长时间无响应的问题

### 6.1 环境变量一览

| 变量 | 说明 |
| --- | --- |
| `ZENTAO_BASE_URL` | 禅道 API V1 根地址，如 `http://host/zentao/api.php/v1` |
| `ZENTAO_ACCOUNT` / `ZENTAO_PASSWORD` / `ZENTAO_TOKEN` | 自动登录用（密码与 token 二选一） |
| `ZENTAO_HTTP_BACKEND` | `axios` 或 `curl`；未设置时 Linux/macOS 默认 `curl`，Windows 默认 `axios` |

## 7. 项目结构

```text
src/
  adapters/      # 禅道 API V1.0 适配层
  schemas/       # zod 参数校验
  server/        # stdio/http 双入口
  services/      # 领域服务
  tools/         # MCP 工具实现
```

## 8. 注意事项

- 当前实现按禅道 API V1.0 常见 REST 路径封装（`/tokens`、`/bugs`、`/products`）。
- **解决 Bug**：官方 v1 接口为 **`POST /bugs/{id}/resolve`**（不是 PUT）。若误用 PUT，可能出现 HTTP 成功但禅道未真正更新状态的情况。
- 如果你的禅道实例路径或鉴权字段有差异，可在 `src/adapters/zentaoApiV1.ts` 适配。


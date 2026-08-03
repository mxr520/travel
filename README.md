# travel

跨设备同步的旅行攻略应用。

- 前端：原生 HTML/CSS/JavaScript，由 Cloudflare Workers Static Assets 托管
- 后端：Cloudflare Worker，提供 `/api/guides` REST API
- 数据库：Cloudflare D1，绑定名为 `DB`
- 源代码：GitHub `mxr520/travel`

## 本地开发

```bash
pnpm install
pnpm dev
```

首次运行时 Worker 会自动创建 `guides` 表，并在数据库为空时写入 `seeds.json` 中的初始攻略。

## 部署

创建 D1 数据库后，将数据库 ID 写入 `wrangler.jsonc`，然后运行：

```bash
pnpm db:migrate
pnpm deploy
```

GitHub 与 Cloudflare Workers Builds 连接后，推送到 `main` 分支会自动部署。

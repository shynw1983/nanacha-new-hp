# AGENTS.md

## 项目概览

这是 `nanacha` 的 Next.js 官网与预约前台，当前以福冈清川店为主，并保留多门店展示结构。网站页面以日文为默认语言，并提供英语、中文、韩语页面与客户端切换。

本项目不再承载本地餐饮后台。品牌、菜单、门店商品可售状态、预约开关、订单、员工、报表与支付都由 Foundr1 OS 总部后台管理。

## 技术栈

- 框架：Next.js App Router
- UI：React 19
- 样式：`app/globals.css`
- 首页内容来源：Lark，发布快照位于 `published/homepage.json`
- 菜单与预约运行时来源：Foundr1 OS 公开 API
- 订单状态实时更新：Foundr1 OS 提供配置，前台使用 Pusher client
- 地图：Google Maps iframe

## 主要目录

```text
.
├── app/                     # App Router 页面与 API
│   ├── page.js              # 首页
│   ├── menu/page.js          # 菜单页
│   ├── shops/                # 门店列表与详情
│   ├── admin/                # 旧后台入口，统一跳转到 Foundr1 OS
│   ├── [lang]/               # en / zh / ko 多语言页面
│   └── api/                  # 首页、菜单、图片、预约与订单状态代理 API
├── components/              # 页面组件
├── data/                    # 站点配置与静态说明数据
├── lark-import/             # 旧 Lark 导入资料，仅作历史参考
├── server/                  # Lark、菜单、预约等服务端逻辑
├── published/               # 发布后的内容快照
├── public/assets/           # 静态图片资源
├── public/locales/          # 多语言词典
└── scripts/                 # 首页发布、同步、翻译与预检脚本
```

## 当前内容策略

- 首页与门店展示默认读取 `published/homepage.json`，避免前台页面依赖 Lark 实时可用性。
- 前台菜单优先读取 Foundr1 OS：`FOUNDR1_OS_MENU_API_URL`。
- 若 Foundr1 OS 菜单 API 不可用，前台回退到 `published/menu.json`。
- `/api/create-checkout`、订单状态与订单实时配置只做轻量代理，实际业务由 Foundr1 OS 负责。
- Lark 修改首页内容后，使用 `npm run publish` 完成首页图片同步、快照发布、翻译更新与构建验证。

## 常用命令

```bash
npm run dev
npm run build
npm run preflight
npm run publish
npm run lark:publish
npm run i18n:update
```

## 关键页面

- `/`：首页
- `/menu`：菜单
- `/shops`：门店列表
- `/shops/[slug]`：门店详情
- `/en`、`/zh`、`/ko` 及对应子路由：多语言页面
- `/admin/*`：旧后台入口，跳转到 Foundr1 OS

## 维护注意事项

- 正式上线前需要配置 `NEXT_PUBLIC_SITE_URL`，否则 canonical、sitemap、JSON-LD 会回退到默认 Vercel 域名。
- Foundr1 OS 相关环境变量：`FOUNDR1_OS_BASE_URL`、`FOUNDR1_OS_MENU_API_URL`、`FOUNDR1_OS_CHECKOUT_API_URL`、`FOUNDR1_OS_ORDER_STATUS_API_URL`、`FOUNDR1_OS_ORDER_REALTIME_API_URL`。
- 如果 Foundr1 OS 部署启用了 Vercel Protection，需要配置 `FOUNDR1_OS_MENU_API_BYPASS_SECRET`。
- 多语言新增文案后，要把源文案加入 `scripts/i18n.js` 的 `extraTexts` 或相应内容源，再运行翻译流程。
- 首页 Hero 与门店图应通过同步脚本发布到 `public/assets/`，避免前台直接依赖 Lark 图片下载。
- 预约系统按日本时间处理，并支持跨午夜营业时段；营业时间主数据应在 Foundr1 OS / Lark 门店内容中保持一致。
- 不要手动编辑 `published/*.json` 作为长期内容来源；应优先修改 Lark 或 Foundr1 OS，然后运行发布流程。

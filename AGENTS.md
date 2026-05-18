# AGENTS.md

## 项目概览

这是 `nanacha` 的 Next.js 官网，当前以福冈清川店为主，同时已经按多门店架构设计，可继续扩展第二家店。网站页面以日文为默认语言，并提供英语、中文、韩语页面与客户端切换。

## 技术栈

- 框架：Next.js App Router
- UI：React 19
- 样式：`app/globals.css`
- 内容来源：Lark 作为编辑后台，发布快照位于 `published/`
- 实时数据：门店商品可售状态在预约流程中按门店读取 Lark
- 支付：Square Checkout
- 地图：Google Maps iframe

## 主要目录

```text
.
├── app/                     # App Router 页面与 API
│   ├── page.js              # 首页
│   ├── menu/page.js          # 菜单页
│   ├── shops/                # 门店列表与详情
│   ├── [lang]/               # en / zh / ko 多语言页面
│   └── api/                  # 预约、菜单、图片 API
├── components/              # 页面组件
├── data/                    # 站点配置与静态说明数据
├── server/                  # Lark、菜单、预约等服务端逻辑
├── published/               # 发布后的内容快照
├── public/assets/           # 静态图片资源
├── public/locales/          # 多语言词典
└── scripts/                 # 发布、同步、翻译与预检脚本
```

## 当前内容策略

- 首页、菜单、门店展示默认读取 `published/homepage.json` 与 `published/menu.json`，避免前台页面依赖 Lark 实时可用性。
- 预约商品可售状态按门店实时读取 Lark；若 Lark 临时不可用，结账流程会回退到最近一次发布快照。
- Lark 修改内容后，使用 `npm run publish` 完成图片同步、内容快照发布、翻译更新与构建验证。

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

## 维护注意事项

- 正式上线前需要配置 `NEXT_PUBLIC_SITE_URL`，否则 canonical、sitemap、JSON-LD 会回退到默认 Vercel 域名。
- 新增门店时，需要同步维护 Lark 的 Stores 表、门店菜单表配置，以及预约商品可售状态。
- 多语言新增文案后，要把源文案加入 `scripts/i18n.js` 的 `extraTexts` 或相应内容源，再运行翻译流程。
- Hero 与菜单图应通过同步脚本发布到 `public/assets/`，避免前台直接依赖 Lark 图片下载。
- 预约系统按日本时间处理，并支持跨午夜营业时段；修改营业时间时要同时检查 `hours` 与 `openingHoursSchema`。

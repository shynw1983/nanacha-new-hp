# AGENTS.md

## 项目概览

这是 `nanacha` 福冈清川店官网，当前已迁移为 Next.js App Router 项目。页面语言以日文为主，包含品牌首页、完整菜单、门店信息、多语言切换和线上取餐预约。

## 技术栈

- Next.js App Router：`app/`
- React 组件：`components/`
- 服务端数据与业务逻辑：`server/`
- 样式：`app/globals.css`
- 静态资源：`public/assets/`
- 多语言词典：`public/locales/`
- CMS：Lark Base
- 支付：Square Checkout

## 主要结构

```text
.
├── app/
│   ├── page.js
│   ├── menu/page.js
│   └── api/**/route.js
├── components/
│   ├── home-content.js
│   ├── hero-carousel.js
│   ├── menu-browser.js
│   ├── reservation-form.js
│   ├── site-header.js
│   └── site-footer.js
├── server/
├── data/
├── public/assets/
├── public/locales/
├── homepage-data.js
├── menu-data.js
└── scripts/
```

## 页面说明

- `/`：首页，包含 Hero、热门菜单、点单步骤、推荐、品牌故事、门店、Access、FAQ、预约表单。
- `/menu`：完整菜单页，支持分类筛选。

## 数据流

- `/api/homepage`：读取 `published/homepage.json` 中最近一次正式发布的首页快照。
- `/api/menu`：默认读取 `published/menu.json` 中的基础菜单；带 `store` 参数时，再实时读取该店 Lark 商品可售状态。
- `/api/create-checkout`：创建 Square 支付链接。

## 维护注意事项

- Lark 是编辑后台，不是线上页面的唯一实时数据源。
- 首页、菜单基础资料、门店资料、图片路径以 `published/` 中最近一次正式发布快照为准；编辑 Lark 后运行 `npm run lark:publish`。
- 各店商品可售状态仍由 Lark 实时管理；创建支付前会再次实时校验。
- 饮品本地 fallback 元数据位于：
  - `menu-data.js`
  - `data/menu-descriptions.js`
  - `data/category-notes.js`
- 多语言词典位于 `public/locales/`，修改可见文案后运行 `npm run i18n:update`。
- 保持项目轻量，不要重新引入旧式静态 HTML 页面入口。

## 运行

```bash
npm run dev
```

访问：

```text
http://localhost:3000
```

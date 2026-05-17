# AGENTS.md

## 项目概览

这是 `nanacha` 福冈清川店官网，当前已迁移为 Next.js App Router 项目。页面语言以日文为主，包含品牌首页、完整菜单、门店信息、多语言切换和线上取餐预约。

## 技术栈

- Next.js App Router：`app/`
- React 组件：`components/`
- 服务端数据与业务逻辑：`api/`
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
├── api/
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

- `/api/homepage`：读取首页内容；优先 Lark，失败时回退到 `homepage-data.js`。
- `/api/menu`：读取菜单内容；优先 Lark，失败时回退到 `menu-data.js` 和 `data/` 中的本地说明。
- `/api/create-checkout`：创建 Square 支付链接。

## 维护注意事项

- 页面内容优先维护 Lark；本地 fallback 仅用于无 CMS 或故障时继续渲染。
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

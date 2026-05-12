# AGENTS.md

## 项目概览

这是一个为 `nanacha` 福冈清川店制作的静态官网。页面语言以日文为主，内容围绕珍珠奶茶、果茶、奶茶推荐、完整菜单、门店地址和线上取餐预约。

项目没有使用框架、构建工具或包管理器，核心由原生 HTML、CSS、JavaScript 组成，可直接在浏览器中打开 `index.html` 预览。

## 技术栈

- HTML：`index.html`
- 完整菜单页：`menu.html`
- CSS：`styles.css`
- JavaScript：`script.js`
- 字体：Google Fonts，引入 `Inter` 和 `Noto Sans JP`
- 地图：Google Maps iframe 嵌入
- 图片资源：`assets/nanacha-hero.png`
- 菜单产品照片：`assets/menu/drink-01.png` 到 `assets/menu/drink-42.png`，从真实菜单 PDF 中提取

## 文件结构

```text
.
├── AGENTS.md
├── index.html
├── menu.html
├── styles.css
├── script.js
├── assets/
│   ├── nanacha-hero.png
│   └── menu/
│       └── drink-01.png ... drink-42.png
└── .gitignore
```

## 主要页面结构

`index.html` 是首页，包含以下区域：

- `header.site-header`：固定顶部导航，包含品牌、锚点导航和预约入口。
- `section.hero`：首屏品牌展示，主视觉图片来自 `assets/nanacha-hero.png`。
- `section#menu`：真实菜单中的热门饮品精选，并提供完整菜单入口。
- `section#access`：福冈清川店地址、Google Maps 链接和嵌入地图。
- `section#reserve`：取餐预约表单。
- `footer`：品牌和地址信息。

`menu.html` 是完整菜单独立页面，按照真实 PDF 菜单整理，包含：

- 分类筛选按钮：All、Tapioca Frappe、Tapioca Milk、Tapioca Tea、Tapioca Coffee、Smoothie、Special、Tea & Coffee。
- 分类菜单：タピオカフラッペ、タピオカミルク、スムージー、タピオカチーズティー、タピオカティー、スペシャル、タピオカコーヒー、Tea & Coffee。
- 产品照片：带图产品使用从 PDF 提取的杯子照片；Tea & Coffee 中的基础饮品目前按文本列展示。
- 客制化信息：Size、Sweetness、Amount of Ice、Option、Topping。

首页导航会跳转到 `menu.html`、`index.html#access`、`index.html#reserve`。

## 样式说明

`styles.css` 使用原生 CSS 和 CSS 变量维护视觉系统：

- 主要颜色变量定义在 `:root`，包括 `--ink`、`--muted`、`--line`、`--paper`、`--soft`、`--tea`、`--oolong`、`--berry`。
- 整体视觉是轻量、干净、偏茶饮品牌感的白底界面。
- 布局大量使用 CSS Grid 和 Flexbox。
- 已包含响应式断点：
  - `max-width: 980px`：隐藏桌面导航，主要网格切换为单列或两列。
  - `max-width: 640px`：菜单和表单改为单列，字号与间距收紧。
- `html` 启用了 `scroll-behavior: smooth`，锚点跳转会平滑滚动。

## 交互逻辑

`script.js` 负责两个轻量交互：

- 页面滚动超过 12px 后，为顶部 header 添加阴影。
- 预约表单提交时阻止默认刷新，并把选择的饮品、甜度、取餐时间写入 `[data-note]` 提示文案。
- 在 `menu.html` 上控制菜单分类筛选，点击筛选按钮会显示对应分类。

当前表单不会真正发送网络请求，也没有后端、数据库或第三方预约服务接入。

## 运行与预览

因为是纯静态页面，可以直接打开：

```text
index.html
```

如果需要本地 HTTP 服务，也可以在项目根目录运行：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

## 维护注意事项

- 修改饮品内容时，需要同步检查 `index.html` 中菜单卡片和预约表单 `<select name="drink">` 的选项。
- 完整菜单来自用户提供的真实菜单 PDF：`MenuSheet20250418.pdf`。若菜单更新，应优先同步 `menu.html`，再决定首页精选是否需要调整。
- 门店地址集中出现在 meta 描述、Access 区块、Google Maps 链接、iframe 和 footer 中，变更地址时要一起更新。
- 主视觉图片为 `assets/nanacha-hero.png`，尺寸为 1536 x 1024 PNG。
- 项目依赖外部 Google Fonts 和 Google Maps，离线环境下字体或地图可能无法完整显示。
- `.gitignore` 已忽略 macOS 元数据、日志、依赖目录、构建产物、本地环境变量和编辑器配置。

## 开发约定

- 保持项目轻量，优先使用原生 HTML/CSS/JS。
- 若只是调整页面内容或样式，不需要引入构建工具。
- 新增图片建议放入 `assets/`，菜单产品图统一放入 `assets/menu/` 并在 HTML 中使用相对路径引用。
- 改动交互时优先保持 `script.js` 简洁，避免把简单表单逻辑复杂化。
- 页面内容目前以日文面向用户；项目说明和维护文档可使用中文。

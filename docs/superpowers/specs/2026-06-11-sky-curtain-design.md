# 天幕古诗展示 — 设计规格

**日期**: 2026-06-11  
**状态**: 已确认

## 概述

将现有右侧侧边栏式古诗展示改为全屏沉浸式"天幕"体验。点击"点我点我！"按钮后，全屏深色天幕展开，艺术字主题浮现，古诗文自动滚动，底部提供退出按钮。

## 用户流程

1. 用户点击主页"点我点我！"按钮
2. 天幕从中心圆形扩散展开（0.8s）
3. 星空粒子出现 + 花瓣开始飘落（0.6s 开始，持续）
4. "花开有期"毛笔书写动画（0.8s → 2.0s）
5. "思念无涯"毛笔书写动画（1.8s → 3.0s）
6. 主题句停留 0.5s 后淡出上移
7. 古诗文列表从下方淡入（3.5s 开始）
8. 自动慢速向上滚动（4.5s 开始，~6px/s）
9. 用户可手动滑动打断自动滚动
10. 滚动到底或用户点击退出按钮 → 天幕关闭

## 动画时序

| 时间 | 事件 | 时长 |
|------|------|------|
| 0s | 天幕圆形扩散展开 | 0.8s |
| 0.6s | 星空 + 花瓣粒子启动 | 持续 |
| 0.8s | "花开有期"书写 | 1.2s |
| 1.8s | "思念无涯"书写 | 1.2s |
| 3.0s | 主题句暂停展示 | 0.5s |
| 3.5s | 主题淡出、诗词浮现 | 0.8s |
| 4.5s | 自动滚动开始 | 持续 |

## HTML 结构

```html
<div id="sky-curtain" class="sky-curtain hidden">
  <div class="sky-stars-layer"></div>
  <div class="sky-petal-layer"></div>
  <div class="sky-title-stage">
    <p class="sky-title-line">花开有期</p>
    <p class="sky-title-line">思念无涯</p>
  </div>
  <div class="sky-poem-scroll">
    <div class="sky-poem-list"><!-- JS 渲染 --></div>
  </div>
  <button class="sky-exit-btn">✕ 收起天幕</button>
</div>
```

## 关键技术点

### 毛笔书写效果
- 使用 CSS `mask-image: linear-gradient(to right, black 0%, black var(--reveal), transparent var(--reveal))` 模拟从左到右描边
- 每行逐字书写：用 JS 定时设置 `--reveal` CSS 变量从 0%→100%
- 字体：`var(--font-hand)` + `font-weight: 700`（加粗）
- 颜色：暖金色 `#f0c8a0` + `text-shadow` 光晕

### 星空粒子
- 复用主页粒子系统模式，改为白色/淡金小点
- 随机闪烁动画（opacity 波动）
- 偶尔流星：单个粒子快速斜向划过

### 花瓣飘落
- 复用主页花瓣粒子系统的粉色花瓣
- 深色背景下花瓣颜色调亮

### 自动滚动
- `requestAnimationFrame` 驱动，~6px 每 100ms
- 用户 `wheel` / `touch` 事件中断自动滚动，切为手动模式
- 滚到底部后退出按钮高亮闪烁

### 退出按钮
- `position: fixed` 固定在底部
- 初始半透明，滚动到底部后高亮脉冲

## CSS 层叠

```
z-index 层次:
  2500 — #sky-curtain (天幕容器)
  2501 — .sky-stars-layer / .sky-petal-layer (背景粒子)
  2502 — .sky-title-stage (艺术字)
  2503 — .sky-poem-scroll (诗词滚动区)
  2504 — .sky-exit-btn (退出按钮)
```

## 文件改动

| 文件 | 操作 |
|------|------|
| `index.html` | 替换 `.message-board` 为 `#sky-curtain` 结构；更新按钮文字 |
| `css/style.css` | 新增天幕样式；删除 `.message-board` 侧边栏样式 |
| `css/optimizations.css` | 新增天幕动画样式 |
| `js/main.js` | 新增天幕控制逻辑；删除侧边栏 JS；保留 `loveQuotes` 数据 |

## 删除项

- `.message-board` 侧边栏 HTML + CSS + JS
- `.message-board-toggle` 按钮的侧边栏切换逻辑（保留按钮但改为触发天幕）
- `.message-board-close` 关闭按钮
- 诗句自动滚动 `startQuoteScroll` / `stopQuoteScroll`（替换为天幕滚动）
- `mobileMediaQuery` 相关侧边栏逻辑
- `isMessageBoardOpen` 状态变量

## 保留项

- `loveQuotes` 数据数组（移到天幕组件使用）
- `renderQuotes()` 函数（修改渲染目标为 `.sky-poem-list`）
- "点我点我！"按钮的 CSS 样式

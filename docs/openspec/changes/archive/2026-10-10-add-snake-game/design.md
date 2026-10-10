# Design

## Context

见 `proposal.md` 的 Why。本次为全新增能力，仓库中没有既有代码、构建配置或依赖，设计不受现存约定约束。

行为契约见 `specs/snake-game/spec.md`。本文件是 Open 阶段的决策摘要；**正式技术设计**（架构、数据流、边界与失败路径、测试策略、完整风险表）见：

> `docs/superpowers/specs/2026-10-10-snake-game-design.md`

即 change 状态中的 `design_doc`。本文不复制该文档的详细内容，只保留 schema 要求的摘要与决策索引。

关键约束：

- 三个静态文件（`index.html`、`style.css`、`game.js`），无构建步骤、无第三方运行时依赖
- 双击 `index.html` 即可运行，因此不能使用 ES module（`file://` 下会被 CORS 拦截）
- 面向现代桌面浏览器，无需兼容旧版 IE

## Goals / Non-Goals

**Goals:**

- 用最小结构实现 `specs/snake-game/spec.md` 定义的全部行为，且可逐条验证
- 游戏状态与渲染解耦，使移动、碰撞、计分逻辑可脱离 DOM 单独推理
- 常量集中定义（网格尺寸、格子像素、节拍间隔），便于后续调整难度

**Non-Goals:**

- 不引入任何状态管理库、渲染库或测试框架
- 不做多关卡、道具、音效、动画特效等玩法扩展
- 不为移动端做触控与响应式适配
- 不使用 ES module，不引入构建步骤

## Decisions

以下为已确认的技术决策索引，逐项的理由、备选与代价见正式设计文档第 3 节。

1. **渲染**：单个 `<canvas>` + Canvas 2D，每帧重绘（而非 DOM 网格）
2. **主循环**：`requestAnimationFrame` + 时间累加器，含单帧补步上限（而非 `setInterval`）
3. **状态表示**：格子坐标数组（索引 0 为蛇头）+ `{x,y}` 方向向量；像素换算只在绘制阶段
4. **转向输入**：长度 1 的待处理方向槽；`keydown` 时以尚未应用转向的 `dir` 校验反向，且槽已非空即忽略（每拍只采纳第一次合法转向）
5. **食物生成**：遍历网格收集空格集合后随机取值；集合为空即判定本局结束
6. **结束与重开**：画布内覆盖层 + 空格键重开，不新增 DOM 元素
7. **状态机**：`RUNNING | OVER` 两态；重开与首次开局共用同一个 `resetGame()`
8. **画布分辨率**：按 `devicePixelRatio` 放大内部分辨率后缩放绘制上下文
9. **代码组织**：`game.js` 内单一 IIFE，按「常量 → 状态 → 输入 → 推进 → 绘制 → 主循环」分区

## Risks / Trade-offs

- [后台标签页切回瞬间补步过多导致连撞] → 单帧补步上限，超出部分丢弃累积时间
- [高 DPI 屏幕下 Canvas 发虚] → 按 `devicePixelRatio` 放大内部再缩放
- [蛇铺满网格时食物无处生成] → 空格集合为空即结束本局（已固化为 spec Scenario）
- [状态与渲染耦合导致逻辑无法单独推理] → 逻辑函数只读写格子坐标状态，绘制只读状态
- [重开与首次初始化分叉而产生行为不一致] → 两者共用同一个初始化函数
- [单节拍内连按绕过反向检查而自撞] → 与当前实际方向比较，而非与已改写方向比较

## 设计阶段回写的 Spec Patch

审查 delta spec 时发现 4 处验收缺口，已回写 `specs/snake-game/spec.md`（只补场景、消歧义、补边界，未改动结构与范围）：

1. 「页面加载即开局」场景明确初始长度为 3 格
2. 新增 Scenario「初始移动方向固定」
3. 新增 Scenario「重开由空格键触发」，并写入 Requirement 描述
4. 「食物生成与蛇身增长」新增 Scenario「无空格可放置食物」，并写入 Requirement 描述

回写后 delta spec 为 7 条 Requirement / 17 个 Scenario，`openspec validate --strict` 通过。

## Migration Plan

无。全新增文件，不涉及数据迁移或既有行为变更。回滚方式：删除 `index.html`、`style.css`、`game.js` 三个文件即回到基线提交状态。

## Open Questions

- 具体配色方案与是否绘制网格辅助线（候选：深色底 + 高对比蛇身、无辅助线）
- 结束覆盖层提示文案的具体措辞

以上均为可后调的呈现细节，不改变 spec 的行为契约与任务划分。

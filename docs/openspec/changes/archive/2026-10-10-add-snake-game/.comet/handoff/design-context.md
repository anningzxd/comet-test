# Comet Design Handoff

- Change: add-snake-game
- Phase: design
- Mode: compact
- Context hash: f9f48b633e5a15beef1210ea9b17e22e46021e27487312bdffbb6bedccf4404d

Generated-by: comet-handoff.sh
Task hash policy: task-content-v1. Read tasks.md for live completion; excerpts are design-time context.

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## docs/openspec/changes/add-snake-game/proposal.md

- Source: docs/openspec/changes/add-snake-game/proposal.md
- Lines: 1-37
- SHA256: 6f9ed16aaa97d13a7745d0d5487a43b13678d5f85f55b689e071c6cbdcfc7680

```md
# Proposal

## Why

当前仓库只有工作流脚手架，没有任何可运行的应用代码，无法验证"从需求到交付"的完整链路，也没有可作为后续迭代基线的实际产物。

需要一个零依赖、浏览器直接打开的贪吃蛇游戏：它足够小，能在一次 change 内完成；又足够完整，覆盖输入、状态推进、计分与结束判定等真实行为，可作为 Comet Classic 全流程的第一块可交付成果。

## What Changes

- 新增静态网页游戏，由三个文件组成：`index.html`、`style.css`、`game.js`
  - 无构建步骤、无打包器、无第三方运行时依赖
  - 浏览器直接打开 `index.html` 即可游玩
- 实现贪吃蛇基础玩法：
  - 键盘方向键与 WASD 双套按键控制移动方向，禁止 180° 反向掉头
  - 吃到食物后蛇身增长、得分增加，食物在空位中随机重新生成
  - 蛇头撞到墙壁或自身身体即判定游戏结束
  - 游戏结束后可重新开始一局
- 游戏主循环由定时器按固定节拍推进，渲染使用 Canvas 2D
- 明确不在本次范围内：触屏与移动端操作、最高分持久化、随得分逐级加速、暂停/继续、穿墙模式

## Capabilities

### New Capabilities

- `snake-game`: 浏览器贪吃蛇游戏的完整可玩行为，覆盖游戏初始化与重开、键盘输入解析与反向保护、按节拍推进的移动与增长、食物随机生成、实时计分，以及撞墙/撞身的游戏结束判定。

### Modified Capabilities

无。当前项目尚无任何既有 spec。

## Impact

- 新增文件：`index.html`、`style.css`、`game.js`（位于仓库根目录）
- 既有代码、公共 API、数据模型、依赖：均无影响（全新增）
- 运行环境：现代桌面浏览器；双击打开 `index.html` 即可运行，无需本地服务器或安装步骤
- 不引入 `package.json` 或任何 npm 依赖，不改变现有 Comet/OpenSpec 工作流配置

```

## docs/openspec/changes/add-snake-game/design.md

- Source: docs/openspec/changes/add-snake-game/design.md
- Lines: 1-77
- SHA256: 11446113ac73cc24562bc3c67c664dfeb81a7123792118a33c9705504afff354

```md
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

```

## docs/openspec/changes/add-snake-game/tasks.md

- Source: docs/openspec/changes/add-snake-game/tasks.md
- Lines: 1-51
- SHA256: 70832d814f994816e5e2aa264e24dc76f27dde1022052a70d38e1a4c6ce33563

```md
# Tasks

> 本项目按 `design.md` 的非目标约定不引入测试框架，因此每个任务的验证均为「浏览器中可观察的行为」或「对交付文件的直接检查」，不依赖自动化测试运行器。

## 1. 页面骨架与样式基线

- [ ] 1.1 创建 `index.html`：包含 Canvas 游戏区、得分与状态提示容器，并引入 `style.css` 与 `game.js`；验证：浏览器打开 `index.html`，页面呈现游戏区与得分区，控制台无报错 <!-- comet-task:7a82ac63-78ff-4a3c-9dca-ee995fb63ebd -->
- [ ] 1.2 创建 `style.css`：完成页面居中布局、游戏区边框与得分区排版；验证：打开页面后游戏区居中、尺寸稳定，缩放窗口不出现元素错位 <!-- comet-task:82f1d667-00a5-47d6-bc16-4b4654bb8dd2 -->
- [ ] 1.3 创建 `game.js` 骨架：所有逻辑包裹在 IIFE 内，建立常量区与空的初始化入口；验证：打开页面控制台无脚本错误，且控制台执行 `window.SNAKE_DEBUG` 返回 `undefined`（内部状态未泄漏到全局） <!-- comet-task:e32a3454-b1ed-4184-ac25-231f1723520f -->

## 2. 游戏状态与初始渲染

- [ ] 2.1 定义常量与状态结构：网格行数列数、格子像素、节拍间隔、四向方向向量，以及蛇坐标数组、当前方向、食物坐标、得分、运行状态标志；验证：源码中这些值集中定义，移动与碰撞逻辑中不出现散落的魔法数字 <!-- comet-task:6fadca01-2e7b-447e-bfcd-4e8f49f9da8e -->
- [ ] 2.2 按 `devicePixelRatio` 初始化画布内部分辨率并缩放绘制上下文；验证：在高 DPI 屏与普通屏分别打开页面，格子边缘清晰不发虚 <!-- comet-task:61affca6-529d-4b81-86f3-a137ed864a49 -->
- [ ] 2.3 实现 `draw()`：清屏、按坐标绘制蛇身、绘制食物；验证：打开页面可见处于初始长度的蛇和一个食物，且两者不重叠 <!-- comet-task:d9cda77e-3794-41dd-b730-9d19975ed7e8 -->

## 3. 主循环与按节拍推进

- [ ] 3.1 用 `requestAnimationFrame` + 时间累加器实现主循环，累加值达到节拍间隔时触发一次 `step()`；验证：打开页面蛇自动匀速前进，用秒表粗测若干步的总耗时与节拍间隔吻合 <!-- comet-task:942617b7-4c2d-4cac-9b80-954f3fdf866a -->
- [ ] 3.2 在 `step()` 中实现移动：按当前方向生成新蛇头，未进食时移除蛇尾；验证：蛇持续前进且长度保持不变，经过自身曾占用的格子时不留下残影 <!-- comet-task:bb1ae4da-063e-4b71-8ae7-346ceb57d3eb -->
- [ ] 3.3 为单帧补步设置上限；验证：切到其他标签页停留约 10 秒后切回，蛇不会瞬间连续多走数步，也不会因此直接撞墙结束 <!-- comet-task:04352c2c-5cc9-468a-8479-d7462f253544 -->

## 4. 键盘输入与转向校验

- [ ] 4.1 监听 `keydown`，把方向键与 WASD 映射为方向向量并写入长度为 1 的待处理方向槽；验证：在游戏中逐一测试 ↑ ↓ ← → 与 W A S D 八个按键，蛇均按对应方向转向 <!-- comet-task:d83dc336-f13f-4495-8603-55bd41bbfa1f -->
- [ ] 4.2 对方向键调用 `preventDefault()`；验证：在内容高度超过视口的页面中按方向键，页面不发生滚动 <!-- comet-task:6a03c056-6797-4ee4-a7a4-b5008c28bcf9 -->
- [ ] 4.3 在 `step()` 中按「与当前实际方向不相反」校验待处理方向后再应用；验证：蛇向右移动时按 ← 仍继续向右（对应 spec「拒绝 180 度反向」）；蛇向右时在同一节拍内先按 ↑ 再按 ←，下一节拍向上移动（对应 spec「单节拍内只转向一次」） <!-- comet-task:4961d832-9f94-4fed-ad72-b4bf3d50820a -->

## 5. 食物、蛇身增长与计分

- [ ] 5.1 实现从空格集合中随机生成食物；验证：连续游玩观察，食物从不与蛇身重叠；蛇身接近铺满网格时页面不卡死 <!-- comet-task:baf65a69-cfcd-44d1-8a17-b9313ffa5c1a -->
- [ ] 5.2 实现进食判定：蛇头坐标等于食物坐标时，蛇身增长一格、立即在另一空格生成新食物；验证：吃到食物后蛇身可见地变长一格，且新食物不会出现在蛇身上 <!-- comet-task:508b6f9f-fb43-45e4-9651-d7a7fe7a8fdf -->
- [ ] 5.3 实现得分展示与重开时归零；验证：界面得分随每次进食递增 1，开始新一局后显示 0 <!-- comet-task:98581ed0-135e-4d69-a477-83b211a5a6c1 -->

## 6. 碰撞判定、结束与重开

- [ ] 6.1 实现越界与撞身判定，判定成立时停止推进；验证：让蛇一直走到边界，游戏结束且蛇停止移动；构造蛇身自交的情形，同样结束 <!-- comet-task:d022b7b0-f94f-46d5-b598-8d6fd4a732db -->
- [ ] 6.2 实现游戏结束提示的呈现；验证：两种结束方式触发后，页面上都出现明确的结束提示 <!-- comet-task:ec20c579-ba36-47f9-8861-cdd668ca521a -->
- [ ] 6.3 实现重开：重置蛇、方向、食物与得分；验证：结束后触发重开，蛇回到初始长度与起始位置、得分归零，并可继续正常游玩 <!-- comet-task:9613ba2b-2f8b-425f-91ee-9034e1ab9022 -->
- [ ] 6.4 结束后屏蔽方向输入；验证：结束后逐一按方向键，蛇的位置与方向均不发生变化（对应 spec「结束后输入不再生效」） <!-- comet-task:64cd9521-b6bb-4303-82dd-b9722ac0160c -->

## 7. 集成验收

- [ ] 7.1 对照 `specs/snake-game/spec.md` 的每条 Requirement 与 Scenario 逐项走查，记录通过/不通过结论 <!-- comet-task:31f24be2-d3c2-4de1-9acb-ba57fd858464 -->
- [ ] 7.2 完整游玩一局直到结束并重开，全程确认控制台无报错、无未捕获异常 <!-- comet-task:6a86c22f-9b68-4898-b5f9-61effb66e37a -->
- [ ] 7.3 确认交付物仅新增 `index.html`、`style.css`、`game.js` 三个文件，且无需任何构建、安装或本地服务器步骤即可运行 <!-- comet-task:6b0cb1f0-1dcd-4d5e-8979-52d4334ca21a -->

## Workflow follow-up

- 满足项目审查要求后归档该 change
- 验证归档结果

```

## docs/openspec/changes/add-snake-game/.openspec.yaml

- Source: docs/openspec/changes/add-snake-game/.openspec.yaml
- Lines: 1-2
- SHA256: e61703315c59969805e021ec521ca189369aaf8ea902d52c5e39c7fbc603598f

```md
schema: spec-driven
created: 2026-10-10

```

## docs/openspec/changes/add-snake-game/specs/snake-game/spec.md

- Source: docs/openspec/changes/add-snake-game/specs/snake-game/spec.md
- Lines: 1-120
- SHA256: 6782b1d2eb9223f3c9ca565cd1f3f8e52ce08c423909f891221fd502ef0c4c2c

[TRUNCATED]

```md
# Spec Delta

## Purpose

定义浏览器贪吃蛇游戏对外可观察的完整可玩行为：从开局与重开、键盘方向控制、按节拍推进的移动与增长，到计分显示与碰撞结束判定，使该游戏可被独立验收并作为后续玩法的基线。

## ADDED Requirements

### Requirement: 游戏启动与重开

系统 SHALL 在页面加载完成后立即呈现一局可操作的贪吃蛇游戏，并 SHALL 允许玩家在游戏结束后按空格键开始新的一局。

#### Scenario: 页面加载即开局

- **WHEN** 玩家在浏览器中打开 `index.html`
- **THEN** 游戏区域显示长度为 3 格、位于初始位置的蛇和一个食物，得分显示为 0，且蛇开始按固定节拍移动

#### Scenario: 重开由空格键触发

- **WHEN** 游戏结束后玩家按下空格键
- **THEN** 蛇恢复到长度 3 格与起始位置，得分归零，重新生成食物，游戏回到可操作状态

#### Scenario: 初始移动方向固定

- **WHEN** 一局游戏开始（首次开局或重开）且玩家尚未输入任何方向
- **THEN** 蛇以向右为初始移动方向

### Requirement: 键盘方向控制

系统 SHALL 支持方向键（↑ ↓ ← →）与 W A S D 两组按键控制蛇的移动方向，并 SHALL 阻止方向键的默认页面滚动行为。

#### Scenario: 方向键改变方向

- **WHEN** 游戏进行中玩家按下 ↑ 或 ↓ 或 ← 或 →
- **THEN** 蛇在下一个节拍改为对应方向移动

#### Scenario: WASD 改变方向

- **WHEN** 游戏进行中玩家按下 W 或 A 或 S 或 D
- **THEN** 蛇在下一个节拍改为对应方向移动，效果与对应方向键一致

#### Scenario: 方向键不滚动页面

- **WHEN** 玩家按下任一方向键
- **THEN** 页面不发生滚动

### Requirement: 转向输入校验

系统 SHALL 只采纳与蛇当前移动方向不相反的转向输入，且 SHALL 在每个节拍内只采纳一次转向。

#### Scenario: 拒绝 180 度反向

- **WHEN** 蛇正向右移动，玩家按下 ←
- **THEN** 蛇在下一个节拍仍向右移动，该输入被忽略

#### Scenario: 单节拍内只转向一次

- **WHEN** 蛇正向右移动，玩家在同一节拍内先按 ↑ 再按 ←
- **THEN** 蛇在下一个节拍向上移动，后按的 ← 被忽略

### Requirement: 按节拍推进的移动

系统 SHALL 以固定时间间隔推进蛇的位置，每次推进使蛇整体沿当前方向前进一个网格单位。

#### Scenario: 未进食时按节拍前进

- **WHEN** 游戏进行中且经过一个节拍，并且蛇头未吃到食物
- **THEN** 蛇头沿当前方向前进一格，蛇尾相应退出该格，蛇身总长度不变

### Requirement: 食物生成与蛇身增长

系统 SHALL 在游戏区域内随机生成一个食物，其所在格子 MUST NOT 与蛇身任何部分重合；蛇头吃到食物时，蛇身长度 SHALL 增加一格；当游戏区域已无空格可放置食物时，本局 SHALL 判定结束。

#### Scenario: 食物不与蛇身重叠

- **WHEN** 生成或重新生成食物
- **THEN** 食物所在格子未被蛇身任何部分占用

#### Scenario: 吃到食物蛇身增长


```

Full source: docs/openspec/changes/add-snake-game/specs/snake-game/spec.md

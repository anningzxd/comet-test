---
comet_change: add-snake-game
role: technical-design
canonical_spec: openspec
archived-with: 2026-10-10-add-snake-game
status: final
---

# 贪吃蛇游戏技术设计

- Change: `add-snake-game`
- 日期：2026-10-10
- 需求来源（唯一事实源）：`docs/openspec/changes/add-snake-game/proposal.md`、`docs/openspec/changes/add-snake-game/specs/snake-game/spec.md`
- Open 阶段决策记录：`docs/openspec/changes/add-snake-game/design.md`

本文件是本次 change 的正式技术设计。行为需求只在 delta spec 中维护，本文不复制需求文本，只记录实现决策、取舍与验证方式。

## 1. 目标与边界

**设计目标**

- 用最小结构实现 delta spec 定义的全部行为，且每条 Scenario 都能在浏览器中逐项验证
- 游戏逻辑与渲染解耦：所有判定函数只读写格子坐标状态，绘制函数只读状态
- 常量集中定义，便于后续调整难度（网格尺寸、格子像素、节拍间隔）

**设计边界（在 proposal 范围之外额外排除的实现选项）**

- 不引入测试框架、状态管理库、渲染库
- 不使用 ES module（`file://` 下会被 CORS 拦截）
- 不新增 DOM 覆盖层或按钮实现结束/重开（改用画布内绘制）
- 不做移动端触控与响应式适配

## 2. 架构

### 2.1 文件与职责

```
index.html   页面结构：<canvas> 游戏区、得分显示容器、状态提示容器
             通过 <link>/<script> 引入 css/js，顺序为 css → js
style.css    页面居中布局、游戏区边框、得分区排版、深色底配色
game.js      单 IIFE，内部分区：常量 → 状态 → 输入 → 推进 → 绘制 → 主循环
```

三个文件同目录，无构建步骤，双击 `index.html` 即运行。

### 2.2 分层与依赖方向

```
                   ┌───────────────────────────────┐
                   │  主循环 loop()（rAF + 累加器） │
                   └───────┬───────────────┬───────┘
                           │ 按节拍调用    │ 每帧调用
                           v               v
                   ┌───────────────┐  ┌───────────────┐
                   │  step() 推进  │  │  draw() 绘制  │
                   │  纯状态变更   │  │  只读状态     │
                   └───────┬───────┘  └───────────────┘
                           │
                   ┌───────v───────┐
                   │  游戏状态对象 │
                   │  （格子坐标） │
                   └───────^───────┘
                           │ 只写 pendingDir
                   ┌───────┴───────┐
                   │ 输入处理器    │
                   │ keydown       │
                   └───────────────┘
```

依赖是单向的：输入只写 `pendingDir`，`step()` 读写状态，`draw()` 只读状态。三者之间没有反向依赖，因此移动、碰撞、进食逻辑可以脱离 DOM 单独推理。

### 2.3 状态模型

```js
snake      : [{x, y}, ...]          格子坐标数组，索引 0 为蛇头
dir        : {x, y}                 当前实际方向，四向单位向量之一
pendingDir : {x, y} | null          长度 1 的待处理方向槽
food       : {x, y}                 食物所在格子
score      : number                 当前得分
state      : 'RUNNING' | 'OVER'     运行状态
```

所有逻辑使用格子坐标（整数），像素换算只发生在 `draw()` 中。吃到的食物与蛇身增长都退化为坐标相等比较，逻辑不感知画布尺寸。

## 3. 关键决策

### 3.1 渲染：Canvas 2D，而非 DOM 网格

用单个 `<canvas>` 每帧整屏重绘：一次 `clearRect` + 循环 `fillRect`。

- **理由**：格子对齐是像素级操作，Canvas 不存在布局重算与样式级联开销；DOM 方案需要在网格中增删节点或频繁切换 class，帧间成本随网格增大而上升，且元素层级易受 CSS 干扰。
- **备选**：DOM + CSS Grid——实现直观、可用 CSS 表达样式，但对基础版没有收益，反而引入状态与样式同步的复杂度。
- **代价**：文本提示（结束覆盖层文案）需要用 `fillText` 手工排版，不如 DOM 排版灵活；本设计的提示内容简单，可接受。

### 3.2 主循环：`requestAnimationFrame` + 时间累加器，而非 `setInterval`

```
loop(now):
    dt   = now - lastTime
    lastTime = now
    acc += dt
    steps = 0
    while acc >= TICK_MS and steps < MAX_CATCHUP_STEPS:
        step()
        acc -= TICK_MS
        steps += 1
    if acc >= TICK_MS:      # 超过补步上限
        acc = 0             # 丢弃积压，避免切回标签页瞬间连撞
    draw()
    requestAnimationFrame(loop)
```

- **理由**：后台标签页中 `setInterval` 被节流到约 1 秒一次，切回时蛇已按错误节奏移动，甚至直接撞墙结束；`rAF` 在页面不可见时停止触发，恢复后按真实时间差补步，同时天然适配高刷新率屏幕。
- **备选**：`setInterval`——代码更短，但要达到同等效果需要额外处理节流与可见性，反而更复杂。
- **代价**：多了一个累加器变量与补步上限逻辑（`MAX_CATCHUP_STEPS`，初值 2）。

### 3.3 转向输入：长度 1 的待处理槽，"每拍只采纳第一次合法转向"

校验发生在 `keydown`，以**尚未应用转向的 `dir`** 为基准；`step()` 只负责应用与清空：

```
# keydown 时
if 状态不为 RUNNING:             return          # 结束后输入不生效
if pendingDir 已非空:            return          # 本拍已采纳过一次转向
if 新方向与当前 dir 相反:        return          # 拒绝 180 度反向
pendingDir = 新方向

# step() 时
if pendingDir 存在: dir = pendingDir
pendingDir = null
```

两条规则的组合才是关键，缺一不可：

- **反向拒绝**必须在 `keydown` 时以 `dir` 为基准。若改为在 `keydown` 中直接改写 `dir`，"同一节拍内先按 ↑ 再按 ←"会以已被改写后的 `dir`（向上）为基准，判定 ← 合法，蛇随即撞上自己的身体。
- **每拍只采纳第一次**必须靠"槽已非空即忽略"实现。若允许后按覆盖（槽内只剩最后按下的 ←），← 会因与 `dir`（向右）相反被拒，结果是蛇继续向右，而 delta spec 要求它向上——「单节拍内只转向一次」Scenario 会失败。

- **备选**：输入队列（可缓存多次转向）——允许连招式操作，超出基础版需要，且让单节拍行为更难预测。
- **代价**：快速连按两个合法方向时只生效第一个，属预期行为并已被 Scenario 固化。

### 3.4 食物生成：从空格集合中随机取值

遍历全部格子收集未被 `snake` 占用的坐标，在集合中随机取一个。

- **理由**：避免"随机取点直到不重叠"在蛇接近铺满时反复重试甚至卡死；集合为空时可直接判定本局结束（对应 delta spec 的「无空格可放置食物」Scenario）。
- **备选**：随机重试——实现更短，但存在最坏情况退化。
- **代价**：每次生成食物为 O(COLS×ROWS) 遍历；20×20 下为 400 次比较，可忽略。

### 3.5 结束与重开：画布内覆盖层 + 空格键

`state === 'OVER'` 时，`draw()` 在正常画面之上叠加半透明矩形，再用 `fillText` 居中绘制「游戏结束 / 最终得分 / 按空格重开」。空格键开新局。

- **理由**：全部状态留在画布内，无需维护 DOM 与 Canvas 两套同步；与已确认的"仅键盘"范围一致，键盘体验连续。
- **备选**：DOM 按钮——更直观、不依赖键盘，但需额外同步一套 DOM 状态，且超出已确认范围。
- **代价**：提示文案排版需手工计算居中位置。

### 3.6 状态机与初始化：`RUNNING | OVER`，单一初始化函数

`resetGame()` 同时承担首次开局与重开：重置 `snake`（长度 3 格、初始位置）、`dir`（向右）、`pendingDir`（null）、`score`（0）、`state`（RUNNING）、生成食物、清零累加器。

- **理由**：两条路径共用同一函数，避免"重开后某个字段没重置"这类分叉缺陷。delta spec 的「初始移动方向固定」Scenario 要求重开后同样向右，共用函数天然满足。
- **备选**：分别实现 `init()` 与 `restart()`——重复逻辑，易产生不一致。

### 3.7 画布分辨率：按 `devicePixelRatio` 缩放

画布的 `width/height` 属性设为 `逻辑尺寸 × dpr`，CSS 尺寸保持逻辑尺寸，绘制前 `ctx.scale(dpr, dpr)`。

- **理由**：高 DPI 屏下若只设 CSS 尺寸，位图会被拉伸而发虚。
- **代价**：多几行初始化代码；不处理也只是视觉瑕疵，不影响任何 Scenario。

## 4. 数据流

```
  玩家按键
      │
      v
  keydown 处理器 ──方向键→ 映射方向向量 → pendingDir
      │            └─方向键 → preventDefault() 阻止页面滚动
      │            └─空格 + state==='OVER' → resetGame()
      │
      v
  loop() 每帧累加 dt，达到 TICK_MS 且未超补步上限
      │
      v
  step():
      1. 应用 pendingDir（与当前 dir 比较，反向忽略）
      2. 计算新蛇头 = snake[0] + dir
      3. 越界？           → state = 'OVER'，结束本步
      4. 撞到自身？       → state = 'OVER'，结束本步
      5. snake.unshift(新头)
      6. 新头 === food？
           是 → score += 1；生成新食物
                 若空格集合为空 → state = 'OVER'
           否 → snake.pop()
      │
      v
  draw(): clearRect → 绘制蛇身与食物 → state==='OVER' 时叠加覆盖层与提示
```

## 5. 常量

| 常量 | 初值 | 说明 |
| --- | --- | --- |
| `COLS` / `ROWS` | 20 / 20 | 网格列数与行数 |
| `CELL` | 24 | 每格像素，画布逻辑尺寸 480×480 |
| `TICK_MS` | 150 | 每步推进的时间间隔 |
| `MAX_CATCHUP_STEPS` | 2 | 单帧最多补步数，防止切回标签页瞬间连撞 |
| `INIT_LEN` | 3 | 蛇的初始长度（格） |
| `INIT_DIR` | `{x: 1, y: 0}` | 初始移动方向：向右 |
| `RESTART_KEY` | `' '`（空格） | 结束状态下的重开键 |

## 6. 边界与失败路径

| 场景 | 处理 |
| --- | --- |
| 蛇铺满网格，无空格放置食物 | 空格集合为空 → `state = 'OVER'` 并给出结束提示，不再尝试生成食物 |
| 同一节拍内连续按多个方向键 | 只采纳第一个与当前实际方向不相反的输入，其余忽略 |
| 背景标签页切回 | 补步数受 `MAX_CATCHUP_STEPS` 限制，超出部分丢弃，不瞬间连撞 |
| 结束后继续按方向键 | `state === 'OVER'` 时输入处理器不改写 `pendingDir`，蛇的位置与方向不变 |
| 结束后按空格 | 触发 `resetGame()`，开始新一局 |
| 方向键触发页面滚动 | 对方向键调用 `preventDefault()` |
| 高 DPI 屏 | 按 `devicePixelRatio` 放大内部分辨率再缩放上下文 |

## 7. 测试策略

项目按已确认的非目标不引入测试框架，因此验证以**浏览器中可观察的行为**为准，分两层：

1. **任务级验证**：`tasks.md` 中每个任务在描述里自带验证方式，实现该任务后立即执行并记录结论。覆盖：页面骨架可打开、蛇自动匀速前进、八向按键生效、反向与单节拍转向被正确忽略、进食增长与计分、两种结束方式、结束后输入失效、重开重置。
2. **集成验收**（任务 7.1）：对照 `specs/snake-game/spec.md` 的每条 Requirement 与 Scenario 逐项走查，记录通过/不通过；再完整游玩一局到结束并重开，确认控制台无报错（任务 7.2）。

**失败后的定位方式**：所有逻辑使用格子坐标且不依赖 DOM，可在浏览器控制台对状态对象直接读数，并配合临时断点核对每一步后的 `snake`、`food`、`score` 是否符合预期。

**不采用**：`?selftest=1` 之类的隐藏自检入口——超出 spec 范围、违反 YAGNI，且会引入一套需要自行维护的断言逻辑。

## 8. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 后台标签页切回瞬间补步过多 → 连撞 | 单帧补步上限 `MAX_CATCHUP_STEPS`，超出部分丢弃累积时间 |
| 高 DPI 屏 Canvas 绘制发虚 | 按 `devicePixelRatio` 放大内部分辨率并缩放上下文 |
| 蛇铺满网格时食物无处生成 | 空格集合为空即判定结束（已固化为 spec Scenario） |
| 状态与渲染耦合，逻辑无法单独推理 | 逻辑函数只读写格子坐标状态；`draw()` 只读状态；唯一接口是主循环 |
| 重开与首次初始化分叉导致行为不一致 | 两者共用 `resetGame()` |
| 单节拍内连按绕过反向检查而自撞 | 以待处理方向与**当前实际方向**比较，而非与已改写方向比较 |

## 9. 回滚方案

全新增文件，不涉及数据迁移或既有行为变更。删除 `index.html`、`style.css`、`game.js` 三个文件即回到基线提交状态。

## 10. 本次设计阶段回写的 Spec Patch

在设计阶段审查 delta spec 时发现 4 处验收缺口，已回写 `specs/snake-game/spec.md`（只补场景、消歧义、补边界，未改动结构与范围）：

1. 「页面加载即开局」场景明确初始长度为 3 格
2. 新增 Scenario「初始移动方向固定」：首次开局与重开时，玩家未输入前蛇向右移动
3. 新增 Scenario「重开由空格键触发」，并把该触发方式写入 Requirement 描述
4. 「食物生成与蛇身增长」新增 Scenario「无空格可放置食物」，并把该边界写入 Requirement 描述

回写后 delta spec 为 7 条 Requirement / 17 个 Scenario，`openspec validate --strict` 通过。

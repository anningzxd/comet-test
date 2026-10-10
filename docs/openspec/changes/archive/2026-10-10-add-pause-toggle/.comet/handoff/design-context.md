# Comet Design Handoff

- Change: add-pause-toggle
- Phase: design
- Mode: compact
- Context hash: c4bbecb2e7cd8bec9bb5d54cc0c4b503df73b4e9929e18fccf4b2917b6bc6043

Generated-by: comet-handoff.sh
Task hash policy: task-content-v1. Read tasks.md for live completion; excerpts are design-time context.

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## docs/openspec/changes/add-pause-toggle/proposal.md

- Source: docs/openspec/changes/add-pause-toggle/proposal.md
- Lines: 1-43
- SHA256: 840405eb77997df9c6ab814aec83003183ea9d3461f44cd95580e37256411f73

```md
# Proposal

## Why

玩家目前无法在游戏进行中暂停。一旦开局，蛇就按固定节拍持续前进；玩家临时需要离开或被别的事情打断时，只能眼看着蛇撞墙结束。分数越高、蛇越长，这种"一放手就输"的代价越大。

暂停是这类实时小游戏的标配控制，缺失它意味着玩家必须一口气玩完一局。

## What Changes

- **新增暂停/继续控制**：游戏运行中按 **P 键**进入暂停，再按 P 恢复运行
- **暂停期间蛇完全静止**：不推进、不得分；方向键与空格键在暂停期间均被忽略——暂停状态的唯一出口是按 P
- **暂停的可见反馈**：暂停时在画布上叠加半透明覆盖层，居中显示「已暂停 · 按 P 继续」，与现有「游戏结束」覆盖层同一视觉风格，不新增 DOM 元素
- **游戏状态由两态扩展为三态**：`RUNNING | PAUSED | OVER`
- **ADDED**：`snake-game` 能力新增「暂停与继续」Requirement
- **MODIFIED**：`snake-game` 的「按节拍推进的移动」Requirement 原文未区分暂停，需限定为仅在运行状态下推进
- 更新 `index.html` 的操作提示文案，把 P 键提示写进去

明确不在本次范围内：

- 自动暂停（切换标签页 / 窗口失焦时自动暂停）
- 暂停计时、暂停次数统计
- 暂停菜单、多级暂停、设置项
- 改动方向键、WASD、空格键的既有语义（空格仍只在结束后重开；运行中按空格仍无反应）

## Capabilities

### New Capabilities

无。本次是既有能力的扩展，不引入新的 capability。

### Modified Capabilities

- `snake-game`：新增「暂停与继续」行为要求；并把「按节拍推进的移动」的作用范围限定为运行状态。

## Impact

- 修改文件：
  - `game.js` —— 状态常量与判定、`onKeyDown` 的 P 键分支与暂停态输入屏蔽、`loop()` 的时间累积条件、`draw()` 的暂停覆盖层
  - `index.html` —— 操作提示文案（加入 P 键）
- 不新增文件、不引入依赖、不改变运行方式（仍是双击 `index.html` 即玩）
- 既有行为保持不变：方向键与 WASD 转向、转向校验规则、空格重开、计分、食物生成、撞墙与撞身结束
- 需要回归的既有行为：转向校验（拒绝 180 度反向、单节拍内只转向一次）、按节拍推进、结束与重开——暂停状态不得让其中任何一条失效

```

## docs/openspec/changes/add-pause-toggle/design.md

- Source: docs/openspec/changes/add-pause-toggle/design.md
- Lines: 1-67
- SHA256: 2b7ed1b9bd2d4ba3972c4418e3b360f3ca876d194dc5afc47b649bf462a0a3d0

```md
# Design

## Context

见 `proposal.md` 的 Why。本次是对**既有能力** `snake-game` 的扩展，不是引入新 capability。

行为契约见 `specs/snake-game/spec.md`。本文件是 Open 阶段的决策摘要；**正式技术设计**（现状与代码定位、关键决策的完整论证与备选、状态迁移、边界与失败路径、测试策略、风险表、实现定位清单）见：

> `docs/superpowers/specs/2026-10-10-add-pause-toggle-design.md`

即 change 状态中的 `design_doc`。本文不复制该文档的详细内容，只保留摘要与决策索引。

关键约束：

- 现有实现为仓库根 `index.html` / `style.css` / `game.js`，单一 IIFE，无构建、无依赖
- 不得改变方向键 / WASD 的既有语义；空格仍是结束后的重开键
- 不新增交付文件、不引入依赖

## Goals / Non-Goals

**Goals:**

- 用最小改动把状态机扩为三态，且**不新增第二处"是否推进"的判断**
- 使「恢复后不补偿连走」成为结构上的必然，而非靠额外逻辑补救
- 既有 `snake-game` 的 17 个 Scenario 全部保持有效

**Non-Goals:**

- 不引入自动暂停（切后台 / 失焦）、暂停计时、暂停菜单、多级暂停
- 不重构既有的 `loop()` / `step()` / 输入结构
- 不新增 DOM 元素（暂停提示沿用画布覆盖层）

## Decisions

以下为已确认的技术决策索引，逐项的理由、备选与代价见正式设计文档第 3 节。

1. **状态机**：扩为三态 `RUNNING | PAUSED | OVER`（否决布尔量叠加——会产生"已暂停且已结束"这类非法组合）
2. **暂停不推进的实现**：复用既有守卫——`step()` 首行已挡住非运行态，且暂停态落入 `loop()` 中把 `accumulator` 清零的分支，因此「恢复后不补偿连走」是结构必然。**`step()` 与 `loop()` 均无需改动**
3. **P 键处理**：作为 `onKeyDown()` 的独立分支，且**必须早于方向映射表的提前返回**（否则永不生效）；只在运行/暂停两态切换；P 无需 `preventDefault()`（浏览器对单独按 P 无默认行为）
4. **按键重复**：在 `onKeyDown()` 入口统一过滤 `event.repeat`，对 P 与空格两个单次命令键生效（P 侧是新功能正确性所必需；空格侧顺带关闭上一 change 记录的已接受偏差 D-3）
5. **暂停提示**：`draw()` 中与结束覆盖层互斥，沿用画布覆盖层的做法

## Risks / Trade-offs

- [恢复瞬间补偿式连走] → 暂停态落入 `loop()` 的清零分支；作为独立 Scenario 实测，不靠阅读推断
- [按住 P 反复切换暂停/恢复] → 入口过滤 `event.repeat`（长按约 300–500ms 即触发自动重复）
- [P 分支位置放错导致永不生效] → P 分支必须早于方向映射表的提前返回
- [结束态误响应 P] → P 分支只在运行/暂停两态切换
- [暂停覆盖层与结束覆盖层同时绘制] → 两态互斥，绘制二选一
- [既有行为回归] → 暂停不触碰方向校验、进食、碰撞逻辑；集成验收做 17 个既有 Scenario 的全量回归

## 设计阶段回写的 Spec Patch

审查 delta spec 时发现 1 处验收缺口：用户已确认「P 与空格都过滤按键自动重复」，但该行为在 spec 中无对应场景。已回写 `specs/snake-game/spec.md`：新增 **ADDED** Requirement「命令键只响应无修饰键的单次按下」，含 3 个场景（按住 P 不反复切换 / 按住空格只重开一次 / 带修饰键的组合键不触发命令）。

采用 ADDED 而非 MODIFIED，是因为它不改写既有「游戏启动与重开」的文字，只是新增一条约束。回写后 delta spec 为 **3 条 Requirement / 13 个 Scenario**，`openspec validate --strict` 通过。其中第 3 个场景是 Build 阶段据独立审查的发现补入的。

## Migration Plan

无数据迁移与文件增删。回滚方式：还原 `game.js` 与 `index.html` 的改动，回到本 change 的 `base-ref`（`432f413`）。

## Open Questions

- 暂停覆盖层的具体文案与配色（拟沿用结束覆盖层的深色遮罩与居中排布：标题「已暂停」、副行「按 P 继续」）
- 提示行的最终措辞（需同时容纳方向键 / WASD、P、空格三项说明）

以上均为可后调的呈现细节，不改变行为契约与任务划分。

```

## docs/openspec/changes/add-pause-toggle/tasks.md

- Source: docs/openspec/changes/add-pause-toggle/tasks.md
- Lines: 1-44
- SHA256: 60886376655301963782a90a6fae77d0264ad3f06c0a7d2a50e8b0dc4098c2ac

```md
# Tasks

> 本项目按此前确认的设计非目标不引入测试框架，因此每个任务的验证均为「浏览器中可观察的行为」或「对交付文件的直接检查」，不依赖自动化测试运行器。

## 1. 状态机扩展

- [x] 1.1 在 `game.js` 增加暂停状态常量，并把运行 / 暂停 / 结束三态集中定义；验证：源码中状态常量集中定义，全文件不出现裸字符串形式的状态比较 <!-- comet-task:ff2b809e-199c-4851-bd5a-e002f15b0b56 -->
- [x] 1.2 核对既有的状态判断并补齐暂停态的处理，使其在推进、输入、绘制三处都符合 delta spec；验证：源码走查记录上述三处各自的结论，并在浏览器中确认「运行 → 撞墙结束 → 空格重开」这条既有路径行为不回归 <!-- comet-task:fba7081c-85d5-47e7-82e1-08bac5d7f65d -->

## 2. 主循环的暂停语义

- [x] 2.1 使暂停期间不累积推进时间（非运行态把时间累加值清零）；验证：暂停约 5 秒后恢复运行，蛇按单格节拍前进，不出现一次前进多格（对应 spec「恢复后不出现补偿式连走」） <!-- comet-task:82e6cb31-1f8f-4cf6-b4b0-5bd4857a7501 -->
- [x] 2.2 确认暂停期间蛇不推进、得分不变；验证：暂停后持续观察约 10 秒，蛇的位置与得分显示均无任何变化（对应 spec「暂停期间不推进」） <!-- comet-task:a88e93b9-a3a9-4220-849f-bb6b86c5332e -->

## 3. P 键输入与暂停态输入屏蔽

- [x] 3.1 在方向键与空格之外增加 P 键分支，在运行与暂停两态之间切换；验证：运行中按 P 进入暂停，再按 P 恢复运行（对应 spec「P 键暂停」「P 键继续」） <!-- comet-task:1d302f2a-a95c-4c4f-8496-e288bf6bc86b -->
- [x] 3.2 暂停期间屏蔽方向键与 WASD；验证：暂停中依次按 ↑ ↓ ← → 与 W A S D，蛇的方向与位置均不发生变化（对应 spec「暂停时方向键不被采纳」） <!-- comet-task:6482d6cc-c318-491b-be73-c3cc64dfd987 -->
- [x] 3.3 暂停期间屏蔽空格键；验证：暂停中按空格，不开始新的一局，蛇的位置与得分不变，且仍处于暂停状态（对应 spec「暂停时空格不重开」） <!-- comet-task:32e90e01-a44f-4357-b48a-53298c252242 -->
- [x] 3.4 结束态不响应 P；验证：让蛇撞墙结束后按 P，结束提示仍然显示，游戏状态与画面均不变化（对应 spec「结束后不能暂停」） <!-- comet-task:536c4660-9514-4df8-a965-a2236347837e -->
- [x] 3.5 命令键排除带修饰键的组合（Ctrl / Cmd / Alt / Shift + P 或空格）；验证：运行中按 Ctrl+P 不进入暂停（浏览器打印对话框弹出属预期行为），Ctrl+空格 与 Shift+空格 既不在结束态重开、也不被 `preventDefault` 吞掉（对应 spec「带修饰键的组合键不触发命令」） <!-- comet-task:147229db-b358-4728-85a1-57b0654115de -->
- [ ] 3.6 同步文档中的 delta spec 计数与 Requirement 名称（Build 阶段增量后实为 3 条 Requirement / 13 个 Scenario）；验证：正式设计文档 §7/§10、Open 阶段 design.md、实施计划三处计数均为 13，且该 ADDED Requirement 在三处均名为「命令键只响应无修饰键的单次按下」 <!-- comet-task:9bc94e9d-bba7-4b68-8ecc-ff24c6fe00e3 -->

## 4. 暂停覆盖层

- [x] 4.1 在 `draw()` 中为暂停态叠加遮罩并居中显示暂停提示；验证：暂停后画布上出现暂停提示，且文案包含恢复方式（对应 spec「暂停提示可见」） <!-- comet-task:bf4dc1d5-fb4e-4550-96ae-acbaf2ebdb27 -->
- [x] 4.2 确认暂停提示与结束提示互斥；验证：暂停状态不显示结束提示，结束状态不显示暂停提示 <!-- comet-task:8489bc15-5d54-40d5-b592-048b031db989 -->

## 5. 操作提示文案

- [x] 5.1 在 `index.html` 的提示行并入 P 键说明；验证：打开页面，提示行同时包含方向键 / WASD、暂停键、重开键三项说明 <!-- comet-task:055740f5-b0de-4a36-8adb-ec01d37cc0ea -->
- [x] 5.2 确认提示文案与实际行为一致；验证：按提示逐个按键确认——运行中方向键与 WASD 转向生效、运行中 P 暂停生效、暂停中 P 恢复生效、结束后空格重开生效 <!-- comet-task:ff8f79c9-eefc-49e6-9a90-eaedeb04a2a0 -->

## 6. 集成验收与既有行为回归

- [x] 6.1 对照本 change 的 delta spec（ADDED 与 MODIFIED）逐条 Requirement 与 Scenario 走查，记录通过 / 不通过结论 <!-- comet-task:5c245471-3a61-4f81-b1cb-ac5086d1cbd5 -->
- [x] 6.2 回归 `docs/openspec/specs/snake-game/spec.md` 主 spec 的 17 个 Scenario，确认暂停改动未使其中任何一条失效 <!-- comet-task:9e3d2321-85ba-44b1-8861-3818f96415db -->
- [x] 6.3 完整跑一局：暂停 → 恢复 → 吃食物 → 撞墙结束 → 空格重开 → 再暂停，全程确认控制台无报错、无未捕获异常 <!-- comet-task:27685476-9398-443b-bcaf-b35e4cd5f79c -->
- [x] 6.4 确认交付物仍为 `index.html`、`style.css`、`game.js` 三个文件，未新增文件、未引入依赖，且仍可双击 `index.html` 直接运行 <!-- comet-task:f59ed109-db60-4530-a609-a7fb117a3b1e -->

## Workflow follow-up

- 满足项目审查要求后归档该 change
- 验证归档结果

```

## docs/openspec/changes/add-pause-toggle/.openspec.yaml

- Source: docs/openspec/changes/add-pause-toggle/.openspec.yaml
- Lines: 1-2
- SHA256: e61703315c59969805e021ec521ca189369aaf8ea902d52c5e39c7fbc603598f

```md
schema: spec-driven
created: 2026-10-10

```

## docs/openspec/changes/add-pause-toggle/specs/snake-game/spec.md

- Source: docs/openspec/changes/add-pause-toggle/specs/snake-game/spec.md
- Lines: 1-82
- SHA256: b716438b9407cf637d7fbe0a24271b4108d6739306c547715b93fee5936b9f5e

[TRUNCATED]

```md
# Spec Delta

## ADDED Requirements

### Requirement: 暂停与继续

系统 SHALL 允许玩家在游戏运行中按 P 键进入暂停，并 SHALL 在暂停状态下再按 P 恢复运行。暂停期间系统 MUST NOT 推进游戏，且 MUST NOT 采纳除 P 以外的任何按键输入。

#### Scenario: P 键暂停

- **WHEN** 游戏运行中玩家按下 P
- **THEN** 游戏进入暂停状态，蛇停止推进，画布上出现暂停提示

#### Scenario: P 键继续

- **WHEN** 游戏处于暂停状态，玩家按下 P
- **THEN** 游戏恢复运行，蛇继续按固定节拍移动

#### Scenario: 暂停时方向键不被采纳

- **WHEN** 游戏处于暂停状态，玩家按下任一方向键或 WASD 键
- **THEN** 蛇的方向与位置均不发生变化，且游戏仍处于暂停状态

#### Scenario: 暂停时空格不重开

- **WHEN** 游戏处于暂停状态，玩家按下空格键
- **THEN** 游戏仍处于暂停状态，不开始新的一局，蛇的位置与得分均不变化

#### Scenario: 结束后不能暂停

- **WHEN** 游戏已结束，玩家按下 P
- **THEN** 游戏状态与画面均不发生变化，结束提示仍然显示

#### Scenario: 暂停提示可见

- **WHEN** 游戏处于暂停状态
- **THEN** 画布上叠加显示暂停提示，其中包含恢复方式（按 P 继续）

#### Scenario: 恢复后不出现补偿式连走

- **WHEN** 游戏暂停时间超过一个节拍后玩家按 P 恢复
- **THEN** 蛇自恢复时刻起按固定节拍逐格前进，不会因暂停期间累积的时间而在一次推进中前进多格

#### Scenario: 新一局不处于暂停

- **WHEN** 玩家开始新的一局（首次加载页面，或结束后按空格重开）
- **THEN** 游戏处于运行状态而非暂停状态，蛇立即开始按固定节拍移动

### Requirement: 命令键只响应无修饰键的单次按下

系统 SHALL 对暂停键（P）与重开键（空格）只响应无修饰键的单次按下：MUST NOT 因操作系统的按键自动重复而重复触发对应命令，且 MUST NOT 在同时按下 Ctrl / Cmd / Alt 等修饰键时触发。

#### Scenario: 按住 P 不反复切换

- **WHEN** 玩家按住 P 键不放，触发按键自动重复
- **THEN** 游戏只在首次按下时切换一次暂停状态，不因自动重复而反复暂停与恢复

#### Scenario: 按住空格只重开一次

- **WHEN** 游戏结束后玩家按住空格键不放，触发按键自动重复
- **THEN** 只开始一局新游戏，不因自动重复而反复重开

#### Scenario: 带修饰键的组合键不触发命令

- **WHEN** 游戏运行中玩家按下 Ctrl+P（或 Cmd+P、Alt+P），或按下 Ctrl+空格等带修饰键的组合
- **THEN** 游戏不进入暂停，也不开始新的一局，游戏状态与画面均不发生变化

## MODIFIED Requirements

### Requirement: 按节拍推进的移动

系统 SHALL 在游戏运行状态下以固定时间间隔推进蛇的位置，每次推进使蛇整体沿当前方向前进一个网格单位；游戏处于暂停或结束状态时 MUST NOT 推进。

#### Scenario: 未进食时按节拍前进

- **WHEN** 游戏进行中且经过一个节拍，并且蛇头未吃到食物
- **THEN** 蛇头沿当前方向前进一格，蛇尾相应退出该格，蛇身总长度不变

#### Scenario: 暂停期间不推进


```

Full source: docs/openspec/changes/add-pause-toggle/specs/snake-game/spec.md

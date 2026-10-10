---
change: add-snake-game
design-doc: docs/superpowers/specs/2026-10-10-snake-game-design.md
base-ref: c55353c16d29dd3353fa881f40e081c303f82f4a
archived-with: 2026-10-10-add-snake-game
---

<!-- comet-task-authority: docs/openspec/changes/add-snake-game/tasks.md -->

# 实施计划：贪吃蛇游戏（add-snake-game）

任务完成状态以 `docs/openspec/changes/add-snake-game/tasks.md` 为唯一权威，本文件不维护第二套勾选框。

## 执行配置（已由用户确认）

| 配置 | 取值 |
| --- | --- |
| build_mode | `autonomous` |
| tdd_mode | `direct`（`direct_override: true`）——项目不引入测试框架，无法建立自动化 RED/GREEN |
| review_mode | `standard`——审查有风险的任务，最终集成审查留给 Verify |
| isolation | `current`（分支 `master`） |

## 验证方式（替代自动化测试）

项目按已确认的非目标不引入测试框架。每个任务的验收按以下两种手段之一执行，并在实现后立即记录真实结果：

1. **浏览器可观察行为**：用本地静态服务器或直接 `file://` 打开 `index.html`，按任务描述操作并观察。
2. **交付文件直接检查**：读源码或控制台读数核对。

无头环境无法开浏览器时，退回手段 2（读源码 + 控制台断言语句），并在该任务记录中明确标注是哪种验证。

## 实施顺序与依赖

任务组按依赖串行：1 → 2 → 3 → 4 → 5 → 6 → 7。第 3 组的 `step()` 骨架是 4.3、5.2、6.1 的共同前置；第 4 组的 `pendingDir` 是 4.3 的前置。组内任务基本可并行编写，但按序提交更易回退。

## 1. 页面骨架与样式基线

- 范围：`index.html`、`style.css`、`game.js` 三个文件从零建立
- 约束：`game.js` 所有逻辑必须在 IIFE 内，不得向 `window` 添加任何属性（任务 1.3 的验收点）
- 交付结果：三个文件存在，页面能打开且控制台无报错

<!-- comet-task-ref:7a82ac63-78ff-4a3c-9dca-ee995fb63ebd -->
<!-- comet-task-ref:82f1d667-00a5-47d6-bc16-4b4654bb8dd2 -->
<!-- comet-task-ref:e32a3454-b1ed-4184-ac25-231f1723520f -->

## 2. 游戏状态与初始渲染

- 依赖：任务组 1 完成
- 范围：常量表（`COLS`/`ROWS`/`CELL`/`TICK_MS`/`MAX_CATCHUP_STEPS`/`INIT_LEN`/`INIT_DIR`/`RESTART_KEY`）、状态对象、dpr 画布初始化、`draw()`
- 约束：常量集中定义，逻辑中不出现魔法数字；逻辑只读写格子坐标
- 交付结果：页面显示初始蛇（3 格）与一个食物，两者不重叠，高 DPI 下不发虚

<!-- comet-task-ref:6fadca01-2e7b-447e-bfcd-4e8f49f9da8e -->
<!-- comet-task-ref:61affca6-529d-4b81-86f3-a137ed864a49 -->
<!-- comet-task-ref:d9cda77e-3794-41dd-b730-9d19975ed7e8 -->

## 3. 主循环与按节拍推进

- 依赖：任务组 2 完成（需要状态与 `draw()`）
- 范围：`rAF` 主循环 + 时间累加器、`step()` 的移动、单帧补步上限
- 风险：**中**。补步上限与累加器丢弃逻辑是设计文档第 3.2 节的核心，容易出现"切回标签页瞬间连撞"的缺陷；3.3 必须按设计值 `MAX_CATCHUP_STEPS = 2` 实现并实际切换标签页验证
- 交付结果：蛇匀速自动前进、长度不变、无残影；切走 10 秒再切回不会瞬间连撞

<!-- comet-task-ref:942617b7-4c2d-4cac-9b80-954f3fdf866a -->
<!-- comet-task-ref:bb1ae4da-063e-4b71-8ae7-346ceb57d3eb -->
<!-- comet-task-ref:04352c2c-5cc9-468a-8479-d7462f253544 -->

## 4. 键盘输入与转向校验

- 依赖：任务组 3 完成（`step()` 存在）
- 范围：`keydown` 监听与八向映射、`preventDefault()`、`pendingDir` 校验
- 风险：**高**。4.3 是设计文档第 3.3 节专门解决的经典缺陷，需两条规则同时成立：① 反向拒绝以"尚未应用转向的 `dir`"为基准，不能用已被改写的方向；② 单槽已非空即忽略后续按键，实现"每拍只采纳第一次合法转向"。实施中已确认：只做 ① 而允许后按覆盖，会使"同拍先 ↑ 再 ←"退化为继续向右，违反 delta spec 的「单节拍内只转向一次」。必须实际验证这两个场景，不能只读代码判断
- 交付结果：八个按键均生效；反向输入被忽略；同节拍内连按只采纳第一个合法转向

<!-- comet-task-ref:d83dc336-f13f-4495-8603-55bd41bbfa1f -->
<!-- comet-task-ref:6a03c056-6797-4ee4-a7a4-b5008c28bcf9 -->
<!-- comet-task-ref:4961d832-9f94-4fed-ad72-b4bf3d50820a -->

## 5. 食物、蛇身增长与计分

- 依赖：任务组 3 完成
- 范围：空格集合采样、进食判定与增长、得分显示与归零
- 约束：食物必须从空格集合中取，不得用"随机重试直到不重叠"（设计文档第 3.4 节）
- 交付结果：食物不与蛇身重叠；进食后长度 +1、得分 +1；重开后得分归零

<!-- comet-task-ref:baf65a69-cfcd-44d1-8a17-b9313ffa5c1a -->
<!-- comet-task-ref:508b6f9f-fb43-45e4-9651-d7a7fe7a8fdf -->
<!-- comet-task-ref:98581ed0-135e-4d69-a477-83b211a5a6c1 -->

## 6. 碰撞判定、结束与重开

- 依赖：任务组 3、5 完成（需要 `step()` 与进食逻辑）
- 范围：越界与撞身判定、结束覆盖层、`resetGame()`、结束后输入屏蔽；同时处理"无空格可放置食物"的结束路径
- 风险：**中**。6.3 的重开必须与首次开局共用 `resetGame()`（设计文档第 3.6 节），不得写两套初始化逻辑
- 交付结果：两种结束方式均停止推进并给出提示；空格键重开完整重置；结束后方向键无效

<!-- comet-task-ref:d022b7b0-f94f-46d5-b598-8d6fd4a732db -->
<!-- comet-task-ref:ec20c579-ba36-47f9-8861-cdd668ca521a -->
<!-- comet-task-ref:9613ba2b-2f8b-425f-91ee-9034e1ab9022 -->
<!-- comet-task-ref:64cd9521-b6bb-4303-82dd-b9722ac0160c -->

## 7. 集成验收

- 依赖：任务组 1–6 全部完成
- 范围：对照 delta spec 逐条走查、完整游玩一局、核对交付物清单
- 结果以走查记录形式写回任务提交说明与最终验证报告
- **审查安排（review_mode: standard）**：本组完成后，由独立审查者（子代理）对 `index.html`/`style.css`/`game.js` 做一次任务级独立审查，重点核对 4.3 的转向校验与 6.3 的重开重置是否与设计一致；CRITICAL/IMPORTANT 问题必须修复后再进入 Verify

<!-- comet-task-ref:31f24be2-d3c2-4de1-9acb-ba57fd858464 -->
<!-- comet-task-ref:6a86c22f-9b68-4898-b5f9-61effb66e37a -->
<!-- comet-task-ref:6b0cb1f0-1dcd-4d5e-8979-52d4334ca21a -->

## 提交策略

- 每个任务组完成后提交一次，commit message 注明覆盖的任务 ID
- 若实现过程中修改了 delta spec，在 commit message 中注明原因，便于归档时判断 design doc 漂移
- 提交放在阶段守卫通过之后（按 Comet Build 的退出条件）

## 回退方案

全新增文件。任一任务组失败时，回退该组的文件改动即可；整体回退为删除三个交付文件，回到 `base-ref`。

## 不在本计划范围

- 触屏/移动端、最高分、逐级加速、暂停、穿墙（proposal 已确认为非目标）
- 自动化测试框架、构建步骤、ES module

## 验收记录（2026-10-10）

### 黑盒行为验证

脚本位于仓库外（`%TEMP%\snake-verify\harness.js`），不属于交付物。它通过 stub 的 DOM / Canvas / requestAnimationFrame 接口加载**真实的 `game.js`**，只经由 keydown 事件与绘制调用两个真实接口观察行为，不触碰内部变量。执行命令：

```
node "C:/Users/annin/AppData/Local/Temp/snake-verify/harness.js" "D:/code/ai/comet-todo/game.js"
```

结果：**45 / 45 断言通过**（修复审查意见后重跑仍为 45/45）。覆盖 delta spec 的 17 个 Scenario 中的 16 个：

| 组 | 覆盖内容 | 结果 |
| --- | --- | --- |
| A | 页面加载即开局：蛇 3 格、1 个食物、得分 0、食物不重叠、蛇头 (10,10)、未泄漏全局 | 7/7 |
| B | 初始方向向右、按节拍前进、未进食长度不变、无残影 | 5/5 |
| C | 撞墙结束、结束位置在边界、结束后不推进、结束后方向键两次均无效、仍显示提示 | 6/6 |
| D | 空格 preventDefault、重开长度/位置/得分/提示全量重置、重开后恢复移动 | 6/6 |
| E | 拒绝 180 度反向、单节拍内只转向一次、方向键、WASD 大小写全键位、preventDefault | 10/10 |
| F | 吃到食物得分 +1、长度 +1、立即生成新食物且不重叠、增长过程中始终不重叠、重开归零 | 9/9 |
| G | 撞到自身结束（AI 养长到 8 节后执行 2×2 回转触发自撞） | 1/1 |

未覆盖的 1 个场景「无空格可放置食物」需要蛇长到 400 格铺满网格，黑盒不可达，改由读码确认：`spawnFood()` 在空格集合为空时置 `food = null` 并返回 false，`step()` 与 `resetGame()` 两条路径收到 false 均置 `OVER`，且 `step()` 首行即对非 RUNNING 状态 return，不再尝试生成食物。

### 独立审查

`review_mode: standard`，由独立审查者（子代理）完成，未采信实现者自评。审查者另行复制 `game.js` 到仓库外、用桩 DOM 驱动真实代码跑了 20 项自动化检查（含 60 局、25,560 步的随机化不变量扫描）全部 PASS，并逐条核对 13 项高风险点。

审查结论：**无 CRITICAL、无 IMPORTANT**。3 项 MINOR 与 4 项 SUGGESTION 均已处理：

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| MINOR-1 | `border-box` 使画布内容盒 478×478，与 480×480 位图不匹配致轻微发虚 | 已修：`.game__canvas { box-sizing: content-box }` |
| MINOR-2 | `html,body{height:100%}` + 垂直居中，矮视口下裁掉面板顶部且不可滚动 | 已修：改为 `html{height:100%}` + `body{min-height:100%}` |
| MINOR-3 | 文档误计 delta spec 为 8 条 Requirement / 19 个 Scenario | 已修：实为 **7 条 / 17 个**，已更正 design.md、正式设计文档与 brainstorm-summary |
| SUGGESTION-1 | `step()` 内重复反向校验，与设计 §3.3 的单一职责冲突（死代码） | 已修：删除重复校验，注释说明校验只在 keydown |
| SUGGESTION-2 | 用 `0` 作 rAF 时间戳的未初始化哨兵 | 已修：改用 `null` 哨兵 |
| SUGGESTION-3 | `id="status"` 为死 id；提示文案未体现"结束后"前提 | 已修：删除死 id，文案改为「结束后按空格键重开」 |
| SUGGESTION-4 | 任务未勾选、文件未提交 | 按本阶段流程处理：勾选任务 → 录制检查 → 守卫 → 提交 |

修复后重跑黑盒验证：45/45 通过；`node --check game.js` 通过。

### 实施中修复的实现缺陷（非审查发现）

转向校验初版只做「单槽 + 后按覆盖」，会让「单节拍内只转向一次」失败（向右时同拍先按 ↑ 再按 ←，槽内只剩 ←，与向右相反被拒，蛇继续向右）。已改为「每拍只采纳第一次合法转向」，并同步修正设计文档第 3.3 节。修正后 E1/E2 两场景通过。行为契约未变，不涉及 Spec Patch。

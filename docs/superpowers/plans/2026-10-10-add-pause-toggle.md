---
change: add-pause-toggle
design-doc: docs/superpowers/specs/2026-10-10-add-pause-toggle-design.md
base-ref: 432f413f0041f4d22fc826b2b69edc653ec8a23a
---

<!-- comet-task-authority: docs/openspec/changes/add-pause-toggle/tasks.md -->

# 实施计划：贪吃蛇暂停功能（add-pause-toggle）

任务完成状态以 `docs/openspec/changes/add-pause-toggle/tasks.md` 为唯一权威，本文件不维护第二套勾选框。

## 执行配置（已由用户确认）

| 配置 | 取值 |
| --- | --- |
| build_mode | `autonomous` |
| tdd_mode | `direct`（`direct_override: true`）——项目不引入测试框架，无法建立自动化 RED/GREEN |
| review_mode | `standard`——审查有风险的任务，最终集成审查留给 Verify |
| isolation | `current`（分支 `main`） |

## 本 change 的执行特征

改动面很小，但**有一个非对称之处必须注意**：按正式设计第 3.2 节，`step()` 与 `loop()` **无需改动**——暂停态天然被 `step()` 首行的守卫挡住，且落入 `loop()` 中把 `accumulator` 清零的分支。因此任务组 2 的两个任务是**核实既有结构确实给出所需行为**，而不是新增逻辑；只有在核实发现结构不成立时，才需要改代码。

这决定了任务组 2 的验收方式：不能靠阅读代码推断"应该没问题"，必须用可执行的驱动确认（见下）。

## 验证方式（替代自动化测试）

项目按已确认的非目标不引入测试框架。验证分两路：

1. **仓库外黑盒脚本**：用 stub 的 `document` / `canvas` / `requestAnimationFrame` 加载**真实的 `game.js`**，只经 `keydown` 事件与绘制调用两个真实接口观察。脚本源码见上一 change 的验证报告附录 A（`docs/superpowers/reports/2026-10-10-add-snake-game-verify.md`），本次在其基础上扩展暂停与按键重复断言。**这是任务组 2 唯一可信的验收手段**，因为"暂停期间未累积时间"无法靠观察静态代码确定。
2. **浏览器可观察行为**：打开 `index.html` 人工操作确认。用于覆盖"提示可见""文案与实际一致"这类需要人眼判断的项。

无头环境无法开浏览器时，退回手段 1 并明确标注；不把"读代码认为对"记为已验证。

## 实施顺序与依赖

按 1 → 2 → 3 → 4 → 5 → 6 串行。任务组 1 的状态常量是其余各组的前置；任务组 2 依赖 1；任务组 3 依赖 1、2；4 依赖 1；5 独立；6 依赖 1–5。

## 1. 状态机扩展

- 范围：`game.js` 常量区（新增暂停状态常量）与状态判定点
- 约束：状态量必须集中定义，全文件不出现裸字符串状态比较
- 交付结果：三态并存，暂停态在各判定点落入正确一侧

<!-- comet-task-ref:ff2b809e-199c-4851-bd5a-e002f15b0b56 -->
<!-- comet-task-ref:fba7081c-85d5-47e7-82e1-08bac5d7f65d -->

## 2. 主循环的暂停语义

- 依赖：任务组 1
- 范围：**核实**（非改造）`step()` 首行守卫与 `loop()` 的时间累积分支对暂停态的处理
- 风险：**高**，且是本次首要风险。设计第 3.2 节的结论是"结构上必然成立"，但这是推断；必须用黑盒脚本实测——暂停后驱动多帧（含跨多个节拍的时间戳），断言蛇头坐标与得分完全不变；恢复后逐帧驱动，断言单帧最多前进一格
- 交付结果：即使暂停数秒，恢复后也不出现单帧多步

<!-- comet-task-ref:82e6cb31-1f8f-4cf6-b4b0-5bd4857a7501 -->
<!-- comet-task-ref:a88e93b9-a3a9-4220-849f-bb6b86c5332e -->

## 3. P 键输入与暂停态输入屏蔽

- 依赖：任务组 1、2
- 范围：`onKeyDown()` 入口的 `event.repeat` 过滤、**修饰键排除**、新增 P 分支、暂停态对方向键与空格的屏蔽
- 风险：**中**。三处易错：
  - **修饰键**——只看 `event.key` 会让 `Ctrl+P`（打印）同时把游戏切到暂停；空格分支还会用 `preventDefault()` 吞掉 `Ctrl+空格`（输入法切换）与 `Alt+空格`（Windows 窗口菜单）。该问题由独立审查发现后补入（任务 3.5）
  - P 分支的位置——必须与空格分支并列，**早于** `hasOwnProperty(KEY_DIRECTIONS, event.key)` 那句提前返回；写在它之后会永不生效，且表现为"按 P 完全没反应"
  - 暂停态屏蔽——方向键分支会先 `preventDefault()` 再判断状态，所以暂停时"方向键被忽略但不滚动页面"；空格分支同理。改动时不要打乱这个次序
- 交付结果：P 可切换暂停；暂停态下方向键与空格均不改变游戏状态；结束态下 P 不生效；按住 P 或空格只生效一次

<!-- comet-task-ref:1d302f2a-a95c-4c4f-8496-e288bf6bc86b -->
<!-- comet-task-ref:6482d6cc-c318-491b-be73-c3cc64dfd987 -->
<!-- comet-task-ref:32e90e01-a44f-4357-b48a-53298c252242 -->
<!-- comet-task-ref:536c4660-9514-4df8-a965-a2236347837e -->
<!-- comet-task-ref:147229db-b358-4728-85a1-57b0654115de -->
<!-- comet-task-ref:9bc94e9d-bba7-4b68-8ecc-ff24c6fe00e3 -->

## 4. 暂停覆盖层

- 依赖：任务组 1
- 范围：`draw()` 末端的覆盖层选择，以及新增的暂停覆盖层绘制
- 约束：与结束覆盖层互斥（`if OVER … else if PAUSED …`），沿用既有覆盖层的遮罩与居中排布
- 交付结果：暂停时画布出现暂停提示且含恢复方式；暂停与结束提示不同时出现

<!-- comet-task-ref:bf4dc1d5-fb4e-4550-96ae-acbaf2ebdb27 -->
<!-- comet-task-ref:8489bc15-5d54-40d5-b592-048b031db989 -->

## 5. 操作提示文案

- 依赖：无（可与 2–4 并行）
- 范围：`index.html` 的提示行
- 约束：提示行需同时容纳方向键 / WASD、P、空格三项说明，且不得与实现行为矛盾
- 交付结果：提示完整且逐项按下均与提示一致

<!-- comet-task-ref:055740f5-b0de-4a36-8adb-ec01d37cc0ea -->
<!-- comet-task-ref:ff8f79c9-eefc-49e6-9a90-eaedeb04a2a0 -->

## 6. 集成验收与既有行为回归

- 依赖：任务组 1–5 全部完成
- 范围：delta spec 13 个 Scenario 走查、主 spec 既有 17 个 Scenario 回归、完整跑一局、交付物边界核对
- 审查安排（`review_mode: standard`）：本组完成后，由独立审查者（子代理）对最终 `game.js` / `index.html` / `style.css` 做一次任务级独立审查，重点核对任务组 2 的结构性结论（暂停期间不累积时间）与任务组 3 的 P 分支位置；CRITICAL / IMPORTANT 问题必须修复后再进入 Verify

<!-- comet-task-ref:5c245471-3a61-4f81-b1cb-ac5086d1cbd5 -->
<!-- comet-task-ref:9e3d2321-85ba-44b1-8861-3818f96415db -->
<!-- comet-task-ref:27685476-9398-443b-bcaf-b35e4cd5f79c -->
<!-- comet-task-ref:f59ed109-db60-4530-a609-a7fb117a3b1e -->

## 提交策略

- 全部完成后提交一次，commit message 注明覆盖的任务组与任务 ID
- 若实施中修改了 delta spec，在 commit message 中注明原因，便于归档时判断 design doc 漂移
- 提交放在阶段守卫通过之后（按 Comet Build 的退出条件）

## 回退方案

改动集中在 `game.js` 的常量区、`onKeyDown()`、`draw()` 三处，加 `index.html` 一行文案。整体回退为还原这两个文件到 `base-ref`。

## 不在本计划范围

- 自动暂停（切后台 / 失焦）、暂停计时、暂停菜单、多级暂停（proposal 已确认为非目标）
- 新增交付文件、引入依赖、引入测试框架
- 改动方向键 / WASD 的既有语义

## 验收记录（2026-10-10）

### 实际改动

`git diff --stat`：`game.js` +48 行、`index.html` 1 行改动。改动集中在四处：

1. 常量：新增 `PAUSE_KEY` 与 `STATUS_PAUSED`
2. `onKeyDown()`：入口统一过滤 `event.repeat`（P 与空格）；新增 P 分支，位置在方向映射表的提前返回**之前**
3. 新增 `drawPauseOverlay()`，`draw()` 末端改为结束/暂停二选一
4. `index.html` 提示行并入 P 键说明

`step()`、`loop()`、`resetGame()` 按设计**未改动**——这是设计第 3.2 节的结论，由下面的黑盒验证确认其成立。

### 黑盒行为验证

脚本位于仓库外（`%TEMP%\snake-verify\harness-pause.js`），不属于交付物。它经 stub 的 DOM / Canvas / rAF 加载**真实的 `game.js`**，只经 keydown 事件与绘制调用两个真实接口观察。执行命令：

```
node "C:/Users/annin/AppData/Local/Temp/snake-verify/harness-pause.js" "D:/code/ai/comet-todo/game.js"
```

结果：**67 / 67 断言通过**（本轮结果；第二轮修复后又补了 4 条 Shift 断言，最终为 **71 / 71**，见下文「第二轮独立审查」）。分组覆盖：

| 组 | 覆盖内容 | 结果 |
| --- | --- | --- |
| A–G | 既有 17 个 Scenario 的**全量回归**（初始状态、初始方向与节拍、撞墙结束与结束后输入、空格重开、转向校验、进食增长计分、撞身结束） | 36/36 |
| H | 暂停与继续 8 个场景：P 暂停/继续、暂停期间位置与得分不变、暂停中方向键不生效、暂停中空格不重开、长暂停 5 秒后仍不推进、**恢复后第一拍与第二拍各只前进 1 格（无补偿式连走）**、暂停反复切换、结束后 P 无效、重开后不处于暂停 | 20/20 |
| I | 按键自动重复 2 个场景：按住 P（连续 3 次 repeat）只切换一次、按住空格只重开一次 | 2/2 |
| J | 带修饰键的组合键（独立审查发现后补充）：Ctrl+P / Cmd+P / Alt+P 均不切换暂停；Ctrl+空格不被 `preventDefault` 吞掉、也不重开；并含「无修饰键的 P 与空格仍正常生效」的对照组 | 9/9 |

**任务组 2 的关键结论**：设计第 3.2 节断言"暂停期间不累积推进时间"在结构上必然成立（`step()` 首行守卫 + `loop()` 非运行分支清零 `accumulator`）。该断言已由 H2a/H2b（20 拍不推进）、H5a（暂停 5 秒后仍不推进）、H5c/H5d（恢复后逐格前进）四条断言从行为上确认，**不是仅凭阅读代码得出的结论**。

### 关于既有偏差 D-3

上一 change 的独立审查曾指出「按住空格会反复重开」，当时记录为已接受偏差 D-3（需长按约 1 秒才可感知）。按本次用户确认，`event.repeat` 过滤同时作用于空格，**D-3 据此关闭**，并在本 change 的 delta spec 中以 ADDED Requirement「命令键只响应无修饰键的单次按下」固化（场景「按住空格只重开一次」，由 I2b/I2c 验证）。

### 独立审查与随之修复的缺陷

`review_mode: standard`，由独立审查者（子代理）完成，未采信实现者自评。审查者把 `game.js` 复制到仓库外、用 stub DOM 经 `vm` 加载真实文件驱动，自建 **105 条断言（104 通过）**；并用大括号配对抽取函数体，确认 `step()`、`loop()`、`resetGame()`、`endGame()`、`spawnFood()` 与基线 `432f413` **逐字节相同**，仅 `draw()` 与 `onKeyDown()` 变化、`style.css` 未被触碰。

审查结论：**无 CRITICAL、无 IMPORTANT**；1 条 MINOR，即唯一失败项：

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| MINOR-1 | `isPause` 只看 `event.key`，未排除修饰键：运行中按 `Ctrl+P` 会同时弹出打印对话框**并把游戏切到暂停**（`Cmd+P` / `Alt+P` 同理）。同函数内空格分支还会用 `preventDefault()` 吞掉 `Ctrl+空格`（Windows 中文输入法切换）与 `Alt+空格`（Windows 窗口菜单） | **已修**：`isSpace` 与 `isPause` 均加 `!ctrlKey && !metaKey && !altKey`；该边界已写回 delta spec（新增场景「带修饰键的组合键不触发命令」）与正式设计文档 §3.6，并追加任务 3.5、补断言组 J |

该缺陷是本 change 新引入的行为面（P 是新增的全局命令键），因此在 Build 阶段直接修复，未留作已接受偏差。修复后重跑：**67/67 通过**，其中组 J 含对照组，确认无修饰键的 P 与空格仍正常生效。

**范围限定**：方向键 / WASD 的既有实现同样只比较 `event.key`（`Ctrl+S` 仍会转向），本次**不改变**它们——那是上一 change 的既有行为，改动它属于未被确认的范围扩大。该取舍已记入正式设计文档 §3.6。

### 第二轮独立审查（Verify 阶段）与随之修复

按 `review_mode: standard`，Verify 阶段对**最终 diff** 再安排一次集成审查（因 Build 审查之后代码只发生了审查者自己建议的 MINOR-1 修复，故只补查受影响部分）。

审查者把 `game.js` 复制到仓库外、用 stub DOM 经 Node `vm` 加载真实文件驱动，自建 **87 条断言（连跑 5 次均 87/87）**，并做了**负向对照**证明断言有判别力：把 `unmodified` 还原为修复前的写法 → 恰好在 `Ctrl+P` / `Alt+P` / `Ctrl+空格` 等断言上失败；换用基线 `432f413` → 在暂停相关断言上失败；另原样复现实现者的 67/67，未证伪。

审查结论：**无 CRITICAL、无 IMPORTANT**；2 条 MINOR + 1 条 SUGGESTION，均按 Comet 的规则判定为「范围内可明确修复」而**自动回 Build 修复**，未留作已接受偏差：

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| MINOR-2 | `unmodified` 只排除 Ctrl / Cmd / Alt，**漏了 Shift**：运行中 `Shift+空格`（微软拼音全角/半角切换）被 `preventDefault()` 吞掉；**已结束时 `Shift+空格` 会直接把游戏重开**。delta spec 写的是「无修饰键 … Ctrl / Cmd / Alt **等**修饰键」，Shift 已被覆盖，故属实现与 spec 不符 | **已修**：`unmodified` 加上 `!event.shiftKey`。CapsLock 打开时 `event.key` 已是 `'P'` 而 `shiftKey` 为 `false`，故「接受大写 P」不受影响。补断言 J7–J9b（含「结束态 Shift+空格 不重开」） |
| MINOR-3 | 文档滞后：Build 增量后 delta spec 实为 3 条 Requirement / **13** 个 Scenario，但正式设计 §7/§10、Open 阶段 design.md、实施计划仍写 12；该 ADDED Requirement 的名称也未同步 | **已修**：三处计数改为 13、名称统一为「命令键只响应无修饰键的单次按下」；追加任务 3.6 |
| SUGGESTION-4 | `proposal.md` 的 Impact 把 `loop()` 列为待改，而设计与实现均确认**无需改动** | **不改写 proposal**（那是设计前的意图记录，改写会篡改历史）。改为在此处与最终验证报告中注明：「`loop()` 未改动」 |

修复后重跑黑盒验证：**71 / 71 通过**（组 J 由 9 条增至 13 条）。

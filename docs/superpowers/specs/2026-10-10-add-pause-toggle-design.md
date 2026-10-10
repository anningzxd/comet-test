---
comet_change: add-pause-toggle
role: technical-design
canonical_spec: openspec
archived-with: 2026-10-10-add-pause-toggle
status: final
---

# 贪吃蛇暂停功能技术设计

- Change: `add-pause-toggle`
- 日期：2026-10-10
- 需求来源（唯一事实源）：`docs/openspec/changes/add-pause-toggle/proposal.md`、`docs/openspec/changes/add-pause-toggle/specs/snake-game/spec.md`
- 既有主 spec（本次要回归的基线）：`docs/openspec/specs/snake-game/spec.md`
- Open 阶段决策记录：`docs/openspec/changes/add-pause-toggle/design.md`
- 上一 change 的设计（本文多处引用其结论）：`docs/superpowers/specs/2026-10-10-snake-game-design.md`

本文件是本次 change 的正式技术设计。行为需求只在 delta spec 中维护，本文不复制需求文本，只记录实现决策、取舍与验证方式。

## 1. 目标与边界

**设计目标**

- 用最小改动把状态机由两态扩为三态，**不新增第二处"是否推进"的判断**
- 使「恢复后不补偿连走」成为结构上的必然，而不是靠额外逻辑补救
- 保证既有 17 个 Scenario 全部保持有效

**设计边界（在 proposal 范围之外额外排除的实现选项）**

- 不引入自动暂停（切后台 / 窗口失焦）
- 不做暂停计时、暂停菜单、多级暂停
- 不重构既有的 `loop()` / `step()` / 输入结构
- 不新增 DOM 元素（暂停提示沿用画布覆盖层）

## 2. 现状与代码定位

实现为仓库根三个静态文件，`game.js` 是单一 IIFE（`game.js:8`–`game.js:347`），无构建、无依赖。

| 位置 | 现状（本次改造前） | 本次是否需要改动 |
| --- | --- | --- |
| `game.js:15-22` | 常量区（`COLS`/`ROWS`/`CELL`/`TICK_MS`/`MAX_CATCHUP_STEPS`/`INIT_LEN`/`INIT_DIR`/`RESTART_KEY`） | 需新增暂停键常量 |
| `game.js:49-50` | 状态常量 `STATUS_RUNNING` / `STATUS_OVER` | 需新增 `STATUS_PAUSED` |
| `game.js:119` `resetGame()` | 重置蛇/方向/待处理方向/得分/状态/累加器/时间戳，生成食物 | 无需改动（已把状态置为运行态） |
| `game.js:157` `step()` | 首行 `if (game.status !== STATUS_RUNNING) return;` | **无需改动** |
| `game.js:212` `drawOverlay()` | 结束覆盖层 | 参照它新增暂停覆盖层 |
| `game.js:229` `draw()` | 仅结束态绘制覆盖层 | 需增加暂停态分支 |
| `game.js:257` `onKeyDown()` | 空格分支 → 方向映射查询 → 状态守卫 → 待处理方向校验 | 需增加重复过滤与 P 分支 |
| `game.js:293` `loop()` | 运行分支内累积时间；非运行分支把 `accumulator` 清零 | **无需改动** |
| `index.html:20` | 提示行 | 需并入 P 键说明 |

## 3. 关键决策

### 3.1 状态机扩为三态 `RUNNING | PAUSED | OVER`

暂停是"不推进、但仍在局中"的独立状态。

- **备选**：在运行态之上叠加 `paused` 布尔量。状态组合增多，每处判定需同时读两个字段，且会出现"已暂停且已结束"这类非法组合；否决。
- **代价**：需要逐处核对只比较 `RUNNING` 的分支，确认暂停态落入预期的另一侧。本文第 2 节已逐处列出结论。

### 3.2 复用既有守卫实现"暂停不推进"，不新增推进判断

这是本次设计的核心，也是改动量极小的原因：

- `step()` 首行已是「非运行态即返回」，暂停态天然被挡住 —— 不需要新增判断。
- `loop()` 的时间累加写在 `status === RUNNING` 分支内；非运行分支执行 `accumulator = 0`。暂停态落入该分支后，**暂停期间的时间不会被累积**，因此恢复瞬间的 `delta` 只是普通一帧（约 16ms），不会出现"一次补多格"。

- **理由**：避免出现第二处"是否推进"的事实源，从而避免两处规则不一致（这类缺陷在上一 change 的方向校验上出现过，见其设计文档 §3.3）。
- **代价**：该性质是**结构推断**而非显式代码，必须实测确认，不能只靠阅读。已固化为独立验收场景「恢复后不出现补偿式连走」。
- **次要影响**：暂停会把已经累积的不足一拍的时间清零，恢复后需要重新累积满一拍才前进。玩家不可感知（<150ms），且行为确定。

### 3.3 P 键作为 `onKeyDown()` 中的独立分支，且必须早于方向映射查询

`onKeyDown()` 的结构是：空格分支 → `if (!hasOwnProperty(KEY_DIRECTIONS, event.key)) return;` → 方向键处理。

`KEY_DIRECTIONS` 不含 `p`/`P`，而 P 分支若写在 `hasOwnProperty` 之后，会被那句提前返回挡掉、**永不生效**。因此 P 分支必须与空格分支并列，置于该提前返回之前。

P 分支只在运行与暂停两态之间切换：结束态显式不处理（对应场景「结束后不能暂停」）。

- **P 键不需要 `preventDefault()`**：浏览器对单独按 P 无默认行为可抑制（方向键与空格不同，它们会滚动页面）。
- **备选**：把 P 加进 `KEY_DIRECTIONS` 的相邻映射表 —— 否决，会让方向映射的含义被污染，且需要额外的分支区分"方向键"与"命令键"。

### 3.4 在 `onKeyDown()` 入口统一过滤 `event.repeat`

对 P 与空格这两个"单次命令键"过滤操作系统按键自动重复。

- **理由**：P 是**切换**语义。绑定自动重复后，长按 P（约 300–500ms 即触发重复）会连续切换暂停/恢复，表现为闪烁，且松手后可能停在错误状态、玩家感受为"按 P 没反应"。这是本次新功能的实质缺陷，不是可选打磨。
- **同类问题**：上一 change 的独立审查已对空格键提出同一问题，当时记录为已接受偏差 D-3（按住空格会反复重开，但需长按约 1 秒才可感知）。用户已确认本次一并过滤，使同一函数内两条命令键分支行为一致。
- **本 change 顺带关闭 D-3**：该偏差的关闭会体现在本 change 的 delta spec 新增场景中。
- **代价**：空格键行为发生细微变化（长按不再反复重开）。这属于新增约束而非改写既有要求，因此用 ADDED Requirement 表达，不改写既有「游戏启动与重开」的文字。

### 3.5 暂停提示沿用画布覆盖层，与结束覆盖层互斥

`draw()` 的末尾改为二选一：结束态绘制结束覆盖层，暂停态绘制暂停覆盖层。

- **理由**：状态全部留在画布内，无需维护 DOM 与 Canvas 两套同步；视觉与既有结束提示一致。
- **代价**：文案排版仍需手工计算居中位置（复用 `drawOverlay()` 的做法）。

### 3.6 命令键只响应无修饰键的按下（Build 阶段补充）

`isSpace` 与 `isPause` 的判定都加上 `!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey`。

- **理由**：P 是本次新引入的全局命令键。若只看 `event.key`，运行中按 `Ctrl+P` 会同时弹出浏览器打印对话框**并把游戏切到暂停**，关掉对话框后游戏仍停在暂停态；`Cmd+P`（macOS）与 `Alt+P` 同理。这是本 change 新引入的行为面，必须修。
- **顺带修正既有空格分支**：原空格分支对任意空格按下都调用 `preventDefault()`，因而吞掉了 `Ctrl+空格`、`Shift+空格`（Windows 下常见的中文输入法全角/半角切换）与 `Alt+空格`（Windows 的窗口菜单）。加上修饰键排除后这些组合恢复由系统或输入法处理。该项属既有行为的小幅修正，一并记录。
- **Shift 也在排除之列**（第二轮审查补充）：`Shift+空格` 在游戏结束后曾会把游戏重开、在运行中会被 `preventDefault()` 吞掉。排除 `shiftKey` 不影响「同时接受 `p` 与 `P`」的意图——CapsLock 打开时 `event.key` 已是 `'P'` 而 `shiftKey` 为 `false`。
- **范围限定**：方向键 / WASD 的既有实现同样只比较 `event.key`（`Ctrl+S` 仍会转向），本次**不改变**它们——那是上一 change 的既有行为，改动它属于未被确认的范围扩大。
- **代价**：带修饰键的组合不再切换暂停 / 重开，这符合 spec「无修饰键的单次按下」的字面语义。

## 4. 状态迁移

```
                    P                          P
     RUNNING  -------------->  PAUSED  -------------->  RUNNING
        |                                                   ^
        | 撞墙 / 撞到自身                                    |
        v                                                   |
      OVER  -------------------- 空格 -----------------------+

  在 PAUSED：方向键 / WASD / 空格 一律被忽略（方向键仍 preventDefault，只是不改变状态）
  在 OVER  ：P 被忽略
  新一局（首次加载 / 空格重开）：一律进入 RUNNING，不处于 PAUSED
```

## 5. 常量

| 常量 | 取值 | 说明 |
| --- | --- | --- |
| `STATUS_PAUSED` | `'PAUSED'` | 新增；与既有 `RUNNING` / `OVER` 并列定义 |
| `PAUSE_KEY` | `'p'` | 新增；匹配时同时接受 `'p'` 与 `'P'` |

其余常量（`COLS`/`ROWS`/`CELL`/`TICK_MS`/`MAX_CATCHUP_STEPS`/`INIT_LEN`/`INIT_DIR`/`RESTART_KEY`）保持不变。

## 6. 边界与失败路径

| 场景 | 处理 |
| --- | --- |
| 暂停期间经过若干节拍 | `step()` 首行守卫直接返回；`accumulator` 在每帧被清零 |
| 暂停前已累积不足一拍的时间 | 暂停期间被清零；恢复后重新累积，不产生补偿步 |
| 暂停中按方向键 / WASD | 先 `preventDefault()`（不滚动页面），随后因状态非运行态而返回，不写入待处理方向 |
| 暂停中按空格 | 空格分支先 `preventDefault()`，随后因状态非结束态而不重开 |
| 结束后按 P | P 分支只在运行/暂停间切换，结束态不处理 |
| 按住 P / 空格 | 入口处的 `event.repeat` 过滤使其只生效一次 |
| 暂停后再按 P 恢复 | 状态切回运行态；`step()` 恢复推进，`loop()` 恢复累积 |

## 7. 测试策略

项目按既有设计非目标不引入测试框架，验证以**浏览器中可观察的行为**为准，分两层：

1. **任务级验证**：`tasks.md` 中每个任务自带验证方式，实现后立即执行并记录结论。
2. **集成验收**：对照 delta spec 的 3 条 Requirement / 13 个 Scenario 逐条走查；**并回归主 spec `snake-game` 既有 17 个 Scenario**，确认暂停改动未使任何一条失效。

**黑盒手法（沿用上一 change 已验证有效的做法）**：在仓库外用 stub 的 `document` / `canvas` / `requestAnimationFrame` 加载**真实的 `game.js`**，只经 `keydown` 事件与绘制调用两个真实接口观察，不触碰内部变量。该脚本的完整源码已作为附录留在上一 change 的验证报告 `docs/superpowers/reports/2026-10-10-add-snake-game-verify.md` 中，本次直接扩展暂停与按键重复相关断言即可。

**暂停相关的关键断言**：暂停后驱动多帧，蛇头坐标与得分显示均不变；恢复后连续驱动，逐格前进且不出现单帧多步。

**不采用**：仓库内的测试文件与 `?selftest=1` 之类隐藏自检入口——前者会改变交付物边界（仍是三个文件），后者超出 spec 范围且违反 YAGNI。

## 8. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 恢复瞬间补偿式连走（本次首要风险） | 暂停态落入 `loop()` 的清零分支；作为独立 Scenario 实测，不靠阅读推断 |
| 按住 P 反复切换暂停/恢复 | 入口统一过滤 `event.repeat` |
| P 分支位置放错导致永不生效 | P 分支必须早于 `hasOwnProperty(KEY_DIRECTIONS, …)` 的提前返回 |
| 结束态误响应 P | P 分支只在运行/暂停两态切换 |
| 暂停覆盖层与结束覆盖层同时绘制 | 两态互斥，绘制二选一 |
| 既有行为回归（方向校验、进食、碰撞、重开） | 暂停不触碰这些逻辑；集成验收做 17 个既有 Scenario 的全量回归 |

## 9. 回滚方案

不涉及数据迁移与文件增删。回滚方式：还原 `game.js` 与 `index.html` 的改动，回到本 change 的 `base-ref`（`432f413`）。

## 10. 本阶段回写的 Spec Patch

设计阶段审查 delta spec 时发现 1 处验收缺口：用户已确认「P 与空格都过滤按键自动重复」，但该行为在 spec 中无对应场景。已回写 `specs/snake-game/spec.md`：

- 新增 **ADDED** Requirement「命令键只响应无修饰键的单次按下」，含 3 个场景：「按住 P 不反复切换」「按住空格只重开一次」「带修饰键的组合键不触发命令」。
- 采用 ADDED 而非 MODIFIED，是因为它不改写既有「游戏启动与重开」的文字（结束后按空格仍可重开），只是新增一条约束。
- Build 阶段据两轮独立审查又做了一次小规模增量：把该 Requirement 由其初名「单次按键命令不响应自动重复」更名为现名并补第 3 个场景，把「修饰键」从只看 `event.key` 收紧为排除 Ctrl / Cmd / Alt / Shift。

回写后 delta spec 为 **3 条 Requirement / 13 个 Scenario**（原 2 条 / 10 个），`openspec validate --strict` 通过。

## 11. 实现定位清单

| 文件 | 改动 |
| --- | --- |
| `game.js` | 新增 `STATUS_PAUSED` 与 `PAUSE_KEY` 常量；`onKeyDown()` 入口加重复过滤、新增 P 分支；`draw()` 增加暂停分支并新增暂停覆盖层绘制函数 |
| `game.js` | `step()`、`loop()`、`resetGame()` —— **不改动** |
| `index.html` | 提示行并入 P 键说明 |
| `style.css` | 预期不改动 |

## 12. 待后调的呈现细节（不阻塞实现）

- 暂停覆盖层的具体文案与配色（拟沿用结束覆盖层的深色遮罩与居中排布，标题「已暂停」、副行「按 P 继续」）
- 提示行的最终措辞（需同时容纳方向键 / WASD、P、空格三项说明）

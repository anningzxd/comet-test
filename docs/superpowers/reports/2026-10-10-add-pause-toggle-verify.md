# 验证报告：add-pause-toggle

- change：`add-pause-toggle`
- 验证日期：2026-10-10
- 工作流：classic / full；isolation `current`；绑定分支 `main`
- 验证模式：`full`（规模评估：17 个任务 / 1 个 delta spec / 23 个变更文件）
- 基线提交：`432f413`；实现提交：`970c5fb`；修复提交：`c45eba5`
- 交付文件：`game.js`、`index.html`、`style.css`（`style.css` 未改动；交付面仍严格为三个文件）
- 验证过程：**2 次 Build（第 2 次由 `verify-fail` 触发）+ 3 轮独立审查**；`verify_failures = 1`

## 1. 摘要计分卡

| 维度 | 状态 |
| --- | --- |
| Completeness（完整性） | 18/18 任务完成；delta spec 的 3 条 Requirement 全部有实现支撑 |
| Correctness（正确性） | 3/3 Requirement 映射到实现；13/13 Scenario 有可执行证据 |
| Coherence（一致性） | 实现与正式设计 §3.1–§3.7、§5、§6 一致；主 spec 17 个 Scenario 全部无回归 |

**检查被跳过项**：无。7 项检查全部执行。

## 2. 完整验证检查项

| # | 检查项 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `tasks.md` 全部任务已完成 | PASS | Runtime `progress: 18/18`，`all_done`；`taskTrackingConfigured: true` 且无不可读追踪文件 |
| 2 | 实现符合 `<classic-change-dir>/design.md` 高层设计决策 | PASS | 5 项决策逐条对照（三态状态机、复用既有守卫、P 键独立分支、重复与修饰键过滤、覆盖层互斥） |
| 3 | 实现符合正式 Design Doc | PASS | §3.1–§3.7、§5 常量、§6 边界表逐条一致；§3.6 为 Build 阶段补充项，实现与之相符 |
| 4 | 能力规格场景全部通过 | PASS | 13/13 Scenario 有可执行证据，见 §3；另主 spec 17 个 Scenario 全量回归通过 |
| 5 | `proposal.md` 目标已满足 | PASS | P 键暂停/继续、暂停期间蛇静止且仅 P 生效、画布内暂停覆盖层，均已交付 |
| 6 | delta spec 与 design doc 无矛盾 | PASS | Build 阶段的 spec 增量（Requirement 更名 + 第 3 个场景 + 排除 Shift）在设计 §3.6 与 §10 有对应记录；三处计数与名称已统一为 13 / 「命令键只响应无修饰键的单次按下」 |
| 7 | 关联设计文档可定位 | PASS | `design_doc` 登记为 `docs/superpowers/specs/2026-10-10-add-pause-toggle-design.md`，文件存在且与本 change 相关 |

## 3. Requirement → 实现映射与 Scenario 覆盖

delta spec：3 条 Requirement / 13 个 Scenario（`### Requirement:` ×3、`#### Scenario:` ×13）。

| Requirement | 段落 | Scenario 数 | 实现位置 | 证据 |
| --- | --- | --- | --- | --- |
| 暂停与继续 | ADDED | 8 | `game.js` 的 `STATUS_PAUSED` 常量、`onKeyDown()` 的 P 分支与状态守卫、`loop()` 非运行分支、`drawPauseOverlay()` | 组 H 20 条断言 |
| 命令键只响应无修饰键的单次按下 | ADDED | 3 | `onKeyDown()` 入口的 `event.repeat` 过滤与 `unmodified`（排除 ctrl/meta/alt/shift） | 组 I 6 条 + 组 J 13 条 |
| 按节拍推进的移动 | MODIFIED | 2 | `step()` 首行守卫（未改动）与 `loop()` 的时间累积分支（未改动） | 组 B + H2a/H2b/H5a/H5c/H5d |

**主 spec `snake-game` 的 17 个 Scenario 全量回归**：由组 A–G（36 条断言）覆盖，全部通过；其中「撞到自身结束」由贪心 AI 把蛇养到 8 节后执行 2×2 回转构造，结束时蛇头位于网格内部，可排除「撞墙结束」。唯一未做行为构造的是「无空格可放置食物」（需铺满 400 格）——`spawnFood()`、`step()`、`resetGame()` 与基线 `432f413` **逐字节相同**（三轮审查者均独立做过函数体抽取比对），以源码恒等为据。

## 4. Runtime 检查证据

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| build（第 2 轮） | `node --check game.js`（cwd = 项目根） | exit 0；log `docs/openspec/changes/add-pause-toggle/.comet/checks/d8fd7b47-…log` |

**检查能力说明（限制，非跳过）**：本项目按既有设计非目标不引入构建系统与测试框架，仓库内不存在 `package.json` / `pom.xml` / `Cargo.toml`，Runtime 可自动识别的构建入口为空。上述记录是仓库内可确定性重跑的检查命令（语法检查）；**行为正确性由 §5 的三轮独立黑盒脚本承担**，脚本完整源码见附录 A。

**执行环境说明**：本次会话为无头环境，无法人工打开浏览器。所有行为验证均通过 stub 的 `document` / `canvas` / `requestAnimationFrame` 加载**真实的 `game.js`** 完成，只经 `keydown` 事件、canvas 绘制调用与 `#score` 文本三个真实接口观察，不触碰内部变量。

## 5. 独立验证与审查（三轮）

三轮均由独立审查者（子代理）完成，未采信实现者自评，且都做了**负向对照**以证明断言有判别力。

| 轮次 | 阶段 | 覆盖范围 | 结果 |
| --- | --- | --- | --- |
| 第 1 轮 | Build | 全量（当时最终 diff） | 通过；无 CRITICAL / IMPORTANT；1 条 MINOR（`Ctrl+P` 误触发暂停） |
| 第 2 轮 | Verify（初检） | 复核第 1 轮修复 + 最终 diff 集成确认 | 通过；无 CRITICAL / IMPORTANT；2 条 MINOR（漏排 Shift、文档计数滞后）+ 1 条 SUGGESTION |
| 第 3 轮 | Verify（`verify-fail` 后） | **定向**：仅复核 Shift 修复及其周边 | 通过；无 CRITICAL / IMPORTANT / MINOR |

**第 1 轮**：自建 105 条断言（104 通过，唯一失败即其预设的探针），并用大括号配对抽取函数体确认 `step()` / `loop()` / `resetGame()` / `endGame()` / `spawnFood()` 与基线逐字节相同，`style.css` 未被触碰。

**第 2 轮**：自建 87 条断言（连跑 5 次均 87/87）；负向对照——把第 1 轮修复还原后恰在 `Ctrl+P` / `Alt+P` / `Ctrl+空格` 等断言上失败，换用基线 `432f413` 则在暂停相关断言上失败；另原样复现实现者的 67/67，未证伪。其 `indep-harness.js` 在修复后为 80/87，失败项集中在其为**修复前**代码「记录现状」而写的 G11 组，反向印证修复生效，非新缺陷。

**第 3 轮**：自建 39 条断言全部通过；负向对照（删除 `!event.shiftKey`）恰在 6 条 Shift 断言上失败；独立复现实现者的 71/71。并确认 **CapsLock 推断成立**：Shift 按下时 `shiftKey === true`，而 CapsLock 只改变字符大小写、不置任何修饰键标志，此时 `event.key` 同为 `'P'` 而 `shiftKey` 恒为 `false`——以 `shiftKey` 判定恰好区分「用户按了 Shift」与「CapsLock 生效」，故「同时接受 `p` 与 `P`」的意图未被破坏。另确认 `unmodified` 仅被 `isSpace` / `isPause` 引用，方向键分支完全不引用它，受影响面可枚举且已逐条验证。

## 6. 偏差与本轮处理

**`verify-fail` 触发的第 2 轮 Build 所修复的项（未留作已接受偏差）**

按 Comet Verify Step 1b，这些项属「范围内可明确修复」，故自动回 Build 修复，未询问也未接受：

| 编号 | 级别 | 问题 | 处理 |
| --- | --- | --- | --- |
| MINOR-1 | MINOR | `isPause` 只看 `event.key`：运行中 `Ctrl+P` 会同时弹出打印对话框**并把游戏切到暂停**；空格分支还会用 `preventDefault()` 吞掉 `Ctrl+空格` | 已修：`unmodified` 排除 ctrl/meta/alt；补场景「带修饰键的组合键不触发命令」、设计 §3.6、任务 3.5 |
| MINOR-2 | MINOR | `unmodified` **漏了 Shift**：运行中 `Shift+空格`（微软拼音全角/半角切换）被 `preventDefault()` 吞掉；**已结束时 `Shift+空格` 会直接把游戏重开** | 已修：`unmodified` 补 `!event.shiftKey`；补断言 J7–J9b |
| MINOR-3 | MINOR | 文档滞后：delta spec 已为 13 个 Scenario，正式设计 §7/§10、`design.md`、实施计划仍写 12；该 ADDED Requirement 名称未同步 | 已修：三处统一为 13 与「命令键只响应无修饰键的单次按下」；追加任务 3.6 |

**记入为「有意保留」的项**

| 编号 | 级别 | 内容 | 依据与影响范围 |
| --- | --- | --- | --- |
| SUGGESTION-4 | SUGGESTION | `proposal.md` 的 Impact 把 `loop()` 列为待改，而设计与实现均确认**无需改动** | **不改写 proposal**——它是设计前的意图记录，改写等于篡改历史。此处与实施计划中均已注明「`loop()` 未改动」，不影响任何验收 |
| SUGGESTION-5 | SUGGESTION | `.comet/handoff/brainstorm-summary.md` 仍为「12 个 Scenario」与旧 Requirement 名（第 3 轮复核提出） | 该文件是 Design 阶段带日期、标注「已由用户在 Step 1c 正式确认」的**冻结交接快照**，性质等同设计 §10 中刻意保留的「由其初名…更名为现名」历史说明。同步它等于篡改阶段记录，故**有意保留**，并在实施计划中注明；同目录的 `design-context.md` 已是 13 |

**范围限定（两侧一致）**：方向键 / WASD 的既有实现同样只比较 `event.key`（`Ctrl+S` 仍转向、`Shift+↑` 仍 `preventDefault`），本次**不改变**它们——那是上一 change 的既有行为，改动它属于未被确认的范围扩大。该取舍已记入正式设计 §3.6，并经三轮审查确认代码确实未动该分支。

## 7. 最终结论

**验证通过。** 7 项检查全部执行且全部 PASS；无 CRITICAL、无 IMPORTANT；最终 diff 已由第 3 轮定向独立复核覆盖并通过。两项 SUGGESTION 均已在报告中说明保留依据与影响范围，不阻塞归档。

可进入 Archive 阶段。

---

## 附录 A：黑盒验证脚本完整源码

脚本刻意放在仓库外执行——`tasks.md` 要求交付物仍为三个文件，既有设计亦将「不引入测试框架」列为非目标。为使其可复现，完整源码随本报告留存。复现方式：把下面代码保存为 `harness-pause.js`，在仓库根执行

```
node harness-pause.js <仓库绝对路径>/game.js
```

期望输出末行 `通过 71 / 71`，退出码 0。组 A–G 为既有 17 个 Scenario 的回归，组 H 为暂停与继续，组 I 为按键自动重复，组 J 为带修饰键的组合键。

```js
/*
 * add-pause-toggle 黑盒验证脚本（位于仓库外，不属于交付物）。
 *
 * 用法：node harness-pause.js <game.js 绝对路径>
 * 在上一 change 的 harness 基础上扩展：新增暂停（组 H）与按键重复（组 I）断言，
 * 并保留组 A–G 作为既有 17 个 Scenario 的回归。
 *
 * 只经 keydown 事件与绘制调用两个真实接口驱动真实的 game.js，
 * 不触碰内部变量（game.js 不向 window 暴露任何东西）。
 */
'use strict';

const path = require('path');

const CELL_PX = 24;
const COLS = 20;
const ROWS = 20;
const TICK = 150;

const COLOR_HEAD = '#6ee7a8';
const COLOR_BODY = '#2f9e68';
const COLOR_FOOD = '#f4a259';

const results = [];

function check(name, ok, detail) {
  results.push({ name, ok: ok === true, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  -- ' + detail : ''));
}

/* ------------------------------ 环境 stub ------------------------------ */

const realRandom = Math.random;
let randomValue = 0;

function boot(gamePath) {
  const drawLog = [];
  let style = '';

  const ctx = {
    font: '',
    textAlign: '',
    textBaseline: '',
    set fillStyle(v) { style = v; },
    get fillStyle() { return style; },
    clearRect(x, y, w, h) { drawLog.push({ op: 'clear', x, y, w, h }); },
    fillRect(x, y, w, h) { drawLog.push({ op: 'rect', x, y, w, h, style }); },
    fillText(text, x, y) { drawLog.push({ op: 'text', text, x, y, style }); },
    setTransform() { /* noop */ }
  };

  const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx };
  const scoreEl = { textContent: '0' };

  let keyHandler = null;
  let rafCb = null;

  global.document = {
    getElementById: (id) => (id === 'board' ? canvas : id === 'score' ? scoreEl : null),
    addEventListener: (type, fn) => { if (type === 'keydown') keyHandler = fn; }
  };
  global.window = {
    devicePixelRatio: 2,
    requestAnimationFrame: (fn) => { rafCb = fn; return 1; }
  };

  Math.random = () => randomValue;
  delete require.cache[require.resolve(gamePath)];
  require(gamePath);
  Math.random = realRandom;

  const state = { now: 0 };

  return {
    drawLog, canvas, scoreEl, state,
    setRandom: (v) => { randomValue = v; },
    press(k, opts) {
      drawLog.length = 0;
      const ev = {
        key: k,
        repeat: !!(opts && opts.repeat),
        ctrlKey: !!(opts && opts.ctrl),
        metaKey: !!(opts && opts.meta),
        altKey: !!(opts && opts.alt),
        shiftKey: !!(opts && opts.shift),
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; }
      };
      keyHandler(ev);
      // 有些按键（如 P）只改状态、不重绘；补一次「零时间增量」的重绘，
      // 使按键后的状态可以立即从绘制日志中观察到，且不推进任何节拍。
      // 先清空日志，避免处理器自身重绘过（如重开会调用 draw）时同一状态被记两次。
      drawLog.length = 0;
      rafCb(state.now);
      return ev;
    },
    prime() {
      // 用当前时间戳对齐。不可回拨：时间倒退会让 delta 变成负数，
      // 打乱时间累加器，后续节拍全部失效。
      drawLog.length = 0;
      rafCb(state.now);
    },
    advance(n) { this.advanceBy(TICK, n); },
    advanceBy(ms, n) {
      for (let i = 0; i < n; i += 1) {
        state.now += ms;
        drawLog.length = 0;
        rafCb(state.now);
      }
    },
    advanceUntilOver(max) {
      for (let i = 0; i < max; i += 1) {
        if (isOver(this)) return i;
        this.advance(1);
      }
      return isOver(this) ? max : -1;
    },
    fresh() {
      const next = boot(gamePath);
      next.setRandom(randomValue);
      next.prime();
      return next;
    }
  };
}

/* --------------------------- 绘制结果解析 --------------------------- */

const toCell = (px) => Math.round(px / CELL_PX);

function rectCells(h, styles) {
  const out = [];
  for (const e of h.drawLog) {
    if (e.op === 'rect' && styles.includes(e.style)) out.push({ x: toCell(e.x), y: toCell(e.y) });
  }
  return out;
}

const headCells = (h) => rectCells(h, [COLOR_HEAD]);
const snakeCells = (h) => rectCells(h, [COLOR_HEAD, COLOR_BODY]);
const foodCells = (h) => rectCells(h, [COLOR_FOOD]);
const headCell = (h) => headCells(h)[0] || null;
const snakeSet = (h) => new Set(snakeCells(h).map((c) => c.x + ',' + c.y));
const hasText = (h, t) => h.drawLog.some((e) => e.op === 'text' && e.text === t);
const isOver = (h) => hasText(h, '游戏结束');
const isPaused = (h) => hasText(h, '已暂停');
const key = (c) => (c ? c.x + ',' + c.y : 'null');

// 按下一个只改状态、不重绘的键之后，需要驱动一帧才能观察到结果。
// 1ms 的帧只触发重绘，不会凑满一个节拍，因此不推进游戏。
const peek = (h) => h.advanceBy(1, 1);

/* ------------------------------ 常量表 ------------------------------ */

const DIRS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};
const RIGHT_OF = { ArrowUp: 'ArrowRight', ArrowRight: 'ArrowDown', ArrowDown: 'ArrowLeft', ArrowLeft: 'ArrowUp' };

function hitsWall(head, dir) {
  return (head.x === 0 && dir.x === -1) || (head.x === COLS - 1 && dir.x === 1) ||
    (head.y === 0 && dir.y === -1) || (head.y === ROWS - 1 && dir.y === 1);
}

/* ------------------------------ 主流程 ------------------------------ */

function main() {
  const gamePath = path.resolve(process.argv[2]);
  console.log('被测文件: ' + gamePath + '\n');

  /* =========== 组 A–G：既有 17 个 Scenario 的回归 =========== */
  console.log('[组 A] 初始状态（既有回归）');
  randomValue = 0;
  const h = boot(gamePath);
  check('A1 初始蛇为 3 格', snakeCells(h).length === 3, '实际 ' + snakeCells(h).length);
  check('A2 初始只有一个食物', foodCells(h).length === 1, '实际 ' + foodCells(h).length);
  check('A3 初始得分为 0', h.scoreEl.textContent === '0', '实际 ' + h.scoreEl.textContent);
  check('A4 食物不与蛇身重叠', !snakeSet(h).has(key(foodCells(h)[0])), '食物 ' + key(foodCells(h)[0]));
  check('A5 蛇头位于 (10,10)', key(headCell(h)) === '10,10', '实际 ' + key(headCell(h)));
  check('A6 未向 window 暴露内部状态', global.window.SNAKE_DEBUG === undefined);

  console.log('\n[组 B] 初始方向与节拍推进（既有回归）');
  h.prime();
  h.advance(1);
  check('B1 初始方向为向右', key(headCell(h)) === '11,10', '实际 ' + key(headCell(h)));
  check('B2 未进食时长度不变', snakeCells(h).length === 3, '实际 ' + snakeCells(h).length);
  h.advance(3);
  check('B3 连续节拍持续前进', key(headCell(h)) === '14,10', '实际 ' + key(headCell(h)));

  console.log('\n[组 C] 撞墙结束与结束后的行为（既有回归）');
  h.advanceUntilOver(40);
  check('C1 撞墙后判定结束', isOver(h));
  const overHead = headCell(h);
  check('C2 结束位置在右侧边界', overHead.x === COLS - 1 && overHead.y === 10, '实际 ' + key(overHead));
  h.advance(3);
  check('C3 结束后蛇不再推进', key(headCell(h)) === key(overHead), '实际 ' + key(headCell(h)));
  h.press('ArrowUp');
  h.advance(1);
  check('C4 结束后方向键不生效', key(headCell(h)) === key(overHead), '实际 ' + key(headCell(h)));

  console.log('\n[组 D] 空格键重开（既有回归）');
  const evSpace = h.press(' ');
  check('D1 空格键被 preventDefault', evSpace.defaultPrevented === true);
  check('D2 重开后蛇恢复 3 格', snakeCells(h).length === 3, '实际 ' + snakeCells(h).length);
  check('D3 重开后蛇头回到 (10,10)', key(headCell(h)) === '10,10', '实际 ' + key(headCell(h)));
  check('D4 重开后得分归零', h.scoreEl.textContent === '0', '实际 ' + h.scoreEl.textContent);
  check('D5 重开后不再显示结束提示', !isOver(h));
  h.prime();
  h.advance(1);
  check('D6 重开后恢复向右移动', key(headCell(h)) === '11,10', '实际 ' + key(headCell(h)));

  console.log('\n[组 E] 转向输入校验（既有回归）');
  h.press('ArrowLeft');
  h.advance(1);
  check('E1 向右时按 ← 仍向右', key(headCell(h)) === '12,10', '实际 ' + key(headCell(h)));
  h.press('ArrowUp');
  h.press('ArrowLeft');
  h.advance(1);
  check('E2 同拍先 ↑ 再 ← 后向上移动', key(headCell(h)) === '12,9', '实际 ' + key(headCell(h)));
  h.press('ArrowRight');
  h.advance(1);
  check('E3 方向键改变方向', key(headCell(h)) === '13,9', '实际 ' + key(headCell(h)));
  h.press('w'); h.advance(1);
  check('E4a W 向上生效', key(headCell(h)) === '13,8', '实际 ' + key(headCell(h)));
  h.press('a'); h.advance(1);
  check('E4b A 向左生效', key(headCell(h)) === '12,8', '实际 ' + key(headCell(h)));
  h.press('s'); h.advance(1);
  check('E4c S 向下生效', key(headCell(h)) === '12,9', '实际 ' + key(headCell(h)));
  h.press('d'); h.advance(1);
  check('E4d D 向右生效', key(headCell(h)) === '13,9', '实际 ' + key(headCell(h)));
  const evDir = h.press('ArrowDown');
  check('E5 方向键被 preventDefault', evDir.defaultPrevented === true);

  console.log('\n[组 F] 进食、增长与计分（既有回归）');
  randomValue = 0;
  const f = boot(gamePath).fresh();
  const lenBefore = snakeCells(f).length;
  const scoreBefore = Number(f.scoreEl.textContent);
  f.press('ArrowUp');
  f.advance(10);
  check('F1 向上行走 10 拍后头部位于顶行', key(headCell(f)) === '10,0', '实际 ' + key(headCell(f)));
  let ate = false;
  for (let i = 0; i < 30 && !ate; i += 1) {
    if (i === 0) f.press('ArrowLeft');
    f.advance(1);
    if (Number(f.scoreEl.textContent) > scoreBefore) ate = true;
  }
  check('F2 吃到食物后得分 +1', Number(f.scoreEl.textContent) === scoreBefore + 1, '实际 ' + f.scoreEl.textContent);
  check('F3 吃到食物后蛇身长度 +1', snakeCells(f).length === lenBefore + 1, '实际 ' + snakeCells(f).length);
  check('F4 进食后新食物不与蛇身重叠',
    !!foodCells(f)[0] && !snakeSet(f).has(key(foodCells(f)[0])), '食物 ' + key(foodCells(f)[0]));

  console.log('\n[组 G] 撞到自身结束（既有回归）');
  const g = boot(gamePath).fresh();
  const selfHit = runSelfCollision(g);
  check('G1 撞到自身判定结束', selfHit.ok === true, selfHit.detail);

  /* =========== 组 H：暂停与继续（本次新增） =========== */
  console.log('\n[组 H] 暂停与继续');
  randomValue = 0;
  const p = boot(gamePath).fresh();

  // H1 P 键暂停
  p.advance(2);
  const beforePause = headCell(p);
  p.press('p');
  check('H1a 运行中按 P 进入暂停（出现暂停提示）', isPaused(p), '提示文本: ' + JSON.stringify(p.drawLog.filter(e => e.op === 'text').map(e => e.text)));
  check('H1b 暂停提示包含恢复方式', hasText(p, '按 P 继续'));

  // H2 暂停期间不推进、得分不变
  const pausedHead = headCell(p);
  const pausedScore = p.scoreEl.textContent;
  p.advance(20); // 20 个节拍
  check('H2a 暂停期间蛇头位置不变', key(headCell(p)) === key(pausedHead), '暂停时 ' + key(pausedHead) + ' → 20 拍后 ' + key(headCell(p)));
  check('H2b 暂停期间得分不变', p.scoreEl.textContent === pausedScore, '实际 ' + p.scoreEl.textContent);
  check('H2c 暂停期间持续显示暂停提示', isPaused(p));

  // H3 暂停期间方向键不被采纳
  p.press('ArrowUp');
  p.press('w');
  p.advance(1);
  check('H3 暂停中方向键不改变位置与方向', key(headCell(p)) === key(pausedHead), '实际 ' + key(headCell(p)));

  // H4 暂停期间空格不重开
  const lenAtPause = snakeCells(p).length;
  const evPauseSpace = p.press(' ');
  check('H4a 暂停中空格被 preventDefault（不滚动页面）', evPauseSpace.defaultPrevented === true);
  check('H4b 暂停中空格不重开新局', snakeCells(p).length === lenAtPause && !isOver(p) && isPaused(p),
    '长度 ' + snakeCells(p).length + '（暂停前 ' + lenAtPause + '）');

  // H5 恢复：先长时间暂停，再恢复，断言不出现补偿式连走
  p.advanceBy(1000, 5); // 暂停 5 秒
  check('H5a 长暂停后仍处于暂停且未推进', isPaused(p) && key(headCell(p)) === key(pausedHead),
    '实际 ' + key(headCell(p)));
  p.press('p');
  check('H5b 再按 P 恢复，暂停提示消失', !isPaused(p));
  p.advance(1); // 恢复后的第一帧（delta = 150ms = 恰好一拍）
  const afterResume = headCell(p);
  check('H5c 恢复后第一拍只前进 1 格（无补偿式连走）',
    Math.abs(afterResume.x - pausedHead.x) + Math.abs(afterResume.y - pausedHead.y) === 1,
    '从 ' + key(pausedHead) + ' 到 ' + key(afterResume));
  p.advance(1);
  const afterSecond = headCell(p);
  check('H5d 恢复后第二拍同样只前进 1 格',
    Math.abs(afterSecond.x - afterResume.x) + Math.abs(afterSecond.y - afterResume.y) === 1,
    '从 ' + key(afterResume) + ' 到 ' + key(afterSecond));

  // H6 暂停可反复切换
  p.press('p');
  check('H6a 再次按 P 进入暂停', isPaused(p));
  p.press('p');
  check('H6b 再按 P 恢复运行', !isPaused(p) && !isOver(p));

  // H7 结束后按 P 无效
  p.advanceUntilOver(60);
  check('H7a 先让本局结束', isOver(p));
  const endHead = headCell(p);
  p.press('p');
  check('H7b 结束后按 P 不进入暂停', !isPaused(p) && isOver(p));
  check('H7c 结束后按 P 不改变画面位置', key(headCell(p)) === key(endHead), '实际 ' + key(headCell(p)));

  // H8 重开后不处于暂停
  p.press(' ');
  check('H8a 结束后空格重开', !isOver(p) && !isPaused(p));
  check('H8b 新一局不处于暂停且长度为 3', !isPaused(p) && snakeCells(p).length === 3, '长度 ' + snakeCells(p).length);
  p.prime();
  p.advance(1);
  check('H8c 新一局立即按节拍移动', key(headCell(p)) === '11,10', '实际 ' + key(headCell(p)));

  /* =========== 组 I：按键自动重复（本次新增） =========== */
  console.log('\n[组 I] 按键自动重复');
  randomValue = 0;
  const r = boot(gamePath).fresh();
  r.advance(2);

  // I1 按住 P：首次按下切换，后续 repeat 事件被忽略
  r.press('p');
  const pausedByHold = isPaused(r);
  r.press('p', { repeat: true });
  r.press('p', { repeat: true });
  r.press('p', { repeat: true });
  check('I1a 按住 P 只有首次按下生效（仍处于暂停）', pausedByHold && isPaused(r),
    '首次按下后暂停=' + pausedByHold + '，3 次 repeat 后暂停=' + isPaused(r));

  // 反向验证：若 repeat 未被过滤，上面 3 次会把状态切回运行
  check('I1b 按住 P 未把状态切回运行', !isOver(r) && isPaused(r));

  // I2 按住空格：只在结束后生效一次，不反复重开
  r.press('p'); // 恢复运行
  r.advanceUntilOver(60);
  check('I2a 先让本局结束', isOver(r));
  const overScore = r.scoreEl.textContent;
  r.press(' ');
  const afterFirstSpace = snakeCells(r).length;
  r.press(' ', { repeat: true });
  r.press(' ', { repeat: true });
  check('I2b 按住空格只重开一次（长度仍为初始 3 格）', afterFirstSpace === 3 && snakeCells(r).length === 3,
    '首次空格后 ' + afterFirstSpace + ' 格，2 次 repeat 后 ' + snakeCells(r).length + ' 格');
  check('I2c 按住空格未反复重开（未回到结束态）', !isOver(r));
  check('I2d 重开后得分归零', r.scoreEl.textContent === '0', '结束前得分 ' + overScore);

  /* =========== 组 J：带修饰键的组合键（独立审查发现后补充） =========== */
  console.log('\n[组 J] 带修饰键的组合键');
  randomValue = 0;
  const m = boot(gamePath).fresh();
  m.advance(2);

  m.press('p', { ctrl: true });
  check('J1 Ctrl+P 不进入暂停', !isPaused(m) && !isOver(m));
  m.press('p', { meta: true });
  check('J2 Cmd+P 不进入暂停', !isPaused(m) && !isOver(m));
  m.press('p', { alt: true });
  check('J3 Alt+P 不进入暂停', !isPaused(m) && !isOver(m));

  // 对照组：无修饰键的 P 仍应正常切换
  m.press('p');
  check('J4 无修饰键的 P 仍正常进入暂停（对照）', isPaused(m));
  m.press('p');
  check('J4b 无修饰键的 P 仍正常恢复（对照）', !isPaused(m));

  // Ctrl+空格：既不重开，也不被 preventDefault 吞掉
  m.advanceUntilOver(60);
  check('J5a 先让本局结束', isOver(m));
  const evCtrlSpace = m.press(' ', { ctrl: true });
  check('J5b Ctrl+空格不被 preventDefault（交还输入法/系统）', evCtrlSpace.defaultPrevented === false);
  check('J5c Ctrl+空格不重开（仍处于结束态）', isOver(m));

  // 对照组：无修饰键的空格仍能重开
  m.press(' ');
  check('J6 无修饰键的空格仍能重开（对照）', !isOver(m) && snakeCells(m).length === 3,
    '长度 ' + snakeCells(m).length);

  // Shift 组合：V2 审查发现的 MINOR-2（Shift 未纳入排除集合）
  m.press('p', { shift: true });
  check('J7 Shift+P 不进入暂停', !isPaused(m) && !isOver(m));
  const evShiftSpace = m.press(' ', { shift: true });
  check('J8 Shift+空格不被 preventDefault（交还输入法全角/半角切换）',
    evShiftSpace.defaultPrevented === false);
  m.advanceUntilOver(60);
  check('J9a 先让本局结束', isOver(m));
  m.press(' ', { shift: true });
  check('J9b 结束态 Shift+空格不重开', isOver(m));

  /* ---- 汇总 ---- */
  const failed = results.filter((x) => !x.ok);
  console.log('\n================ 汇总 ================');
  console.log('通过 ' + (results.length - failed.length) + ' / ' + results.length);
  if (failed.length) {
    console.log('失败项：');
    failed.forEach((x) => console.log('  - ' + x.name + '  ' + x.detail));
  }
  process.exit(failed.length ? 1 : 0);
}

/*
 * 用安全贪心 AI 追食物把蛇养长，再在安全位置执行 4 次连续右转
 * （轨迹为一个 2x2 方框，第 4 拍蛇头回到 4 拍前自己占据的格子）产生自撞。
 */
function runSelfCollision(h) {
  let dir = 'ArrowRight';

  for (let turn = 0; turn < 500; turn += 1) {
    const head = headCell(h);
    const snake = snakeSet(h);
    const food = foodCells(h)[0];
    if (!head || !food) return { ok: false, detail: '第 ' + turn + ' 拍读不到头部或食物' };

    const length = snakeCells(h).length;

    if (length >= 8 && head.x >= 1 && head.x <= COLS - 2 && head.y >= 1 && head.y <= ROWS - 2) {
      const start = { x: head.x, y: head.y };
      let d = dir;
      for (let k = 0; k < 4; k += 1) {
        const press = RIGHT_OF[d];
        h.press(press);
        h.advance(1);
        if (isOver(h)) {
          const last = headCell(h);
          if (hitsWall(last, d)) {
            return { ok: false, detail: '2x2 回转第 ' + (k + 1) + ' 拍撞墙结束，而非自撞' };
          }
          return { ok: true, detail: '回转第 ' + (k + 1) + ' 拍自撞结束；起始头 ' + start.x + ',' + start.y + '，长度 ' + length };
        }
        d = press;
      }
      return { ok: false, detail: '完成 2x2 回转但未结束（长度 ' + length + '），自撞判定可能有问题' };
    }

    const target = length >= 8 ? { x: 10, y: 10 } : food;
    const cands = [];
    for (const name of Object.keys(DIRS)) {
      const d = DIRS[name];
      if (d.x === -DIRS[dir].x && d.y === -DIRS[dir].y) continue;
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      if (snake.has(nx + ',' + ny)) continue;
      cands.push({ name, cost: Math.abs(nx - target.x) + Math.abs(ny - target.y) });
    }
    if (!cands.length) {
      return { ok: false, detail: 'AI 第 ' + turn + ' 拍无安全走法（长度 ' + length + '），测试不确定' };
    }
    cands.sort((a, b) => a.cost - b.cost);
    dir = cands[0].name;

    h.press(dir);
    h.advance(1);
    if (isOver(h)) {
      const last = headCell(h);
      return {
        ok: false,
        detail: 'AI 第 ' + turn + ' 拍' + (hitsWall(last, dir) ? '撞墙' : '意外自撞') + '结束，未完成回转测试'
      };
    }
  }
  return { ok: false, detail: '500 拍内未能养到足够长度并执行回转' };
}

main();
```


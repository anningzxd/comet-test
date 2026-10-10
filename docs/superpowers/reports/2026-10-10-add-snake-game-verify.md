# 验证报告：add-snake-game

- change：`add-snake-game`
- 验证日期：2026-10-10
- 工作流：classic / full；isolation `current`；绑定分支 `master`
- 验证模式：`full`（规模评估：22 个任务 / 1 个 delta spec / 23 个变更文件 → 建议 full，已记录 `verify_mode: full`）
- 基线提交：`c55353c`；实现提交：`e537a1b`
- 交付文件：`index.html`（25 行）、`style.css`（84 行）、`game.js`（347 行），相对基线全部为新增

## 1. 摘要计分卡

| 维度 | 状态 |
| --- | --- |
| Completeness（完整性） | 22/22 任务完成；7 条 ADDED Requirement 全部有实现支撑 |
| Correctness（正确性） | 7/7 Requirement 映射到实现；17/17 Scenario 有可执行证据 |
| Coherence（一致性） | 设计 §3.1–§3.7、§5 常量表、§6 边界表与实现逐条一致；§4 数据流有 1 处文档残留（见 §7 偏差 D-2） |

**检查被跳过项**：无。7 项检查全部执行。

## 2. 完整验证检查项

| # | 检查项 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `tasks.md` 全部任务已完成 | PASS | Runtime `progress: {total:22, complete:22, remaining:0}`；apply `state: all_done`；`taskTrackingConfigured: true` 且无不可读追踪文件 |
| 2 | 实现符合 `<classic-change-dir>/design.md` 高层设计决策 | PASS | 6 项决策逐条对照，见 §3 |
| 3 | 实现符合正式 Design Doc | PASS | `docs/superpowers/specs/2026-10-10-snake-game-design.md` §3.1–§3.7、§5、§6 逐条一致；唯一不一致为 §4 残留文字，已记为偏差 D-2 |
| 4 | 能力规格场景全部通过 | PASS | 17/17 Scenario 有可执行证据，见 §4 |
| 5 | `proposal.md` 目标已满足 | PASS | 三个静态文件、零依赖、双击即玩、基础玩法（移动/进食增长/计分/撞墙撞身结束/重开）均已交付 |
| 6 | delta spec 与 design doc 无矛盾 | PASS | Build 阶段未做 Spec Patch（delta spec 自 Design 阶段回写后未再变更）；设计文档与代码的唯一不一致为 §4 残留文字，已记为偏差 D-2 |
| 7 | 关联设计文档可定位 | PASS | `design_doc` 已登记为 `docs/superpowers/specs/2026-10-10-snake-game-design.md`，文件存在且与本 change 相关 |

## 3. Requirement → 实现映射

| Requirement | 实现位置 |
| --- | --- |
| 游戏启动与重开 | `game.js:119` `resetGame()`、`game.js:339` `init()`、`game.js:257` `onKeyDown` 空格分支 |
| 键盘方向控制 | `game.js:35` `KEY_DIRECTIONS`、`game.js:257` `onKeyDown`（含 `preventDefault`） |
| 转向输入校验 | `game.js:257-291`（槽已非空即忽略 + 反向拒绝）、`game.js:157` `step()` 应用与清空 |
| 按节拍推进的移动 | `game.js:293` `loop()`（rAF + 时间累加器 + 单帧补步上限）、`game.js:157` `step()` |
| 食物生成与蛇身增长 | `game.js:86` `freeCells()`、`game.js:104` `spawnFood()`、`game.js:157` 进食分支 |
| 得分显示 | `game.js:143` `renderScore()`、`index.html:15` `#score` |
| 碰撞判定与游戏结束 | `game.js:157` 越界/自撞判定、`game.js:153` `endGame()`、`game.js:212` `drawOverlay()` |

## 4. Scenario 覆盖（17/17）

| Requirement | Scenario 数 | 证据 |
| --- | --- | --- |
| 游戏启动与重开 | 3 | 黑盒 A1/A2/A3/A5/A6（初始 3 格、1 食物、得分 0）、B1/D6（初始向右）、D1–D5/F7–F9（空格重开全量重置） |
| 键盘方向控制 | 3 | 黑盒 E3（方向键）、E4a–d/E5a–b（WASD 大小写全键位）、E6（方向键 `preventDefault`） |
| 转向输入校验 | 2 | 黑盒 E1（拒绝 180° 反向）、E2（同拍先 ↑ 再 ← 后向上，非向右） |
| 按节拍推进的移动 | 1 | 黑盒 B1/B2/B3/B4（匀速前进、长度不变、无残影） |
| 食物生成与蛇身增长 | 3 | 黑盒 A4/B5/F5/F6（食物始终不与蛇身重叠）、F3/F4（进食 +1 格并立即重生成）、**无空格可放置食物**：集成审查者把 `game.js` 复制到仓库外、仅替换 `COLS=4/ROWS=4`，用 4×4 哈密顿环走到铺满 —— 第 45 拍判定结束、蛇身 16 格、得分 13、绘制日志中食物数为 0、结束后继续按键不抛异常 |
| 得分显示 | 2 | 黑盒 F2（进食 +1）、D4/F8（重开归零） |
| 碰撞判定与游戏结束 | 3 | 黑盒 C1/C2（撞墙结束于边界 x=19）、G1（8 节蛇执行 2×2 回转触发自撞）、C3/C4/C6（结束后不再推进、方向键两次均无效） |

## 5. Runtime 检查证据

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| build | `node --check game.js`（cwd = 项目根） | exit 0；log `docs/openspec/changes/add-snake-game/.comet/checks/196419d2-b1c8-45bf-bb32-d98cf1898b48.log` |
| verify | `comet check run add-snake-game verify --local -- node --check game.js` | exit 0；`reused=true`（与 build 的 argv/cwd/输入完全一致，Runtime 判定可复用）；tier=full |

**检查能力说明（限制，非跳过）**：本项目按已确认的设计非目标不引入构建系统与测试框架，仓库内不存在 `package.json` / `pom.xml` / `Cargo.toml`，因此 Runtime 可自动识别的构建入口为空。上述记录是仓库内可确定性重跑的检查命令（语法检查）；**行为正确性由 §6 的两轮独立黑盒脚本承担**，脚本位于仓库外，完整源码见附录 A。

**执行环境说明**：本次会话为无头环境，无法人工打开浏览器做手动走查。所有行为验证均通过 stub 的 DOM/Canvas/`requestAnimationFrame` 接口加载**真实的 `game.js`** 完成，只经由 `keydown` 事件与绘制调用两个真实接口观察，不触碰内部变量（`game.js` 不向 `window` 暴露任何属性）。

## 6. 独立验证与审查

### 6.1 实现者黑盒验证（Build 阶段）

45/45 断言通过。覆盖 §4 表中的 16 个 Scenario；第 17 个「无空格可放置食物」当时以读码确认，后续由集成审查升级为可执行验证（见 §4）。

### 6.2 独立集成审查（Verify 阶段，`review_mode: standard`）

由独立审查者（子代理）执行，未采信实现者自评。

- **独立性**：审查者自行编写审计脚本（仓库外，只经 keydown 与绘制调用驱动真实 `game.js`），50/50 PASS；并原样重跑实现者的黑盒脚本，复现 45/45 PASS。
- **结论**：**通过**，无 CRITICAL、无 IMPORTANT。
- **高风险点核对**：越界判定、自撞判定（含蛇尾腾空规则）、进食增长与计分（6000 拍 / 113 局不变量扫描中「长度 ≡ 得分 + 3」零失配）、食物生成、结束与重开、单帧补步上限、`devicePixelRatio` 变换顺序、`file://` 可运行性（无 `import`/`export`/`fetch`/`XHR`/`require`）、键盘与焦点、DOM 依赖最小化 —— 逐条确认无误。
- **未覆盖项说明**：前一轮任务级审查者自述的「20 项检查 + 60 局 25,560 步随机扫描」脚本未留在临时目录，无法原样重跑；集成审查者用等价的独立不变量扫描（6000 拍 / 113 局，含重复格、越界、食物重叠、长度≡得分+3）替代，全部通过。

### 6.3 前一轮任务级审查（Build 阶段，已闭环）

结论为无 CRITICAL / 无 IMPORTANT，3 项 MINOR + 4 项 SUGGESTION，**已全部修复并复核**：`box-sizing: content-box`、`html{height:100%}` + `body{min-height:100%}`、文档计数 7/17、删除 `step()` 内重复校验、`lastTimestamp` 改 `null` 哨兵、删除死 `id="status"` 并修正提示文案。集成审查逐条核对确认「6 项修复全部正确落地、未引入回归」。

## 7. 已接受偏差

用户于 2026-10-10 在明确知悉各项影响后选择「**接受为偏差，直接归档**」，不在归档前重回 Build。以下为记录、原因与影响范围。

| 编号 | 级别 | 偏差内容 | 原因与影响范围 | 建议修法 |
| --- | --- | --- | --- | --- |
| D-1 | MINOR | `style.css:18-25` 使用 `body{justify-content:center}`，视口宽 < 596px 时面板左侧溢出且无法滚动到达 | 移动端与响应式适配是 proposal 已确认的非目标；用户选择不为呈现层问题重开 Build。**影响**：约 500px 宽的半屏桌面窗口下，「得分」标签及部分分数被裁切。已知与任务 1.2 的验收陈述「缩放窗口不出现元素错位」在此宽度下不完全一致，特此明确记录 | `justify-content: center;` 之后追加 `justify-content: safe center;` |
| D-2 | MINOR | `docs/superpowers/specs/2026-10-10-snake-game-design.md:184` §4 数据流第 1 步仍写「应用 pendingDir（与当前 dir 比较，反向忽略）」，与已修正的 §3.3 及 `game.js:157-167` 矛盾 | 纯文档残留，**无运行时影响**。影响范围：后续开发者若按 §4 复核，可能把已删除的重复校验加回 `step()`，重新引入「同一规则两处事实源」并使文档与代码再次漂移 | 该步骤改为「应用 pendingDir（合法性已在 keydown 判定，此处只应用与清空）」 |
| D-3 | SUGGESTION | `game.js:257-265` 空格分支未过滤 `event.repeat`，长按空格会连续 `resetGame()`，每次把 `lastTimestamp` 置回 `null`，导致对齐帧 `delta` 恒为 0、蛇短暂不动 | **影响**：需按住空格约 1 秒才可感知（松开后约 150–200ms 起步）；单次轻按不受影响。注：改用 `null` 哨兵后此路径比修复前更好（旧 `0` 哨兵下重开首帧会补 2 步产生「跳一下」） | 空格分支首行加 `if (event.repeat) { event.preventDefault(); return; }` |
| D-4 | SUGGESTION | `game.js:325-337` 高 DPI 缩放只在 `init()` 计算一次，无 `resize` / `matchMedia('resolution')` 监听 | **影响**：跨不同缩放比的显示器移动窗口、或浏览器缩放级别变化后，格子边缘发虚，刷新页面即恢复；无任何 Scenario 依赖 | 加 `resize` 监听并在重设 `canvas.width/height` 之后重新 `setTransform`；或按审查者建议在设计文档 §3.7 明确「仅在初始化时缩放」 |
| D-5 | SUGGESTION | `<canvas>` 无可访问名称与 fallback 内容，结束提示仅以 `fillText` 绘制在位图上，得分无 `aria-live` | **影响**：屏幕阅读器用户无法感知游戏区与结束/得分状态。审查者自行判定此项**超出本次 spec 范围**，属后续增强 | canvas 加 `role="img"` + `aria-label` 或 fallback 文本；结束与得分用 `aria-live="polite"` 的 DOM 节点镜像 |

## 8. 最终结论

**验证通过。** 7 项检查全部执行且全部 PASS；无 CRITICAL、无 IMPORTANT 问题；唯一一次最终集成审查已由独立审查者完成并通过。§7 的 5 项已接受偏差均经用户明确确认，不阻塞归档。

可进入 Archive 阶段。

---

## 附录 A：黑盒验证脚本完整源码

脚本刻意放在仓库外执行（`tasks.md` 任务 7.3 要求交付物仅新增 `index.html`、`style.css`、`game.js` 三个文件；设计文档亦将「不引入测试框架」列为非目标）。为使其可复现，完整源码随本报告留存。复现方式：把下面代码保存为 `harness.js`，然后在仓库根执行

```
node harness.js <仓库绝对路径>/game.js
```

期望输出末行为 `通过 45 / 45`，退出码 0。

```js
/*
 * add-snake-game 黑盒验证脚本（仓库外执行，不属于交付物）。
 * 通过 stub 的 DOM/Canvas/rAF 接口驱动真实的 game.js，
 * 仅经由「keydown 事件」与「绘制调用」两个真实接口观察行为，
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
    clearLog: () => { drawLog.length = 0; },
    press(k) {
      drawLog.length = 0; // 丢弃上一帧，只看按键后的绘制结果
      const ev = { key: k, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      keyHandler(ev);
      return ev;
    },
    /** 首帧只用于对齐时间戳（game 内部对 lastTimestamp 做懒初始化） */
    prime() {
      state.now = 1000;
      drawLog.length = 0;
      rafCb(state.now);
    },
    /** 驱动 n 个节拍，每拍 150ms */
    advance(n) {
      for (let i = 0; i < n; i += 1) {
        state.now += TICK;
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
const isOver = (h) => h.drawLog.some((e) => e.op === 'text' && e.text === '游戏结束');
const key = (c) => (c ? c.x + ',' + c.y : 'null');

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

  /* ---- 组 A：初始状态（首次加载） ---- */
  console.log('[组 A] 初始状态');
  randomValue = 0;
  const h = boot(gamePath);
  check('A1 初始蛇为 3 格', snakeCells(h).length === 3, '实际 ' + snakeCells(h).length);
  check('A2 初始只有一个食物', foodCells(h).length === 1, '实际 ' + foodCells(h).length);
  check('A3 初始得分为 0', h.scoreEl.textContent === '0', '实际 ' + h.scoreEl.textContent);
  check('A4 食物不与蛇身重叠', !snakeSet(h).has(key(foodCells(h)[0])), '食物 ' + key(foodCells(h)[0]));
  check('A5 蛇头位于 (10,10)', key(headCell(h)) === '10,10', '实际 ' + key(headCell(h)));
  check('A6 蛇身沿行向左延伸', snakeSet(h).has('9,10') && snakeSet(h).has('8,10'),
    '蛇身 ' + [...snakeSet(h)].join(' | '));
  check('A7 未向 window 暴露内部状态', global.window.SNAKE_DEBUG === undefined);

  /* ---- 组 B：初始方向与按节拍推进 ---- */
  console.log('\n[组 B] 初始移动方向与节拍推进');
  h.prime();
  h.advance(1);
  check('B1 初始方向为向右', key(headCell(h)) === '11,10', '实际 ' + key(headCell(h)));
  check('B2 未进食时长度不变', snakeCells(h).length === 3, '实际 ' + snakeCells(h).length);
  h.advance(3);
  check('B3 连续节拍持续前进', key(headCell(h)) === '14,10', '实际 ' + key(headCell(h)));
  check('B4 前进过程中无残影（长度仍为 3）', snakeCells(h).length === 3, '实际 ' + snakeCells(h).length);
  let noOverlap = true;
  for (let i = 0; i < 5; i += 1) {
    h.advance(1);
    const f = foodCells(h)[0];
    if (f && snakeSet(h).has(key(f))) noOverlap = false;
  }
  check('B5 多帧中食物始终不与蛇身重叠', noOverlap);

  /* ---- 组 C：撞墙结束与结束后的行为 ---- */
  console.log('\n[组 C] 撞墙结束与结束后的行为');
  const used = h.advanceUntilOver(40);
  check('C1 撞墙后判定结束', isOver(h), '又走了 ' + used + ' 拍');
  const overHead = headCell(h);
  check('C2 结束位置在右侧边界', overHead.x === COLS - 1 && overHead.y === 10, '实际 ' + key(overHead));
  h.advance(3);
  check('C3 结束后蛇不再推进', key(headCell(h)) === key(overHead), '实际 ' + key(headCell(h)));
  h.press('ArrowUp');
  h.advance(1);
  check('C4 结束后方向键不生效', key(headCell(h)) === key(overHead), '实际 ' + key(headCell(h)));
  check('C5 结束后仍显示结束提示', isOver(h));
  h.press('ArrowUp');
  h.advance(1);
  check('C6 结束后连续按方向键仍不生效', key(headCell(h)) === key(overHead), '实际 ' + key(headCell(h)));

  /* ---- 组 D：空格键重开 ---- */
  console.log('\n[组 D] 空格键重开');
  const evSpace = h.press(' ');
  check('D1 空格键被 preventDefault', evSpace.defaultPrevented === true);
  check('D2 重开后蛇恢复 3 格', snakeCells(h).length === 3, '实际 ' + snakeCells(h).length);
  check('D3 重开后蛇头回到 (10,10)', key(headCell(h)) === '10,10', '实际 ' + key(headCell(h)));
  check('D4 重开后得分归零', h.scoreEl.textContent === '0', '实际 ' + h.scoreEl.textContent);
  check('D5 重开后不再显示结束提示', !isOver(h));
  h.prime();
  h.advance(1);
  check('D6 重开后恢复向右移动', key(headCell(h)) === '11,10', '实际 ' + key(headCell(h)));

  /* ---- 组 E：转向校验（从重开后的向右状态继续） ---- */
  console.log('\n[组 E] 转向输入校验');
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

  h.press('W'); h.advance(1);
  check('E5a 大写 W 同样生效', key(headCell(h)) === '13,8', '实际 ' + key(headCell(h)));
  h.press('A'); h.advance(1);
  check('E5b 大写 A 同样生效', key(headCell(h)) === '12,8', '实际 ' + key(headCell(h)));

  const evDir = h.press('ArrowDown');
  check('E6 方向键被 preventDefault（阻止页面滚动）', evDir.defaultPrevented === true);

  /* ---- 组 F：进食增长与计分（独立整局） ---- */
  console.log('\n[组 F] 进食、增长与计分');
  randomValue = 0; // 食物固定为空格集合首元素
  const f = boot(gamePath).fresh();
  const foodBefore = foodCells(f)[0];
  check('F0 初始食物位于 (0,0)', key(foodBefore) === '0,0', '实际 ' + key(foodBefore));

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
  check('F2 吃到食物后得分 +1', Number(f.scoreEl.textContent) === scoreBefore + 1,
    '实际得分 ' + f.scoreEl.textContent);
  check('F3 吃到食物后蛇身长度 +1', snakeCells(f).length === lenBefore + 1,
    '实际 ' + snakeCells(f).length + '（原 ' + lenBefore + '）');

  const foodAfter = foodCells(f)[0];
  check('F4 进食后立即生成新食物', !!foodAfter, '食物 ' + key(foodAfter));
  check('F5 新食物不与蛇身重叠', foodAfter && !snakeSet(f).has(key(foodAfter)), '食物 ' + key(foodAfter));

  let overlapDuringGrowth = false;
  for (let i = 0; i < 8 && !isOver(f); i += 1) {
    f.advance(1);
    const cell = foodCells(f)[0];
    if (cell && snakeSet(f).has(key(cell))) overlapDuringGrowth = true;
  }
  check('F6 增长过程中食物始终不与蛇身重叠', !overlapDuringGrowth);

  // 走到结束再按空格，验证重开归零
  f.advanceUntilOver(60);
  const fOver = isOver(f);
  const fScore = f.scoreEl.textContent;
  f.press(' ');
  check('F7 结束状态下空格可重开（先到达结束）', fOver, '结束前得分 ' + fScore);
  check('F8 重开后得分归零', f.scoreEl.textContent === '0', '实际 ' + f.scoreEl.textContent);
  check('F9 重开后蛇恢复 3 格', snakeCells(f).length === 3, '实际 ' + snakeCells(f).length);

  /* ---- 组 G：撞到自身结束 ---- */
  console.log('\n[组 G] 撞到自身结束');
  const g = boot(gamePath).fresh();
  const selfHit = runSelfCollision(g);
  check('G1 撞到自身判定结束', selfHit.ok === true, selfHit.detail);

  /* ---- 汇总 ---- */
  const failed = results.filter((r) => !r.ok);
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
 * 全程只通过 keydown 与绘制调用观察。
 */
function runSelfCollision(h) {
  let dir = 'ArrowRight';

  for (let turn = 0; turn < 500; turn += 1) {
    const head = headCell(h);
    const snake = snakeSet(h);
    const food = foodCells(h)[0];
    if (!head || !food) return { ok: false, detail: '第 ' + turn + ' 拍读不到头部或食物' };

    const length = snakeCells(h).length;

    // 长度足够且位于可安全回转的内部区域时执行 2x2 回转
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

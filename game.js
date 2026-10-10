/*
 * 贪吃蛇 —— 纯 HTML/CSS/JS，无构建、无依赖。
 *
 * 分层：输入只写 pendingDir，step() 读写格子坐标状态，draw() 只读状态。
 * 三者单向依赖，因此移动、碰撞、进食逻辑可脱离 DOM 单独推理。
 * 全部逻辑包裹在 IIFE 内，不向 window 添加任何属性。
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 常量
   * ------------------------------------------------------------------ */

  var COLS = 20;                 // 网格列数
  var ROWS = 20;                 // 网格行数
  var CELL = 24;                 // 每格像素，画布逻辑尺寸 480x480
  var TICK_MS = 150;             // 每步推进的时间间隔
  var MAX_CATCHUP_STEPS = 2;     // 单帧最多补步数，防止切回标签页瞬间连撞
  var INIT_LEN = 3;              // 蛇的初始长度（格）
  var INIT_DIR = { x: 1, y: 0 }; // 初始移动方向：向右
  var RESTART_KEY = ' ';         // 结束状态下的重开键（空格）

  var COLORS = {
    background: '#0f1720',
    snakeHead: '#6ee7a8',
    snakeBody: '#2f9e68',
    food: '#f4a259',
    overlay: 'rgba(8, 12, 17, 0.72)',
    overlayTitle: '#e8eef5',
    overlaySub: '#9fb0c0'
  };

  // 按键 → 方向向量：方向键与 WASD 映射到同一组向量
  var KEY_DIRECTIONS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    W: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    S: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    A: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
    D: { x: 1, y: 0 }
  };

  var STATUS_RUNNING = 'RUNNING';
  var STATUS_OVER = 'OVER';

  /* ------------------------------------------------------------------ *
   * 状态
   * ------------------------------------------------------------------ */

  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');

  var game = {
    snake: [],            // 格子坐标数组，索引 0 为蛇头
    dir: { x: INIT_DIR.x, y: INIT_DIR.y }, // 当前实际方向
    pendingDir: null,     // 长度 1 的待处理方向槽
    food: null,           // 食物所在格子
    score: 0,
    status: STATUS_RUNNING
  };

  var accumulator = 0;    // 时间累加器（毫秒）
  var lastTimestamp = null; // 上一帧时间戳；null 表示尚未对齐（重开后同样置回 null）

  /* ------------------------------------------------------------------ *
   * 格子坐标辅助
   * ------------------------------------------------------------------ */

  function sameCell(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  // 收集所有未被蛇身占用的格子；铺满时返回空数组
  function freeCells() {
    var occupied = {};
    for (var i = 0; i < game.snake.length; i += 1) {
      occupied[game.snake[i].x + ',' + game.snake[i].y] = true;
    }

    var cells = [];
    for (var y = 0; y < ROWS; y += 1) {
      for (var x = 0; x < COLS; x += 1) {
        if (!occupied[x + ',' + y]) {
          cells.push({ x: x, y: y });
        }
      }
    }
    return cells;
  }

  // 在空格集合中随机放置食物；无空格时返回 false（本局结束）
  function spawnFood() {
    var cells = freeCells();
    if (cells.length === 0) {
      game.food = null;
      return false;
    }
    game.food = cells[Math.floor(Math.random() * cells.length)];
    return true;
  }

  /* ------------------------------------------------------------------ *
   * 初始化
   * ------------------------------------------------------------------ */

  // 首次开局与重开共用，保证两条路径行为一致
  function resetGame() {
    var headX = Math.floor(COLS / 2);
    var midY = Math.floor(ROWS / 2);

    game.snake = [];
    for (var i = 0; i < INIT_LEN; i += 1) {
      game.snake.push({ x: headX - i, y: midY }); // 蛇身向左延伸，索引 0 为蛇头
    }
    game.dir = { x: INIT_DIR.x, y: INIT_DIR.y };
    game.pendingDir = null;
    game.score = 0;
    game.status = STATUS_RUNNING;

    accumulator = 0;
    lastTimestamp = null;

    if (!spawnFood()) {
      game.status = STATUS_OVER; // 极端情况：网格容不下初始蛇身
    }

    renderScore();
    draw();
  }

  function renderScore() {
    if (scoreEl) {
      scoreEl.textContent = String(game.score);
    }
  }

  /* ------------------------------------------------------------------ *
   * 推进
   * ------------------------------------------------------------------ */

  function endGame() {
    game.status = STATUS_OVER;
  }

  function step() {
    if (game.status !== STATUS_RUNNING) {
      return;
    }

    // 1. 应用待处理方向。合法性（反向、每拍只采纳一次）已在 onKeyDown 阶段
    //    判定完毕，这里只负责应用与清空，避免同一规则出现两处事实源。
    if (game.pendingDir) {
      game.dir = game.pendingDir;
    }
    game.pendingDir = null;

    // 2. 计算新蛇头
    var head = game.snake[0];
    var next = { x: head.x + game.dir.x, y: head.y + game.dir.y };

    // 3. 越界判定
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      endGame();
      return;
    }

    // 4. 撞身判定。未进食时蛇尾本步会腾空，因此尾格不算障碍。
    var willEat = game.food !== null && sameCell(next, game.food);
    var checkLimit = willEat ? game.snake.length : game.snake.length - 1;
    for (var i = 0; i < checkLimit; i += 1) {
      if (sameCell(game.snake[i], next)) {
        endGame();
        return;
      }
    }

    // 5. 前进
    game.snake.unshift(next);

    if (willEat) {
      game.score += 1;
      renderScore();
      if (!spawnFood()) {
        endGame(); // 蛇身铺满网格，无处放置食物
      }
    } else {
      game.snake.pop();
    }
  }

  /* ------------------------------------------------------------------ *
   * 绘制
   * ------------------------------------------------------------------ */

  function fillCell(cell, insetRatio) {
    var pad = Math.round(CELL * insetRatio);
    ctx.fillRect(cell.x * CELL + pad, cell.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
  }

  function drawOverlay(width, height) {
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = COLORS.overlayTitle;
    ctx.font = 'bold 32px system-ui, "Microsoft YaHei", sans-serif';
    ctx.fillText('游戏结束', width / 2, height / 2 - 44);

    ctx.fillStyle = COLORS.overlaySub;
    ctx.font = '20px system-ui, "Microsoft YaHei", sans-serif';
    ctx.fillText('最终得分 ' + game.score, width / 2, height / 2 + 2);
    ctx.fillText('按空格键重开', width / 2, height / 2 + 42);
  }

  function draw() {
    var width = COLS * CELL;
    var height = ROWS * CELL;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    if (game.food) {
      ctx.fillStyle = COLORS.food;
      fillCell(game.food, 0.18);
    }

    // 从尾到头绘制，使蛇头覆盖在蛇身之上
    for (var i = game.snake.length - 1; i >= 0; i -= 1) {
      ctx.fillStyle = i === 0 ? COLORS.snakeHead : COLORS.snakeBody;
      fillCell(game.snake[i], 0.08);
    }

    if (game.status === STATUS_OVER) {
      drawOverlay(width, height);
    }
  }

  /* ------------------------------------------------------------------ *
   * 输入
   * ------------------------------------------------------------------ */

  function onKeyDown(event) {
    // 空格键：阻止页面滚动；仅在结束状态下开新局
    if (event.key === RESTART_KEY || event.key === 'Spacebar') {
      event.preventDefault();
      if (game.status === STATUS_OVER) {
        resetGame();
      }
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(KEY_DIRECTIONS, event.key)) {
      return;
    }

    event.preventDefault(); // 阻止方向键滚动页面

    if (game.status !== STATUS_RUNNING) {
      return; // 结束后方向输入不生效
    }

    if (game.pendingDir !== null) {
      return; // 每个节拍只采纳一次转向，同一节拍内后按的输入被忽略
    }

    var target = KEY_DIRECTIONS[event.key];
    if (isOpposite(target, game.dir)) {
      return; // 反向输入被忽略
    }

    game.pendingDir = { x: target.x, y: target.y };
  }

  /* ------------------------------------------------------------------ *
   * 主循环与启动
   * ------------------------------------------------------------------ */

  function loop(timestamp) {
    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
    }
    var delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (game.status === STATUS_RUNNING) {
      accumulator += delta;

      var steps = 0;
      while (accumulator >= TICK_MS && steps < MAX_CATCHUP_STEPS) {
        step();
        accumulator -= TICK_MS;
        steps += 1;
        if (game.status !== STATUS_RUNNING) {
          break;
        }
      }

      if (accumulator >= TICK_MS) {
        accumulator = 0; // 丢弃积压时间，避免切回标签页瞬间连撞
      }
    } else {
      accumulator = 0;
    }

    draw();
    window.requestAnimationFrame(loop);
  }

  // 按 devicePixelRatio 放大内部分辨率，避免高 DPI 屏下位图被拉伸发虚
  function setupCanvas() {
    var width = COLS * CELL;
    var height = ROWS * CELL;
    var ratio = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // canvas.width 赋值会重置变换矩阵，因此必须在其之后设置
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function init() {
    setupCanvas();
    resetGame();
    document.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(loop);
  }

  init();
})();

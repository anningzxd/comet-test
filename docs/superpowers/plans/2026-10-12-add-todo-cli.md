---
change: add-todo-cli
design-doc: docs/superpowers/specs/2026-10-12-add-todo-cli-design.md
base-ref: de804b41a1bbcb1a2fca5d281aa97dd715aaa4f8
---

# add-todo-cli 实施计划

<!-- comet-task-authority: docs/openspec/changes/add-todo-cli/tasks.md -->

需求契约：`docs/openspec/changes/add-todo-cli/specs/todo-cli/spec.md`（5 需求 / 11 场景）。
技术设计：Design Doc（见 frontmatter）。配置：autonomous + direct + standard 审查；isolation=branch（comet/add-todo-cli）。

## 交付物

- 新增 `todo_cli.py`（仓库根，单文件，仅标准库，Python 3.8+）
- 修改 `.gitignore`（追加 `todos.json`）
- 运行期数据：命令所在目录的 `todos.json`（不入库）

## 接口与文案基线（实现前固定；实现与验证共用同一口径）

函数与常量（3.8 兼容，不使用 PEP 585 泛型注解）：

| 符号 | 约定 |
| --- | --- |
| `DATA_FILENAME` | `"todos.json"` |
| `EXIT_OK / EXIT_DATA_ERROR / EXIT_USAGE_ERROR` | `0 / 1 / 2` |
| `TodoDataError(Exception)` | 中文说明（含数据文件路径）；由 `main` 统一捕获输出 |
| `data_path()` | `Path.cwd() / DATA_FILENAME`（每次调用时解析，不缓存） |
| `load_todos()` | 缺失→`[]`；`json.JSONDecodeError`/非字符串数组/`OSError`→`TodoDataError`；读取用 `utf-8-sig` |
| `save_todos(todos)` | `json.dumps(..., ensure_ascii=False, indent=2)` + 末尾 `\n`；同目录 `mkstemp` → 写入（UTF-8、`newline="\n"`）→ `os.replace`；失败清理临时文件并抛 `TodoDataError` |
| `cmd_add(args)` / `cmd_list(args)` | 返回退出码；空白内容由 `cmd_add` 拒绝（`content.strip()` 为空） |
| `ChineseArgumentParser` | 覆写 `error()` 与 `format_usage()`（「用法：」前缀） |
| `build_parser()` | `prog="todo_cli.py"`；`add_help=False` + 手动中文 `-h/--help`；子命令 `add content`（metavar 中文）与 `list`；`dest="command"`，不设 `required` |
| `main(argv=None)` | `reconfigure` stdout/stderr 为 UTF-8（`hasattr` 检查）；`command is None` → 中文提示 + 2；分发；`TodoDataError` → `错误：…` + 1 |

文案基线（断言按 UTF-8 解码后做子串匹配，不做逐字节全等）：

- 成功：`已添加：<内容>`（stdout）
- 空状态：`暂无待办`（stdout）
- 列表：每行 `N. <内容>`（stdout，N 从 1 起）
- 数据/运行错误：`错误：<说明>`（stderr，说明含数据文件路径）
- 用法错误：`用法错误：参数或子命令无效。` + 「用法：」行 + `--help` 提示（stderr）
- 无子命令：`用法错误：未提供子命令。` + 用法行（stderr）

## 执行顺序（依赖驱动）

1.1 骨架 → 1.3 读取层 → 1.4 写入层 → 4.1 解析器装配 → 4.2 错误/用法覆写 → 2.1、2.2 add → 3.1、3.2 list → 1.2 忽略规则 → 5.1、5.2 集成验收。

说明：add/list 的黑盒验收需要解析器先装配，故 4.1/4.2 先于 2.x/3.x；1.2 的第二个验证点（仓库根运行后 `git status` 干净）要求工具可运行，故放在 2.x/3.x 之后。

## 任务明细

### 1.1 创建 todo_cli.py 骨架
<!-- comet-task-ref:fb1e723f-df4e-4fd7-9f91-597132817469 -->
- 范围：新建文件，写分区注释、常量、`TodoDataError`、`main()` 空壳与 `__main__` 守卫（数据/命令/解析区先留占位）
- 依赖：无
- 验收：`python -m py_compile todo_cli.py` 退出码 0

### 1.3 数据读取层
<!-- comet-task-ref:7fe8c513-5455-4f32-b9a3-bd44b5f09def -->
- 范围：实现 `data_path()`、`load_todos()`（缺失→空；损坏→`TodoDataError` 且说明含路径；读取 `utf-8-sig`）
- 依赖：1.1
- 验收：临时目录 `python -c` 调用：缺失→`[]`；正常文件→返回条目；非法 JSON 与「合法 JSON 但非字符串数组」→抛错且文件字节未变

### 1.4 数据写入层
<!-- comet-task-ref:d8375e79-e159-4cae-b704-240c12994ee7 -->
- 范围：实现 `save_todos()`（序列化→同目录 mkstemp→`os.replace`；失败清理临时文件）
- 依赖：1.1
- 验收：临时目录 `python -c`：写入后读回一致；写入后无残留 `*.tmp`；文件中新条目为原文中文（`ensure_ascii=False`）

### 4.1 argparse 装配（中文帮助）
<!-- comet-task-ref:a334aa00-a168-4ebd-bae6-567170bb9795 -->
- 范围：`build_parser()`；`add_help=False` + 中文 `-h/--help`；`add`/`list` 子命令中文说明（此时 `cmd_*` 可为占位）
- 依赖：1.1
- 验收：黑盒 `--help`、`add --help`、`list --help` 退出码 0 且输出含中文说明

### 4.2 错误与用法覆写
<!-- comet-task-ref:c11feb7f-7e96-4b75-b47f-20f3b81383d9 -->
- 范围：`ChineseArgumentParser.error()`/`format_usage()`；`main` 对 `command is None` 的中文用法提示
- 依赖：4.1
- 验收：黑盒 `foo` 与无参数调用：退出码 2、stderr 含中文提示

### 2.1 add 正常路径与空白拒绝
<!-- comet-task-ref:7cdd6de1-5ef8-4ffb-8462-7a8e0a620c4a -->
- 范围：`cmd_add`（strip 后为空→stderr 错误 + 1；否则追加原始输入→保存→stdout `已添加：…` + 0）
- 依赖：1.3、1.4、4.1、4.2
- 验收：临时目录黑盒：add 一条→文件含该条、退出码 0；连续 3 条→顺序一致；`add ""`→退出码非零、文件字节不变

### 2.2 add 边界路径
<!-- comet-task-ref:aefd6139-b3c6-4ea6-8532-d9fac811c641 -->
- 范围：缺失文件自动创建；损坏文件报错不落盘（依赖 main 的异常捕获与「读先于写」次序）
- 依赖：2.1
- 验收：空目录首次 add→出现 `todos.json` 且含新条目；损坏文件下 add 前后内容完全一致、退出码 1

### 3.1 list
<!-- comet-task-ref:07d71791-d010-413c-972a-47e0a77acce1 -->
- 范围：`cmd_list`（空→`暂无待办` + 0；非空→逐行 `N. 内容`）
- 依赖：1.3、4.1、4.2
- 验收：黑盒三条按序输出；空目录与空数组两种情形输出空提示、退出码 0

### 3.2 list 损坏路径
<!-- comet-task-ref:21529c1f-84aa-4fd9-a240-5b7ea17df479 -->
- 范围：数据损坏时 list 的 stderr 中文错误 + 非零退出
- 依赖：3.1
- 验收：损坏文件下 list：退出码非零、文件前后一致

### 1.2 .gitignore 忽略规则
<!-- comet-task-ref:c1fc50f4-b256-4bca-aab9-dfd0033ab1ca -->
- 范围：`.gitignore` 追加忽略规则：`todos.json`（运行期数据）与 `__pycache__/`（`python -m py_compile` 与模块导入在仓库根产生的字节码缓存），均含简短中文注释；理由：两者都会由本 change 的验证流程在仓库根产生，忽略以避免污染 `git status`
- 依赖：2.x/3.x（第二个验证点需要工具可运行）
- 验收：`git check-ignore -v todos.json` 与 `git check-ignore -v __pycache__/` 均命中；仓库根运行 add 后 `git status --porcelain` 不含 `todos.json` 与 `__pycache__`

### 5.1 spec 全场景集成验收
<!-- comet-task-ref:dab9693e-d5eb-440a-9c5e-09b28b8ae4f1 -->
- 范围：逐条执行全部 11 个 Scenario（临时目录），记录命令/输出/退出码/文件状态对照表（作为 Verify 的检查点素材）
- 依赖：1.1–4.2 全部
- 验收：每条与 spec WHEN/THEN 一致

### 5.2 仓库根端到端演示
<!-- comet-task-ref:e558a6f2-4823-4a34-9bcf-9064ce92705d -->
- 范围：仓库根运行 `python todo_cli.py add "验证一条"` 与 `python todo_cli.py list`
- 依赖：1.2、5.1
- 验收：输出符合预期、退出码 0、`git status` 不出现 `todos.json`

## 检查、审查与提交

- 确定性检查：`comet check run add-todo-cli build --local -- python -m py_compile todo_cli.py`（cwd = 仓库根）
- 审查：standard —— 实现完成后由独立审查者对照 spec/design 审查实现（重点：损坏路径不落盘、原子写入、中文输出与退出码），问题修复后复验
- 提交：guard build --apply 通过后提交（分支 `comet/add-todo-cli`），message 记录 change 名与任务范围
- 回退：删除 `todo_cli.py` 与 `.gitignore` 中该行即回到 base-ref；执行中不重写历史

## 风险与回退

- argparse 覆写点若与本机 3.12 行为有出入（格式细节）→ 以黑盒验收为准微调覆写实现，不改接口基线
- Windows 下标准流 reconfigure 与管道解码 → 验证统一按 UTF-8 解码捕获
- 任一步骤失败：按 debug-gate 先调查根因，再改代码

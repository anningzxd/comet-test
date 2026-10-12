---
comet_change: add-todo-cli
role: technical-design
canonical_spec: openspec
---

# add-todo-cli 技术设计

- 行为契约（唯一需求来源）：`docs/openspec/changes/add-todo-cli/specs/todo-cli/spec.md`
- 范围与目标：`docs/openspec/changes/add-todo-cli/proposal.md`
- 本文件是 change 状态 `design_doc` 指向的正式技术设计；Open 阶段的 `design.md` 只保留决策索引与链接。

## 上下文与约束

- 全新增交付：仓库根目录 `todo_cli.py`（单文件、仅 Python 标准库、Python 3.8+），`.gitignore` 增加忽略规则（`todos.json` 与 `__pycache__/`）
- 仓库无构建系统与测试框架（既有约定）；本机验证环境 Python 3.12.0（`python` 可用，`python3` 为 Windows 商店存根）
- 运行环境含无头终端（Windows 11 + Git Bash）；数据文件位于命令执行的当前工作目录
- 与既有 `snake-game` 交付物零交集

## 架构

### 文件内分区与职责

| 分区 | 内容 | 职责 |
| --- | --- | --- |
| 1 常量与错误类型 | `DATA_FILENAME`、退出码常量、`TodoDataError` | 集中定义，避免散落 |
| 2 数据读写层 | `data_path()`、`load_todos()`、`save_todos()` | 只关心文件与 JSON；不含命令语义 |
| 3 子命令处理 | `cmd_add(args)`、`cmd_list(args)` | 命令语义与用户输出；返回退出码 |
| 4 argparse 装配 | `ChineseArgumentParser`、`build_parser()` | 参数模型与中文帮助/错误 |
| 5 入口 | `main(argv=None)`、`if __name__ == "__main__"` 守卫 | 标准流配置、分发、异常出口 |

边界规则：分区 3 只通过分区 2 的函数触达文件；分区 2 不打印用户输出、不调用 `sys.exit`（抛 `TodoDataError`）；用户可见文案只出现在分区 3/4/5。标准流配置放在 `main()` 内，导入模块无副作用（供验证脚本 `python -c "import todo_cli"` 使用）。注解保持 3.8 兼容（不使用 PEP 585 泛型写法）。

### 数据流

```
argv ──> build_parser().parse_args()
             │
             ├─ command is None ──> 中文用法提示(stderr) ──> exit 2
             │
             ├─ add ──> cmd_add: 空白校验(失败→exit 1)
             │              └─ load_todos ──> append ──> save_todos ──> stdout 成功提示，exit 0
             │
             └─ list ─> cmd_list: load_todos
                            ├─ 空 ──> stdout「暂无待办」，exit 0
                            └─ 非空 ──> 逐行「N. 内容」，exit 0

任意 load_todos/save_todos 抛出 TodoDataError
    ──> main 捕获 ──> stderr「错误：<说明>（含文件路径）」──> exit 1
```

## 数据模型与文件格式

`todos.json` 为 JSON 字符串数组，数组顺序即添加顺序：

```json
[
  "买牛奶",
  "写周报"
]
```

- 写入：`json.dumps(todos, ensure_ascii=False, indent=2)` + 末尾换行；无 BOM 的 UTF-8；`newline="\n"` 统一 LF
- 读取：UTF-8（`utf-8-sig` 兼容记事本等工具写入的 BOM）；解析后校验为「数组且每个元素是字符串」
- 损坏判定：`json.JSONDecodeError`，或顶层不是数组、任一元素不是字符串
- 路径不缓存：每次调用按 `Path.cwd() / "todos.json"` 惰性解析

## 关键决策

### D1 命令解析：argparse + 中文覆写

采用标准库 `argparse`；`ChineseArgumentParser` 子类覆写 `error()` 与 `format_usage()`（「用法：」前缀）；以 `add_help=False` 手动注册中文说明的 `-h/--help`。

- 错误文案策略：通用中文（「用法错误：参数或子命令无效。」）+ 中文用法行 + `--help` 提示；不翻译 argparse 内部英文消息。备选：正则提取问题 token 后拼接——脆弱、覆盖不全，不采用。
- 子命令不设 `required=True`：`main` 检测 `command is None` 后输出中文提示并 exit 2（文案完全可控）；无效子命令仍由覆写后的 `error()` 处理（exit 2）。

### D2 数据模型：字符串数组

最小结构满足「内容 + 顺序」；文件直接可读中文。备选：对象数组（为 `created_at` 等元数据预留字段）——当前无需求且增加损坏判定面，不采用。

### D3 内容处理：保存原始输入

`add` 仅当 `content.strip()` 为空时拒绝；否则追加原始参数（不 trim），不做转义。备选：保存 trim 后内容——改变用户输入且无验收要求，不采用。

### D4 原子写入

在内存完成序列化 → `tempfile.mkstemp(dir=path.parent)` 在同目录建临时文件 → 写入并关闭 → `os.replace(tmp, path)` 原子替换；任何失败清理临时文件并抛 `TodoDataError`。读取与校验全部先于写入，损坏路径绝不进入写流程。备选：直接 `write_text` 覆盖——中断会截断原文件，不采用。

### D5 标准流与文件编码

- 文件：写入无 BOM UTF-8；读取 `utf-8-sig`
- 标准流：`main()` 入口处对 `sys.stdout`/`sys.stderr` 调用 `reconfigure(encoding="utf-8")`（带存在性检查）
- 理由：Windows 管道/重定向下 locale 可能为 cp936/cp1252，中文输出会乱码或抛 `UnicodeEncodeError`。备选：依赖 locale 或要求用户设置 `PYTHONIOENCODING`——不采用。

### D6 退出码与输出通道

| 情形 | 通道 | 退出码 |
| --- | --- | --- |
| add/list 成功、空状态提示、`--help` | stdout | 0 |
| 数据损坏、空白内容、I/O 异常 | stderr | 1 |
| 用法错误（无效或缺少子命令） | stderr | 2 |

### D7 呈现细节（已确认）

- 成功提示：`已添加：<内容>`；空状态：`暂无待办`；列表：每行 `N. <内容>`（N 从 1 起）
- 错误前缀：`错误：`（数据/运行错误）、`用法错误：`（用法错误）
- 均为呈现层文案，微调不改变行为契约

## 失败路径与数据保护

| 场景 | 行为 | 原文件 |
| --- | --- | --- |
| list 且文件缺失 | 按空列表 →「暂无待办」，exit 0 | 不创建 |
| add 且文件缺失 | 创建并写入，exit 0 | 新建 |
| 文件非法 JSON | stderr 中文错误，exit 1 | 字节不变 |
| 合法 JSON 但非字符串数组 | 同上 | 字节不变 |
| 空白内容 | stderr 中文错误，exit 1（不进入写路径） | 不变 |
| 读取 I/O 异常（权限、同名目录等） | 中文错误，exit 1 | 不变 |
| 写入失败 | 中文错误，exit 1 + 清理临时文件 | 不变 |
| 内容含换行 | 原样存储；list 原样输出（跨行显示） | 已知展示限制 |

## 测试策略

- 不引入测试框架（proposal 非目标）。行为验证 = 黑盒命令逐条执行 spec 场景：
  - 环境：临时目录 + 子进程运行 `python <repo>/todo_cli.py …`，避免污染仓库
  - 断言：退出码、stdout/stderr 关键中文子串、`todos.json` 存在性与字节内容（损坏场景前后比对）
  - 覆盖：全部 11 个 Spec Scenario + 边界（空白、结构不符、目录独立、UTF-8 中文往返）
- 确定性检查：`python -m py_compile todo_cli.py`（Build 与 Verify 可复用同一 argv）
- 验证脚本不新增仓库文件：脚本置于仓库外临时位置，命令与完整源码记入 Verify 报告附录（沿用既有 change 的做法）
- Verify 阶段按 Spec Scenario 逐条对照，并做一次覆盖最终实现的集成审查

## 风险与已知限制

- 并发 add 无锁：后写覆盖先写（单用户单终端为既定非目标；若未来需要，改用文件锁或追加式存储）
- 字符串数组格式将来需要元数据时须一次格式升级（当前无既有数据，成本低）
- argparse 内部消息不翻译：用法错误文案不含具体 token（由用法行与 `--help` 覆盖）
- 内容含换行时列表跨行显示（已确认不做转义）

## 迁移与回滚

无数据迁移。回滚：删除 `todo_cli.py`、从 `.gitignore` 移除新增的 `todos.json` 与 `__pycache__/` 条目，回到本 change 的 base ref。

## Spec Patch

无。Design 阶段核对全部 11 个 Spec Scenario 未发现验收缺口，未回写 delta spec。

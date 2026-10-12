# Comet Design Handoff

- Change: add-todo-cli
- Phase: design
- Mode: compact
- Context hash: 8c44f25b18bf4eccfd9aee36647105709660d44cfefeb7b81817c3048458aed6

Generated-by: comet-handoff.sh
Task hash policy: task-content-v1. Read tasks.md for live completion; excerpts are design-time context.

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## docs/openspec/changes/add-todo-cli/proposal.md

- Source: docs/openspec/changes/add-todo-cli/proposal.md
- Lines: 1-35
- SHA256: b7306ec7de374a1c10c29c8659ff6ce814fc9ca718f8c13ab31243609901929a

```md
# Proposal

## Why

仓库目前只有一个需要浏览器运行的贪吃蛇游戏；在无头环境下既无法直接运行，也缺少覆盖"参数解析 + 本地文件持久化"的终端类交付物。todo-cli 补上这一块：它是一个可在任意终端直接运行、可脚本化验证的零依赖 Python CLI 工具，作为后续迭代与流程验证的第二类基线产物。

## What Changes

- 新增零依赖 Python 3 单文件工具 `todo_cli.py`（仓库根目录，仅标准库）：
  - `python todo_cli.py add "<内容>"`：追加一条待办到数据文件，输出中文成功提示
  - `python todo_cli.py list`：按添加顺序列出全部待办，输出中文列表；无数据时输出空提示
  - 数据持久化为**当前工作目录**下的 `todos.json`（首次添加时自动创建）
  - 数据文件缺失按空列表处理；文件损坏时输出明确中文错误、以非零退出码结束，且不覆盖原数据
- 用户可见输出（成功提示、错误信息、列表文本、帮助信息）统一使用中文
- 在 `.gitignore` 中忽略运行期数据文件 `todos.json`，避免在仓库内运行污染工作区状态
- 明确不在本次范围内：删除/编辑/标记完成、截止日期与优先级、彩色输出、多用户或同步、打包分发（pyproject / console script）、引入第三方依赖与测试框架
- 非破坏性变更：不改动既有游戏文件、公共行为与工作流配置

## Capabilities

### New Capabilities

- `todo-cli`: 命令行待办工具的完整可观察行为，覆盖 add/list 子命令与参数处理、待办追加与顺序保持、当前工作目录 JSON 数据文件的读取与写入、缺失/损坏数据文件与非法输入的处理，以及中文用户可见输出与非零退出码约定。

### Modified Capabilities

无。现有 `snake-game` 能力的需求不受影响。

## Impact

- 新增文件：`todo_cli.py`（仓库根目录）；运行期在命令执行目录生成 `todos.json`（已加入 `.gitignore`）
- 修改文件：`.gitignore`（新增忽略规则：`todos.json`、`__pycache__/`）
- 既有代码、公共 API、数据模型、依赖：除上述新增外均无影响
- 运行环境：Python 3（本机验证环境 3.12.0），无构建步骤，`python todo_cli.py <子命令>` 直接运行
- 不引入 pyproject.toml、测试框架或其他依赖，不改变现有 Comet/OpenSpec 工作流配置

```

## docs/openspec/changes/add-todo-cli/design.md

- Source: docs/openspec/changes/add-todo-cli/design.md
- Lines: 1-67
- SHA256: 384d2fea7647041a02581e1029a4d7d64097427793d6a149f1e583111702efb0

```md
# Design

## Context

见 `proposal.md` 的 Why。本次为全新增能力，仓库中没有既有 Python 代码、构建配置或依赖。

行为契约见 `specs/todo-cli/spec.md`。本文件是 Open 阶段的决策摘要；**正式技术设计**（架构、数据流、边界与失败路径、验证策略、完整风险表）见：

> `docs/superpowers/specs/2026-10-12-add-todo-cli-design.md`

即 change 状态中的 `design_doc`。本文不复制该文档的详细内容，只保留 schema 要求的摘要与决策索引。

关键约束：

- 单文件 `todo_cli.py`（仓库根目录），仅 Python 标准库（Python 3.8+），无构建步骤
- 仓库无测试框架与构建系统（既有约定），验证以可确定性重跑的黑盒命令为主
- 运行环境含无头终端（Windows + Git Bash）；数据文件位于命令执行目录

## Goals / Non-Goals

**Goals:**

- 用最小结构实现 `specs/todo-cli/spec.md` 定义的全部行为，且可逐条验证
- 数据读写的 I/O 层与子命令逻辑分层，便于后续 change 扩展子命令
- 数据文件定位与脚本所在目录解耦，严格跟随命令执行的当前工作目录
- 错误路径不破坏数据：数据文件损坏时只报错退出，绝不改写原文件

**Non-Goals:**

- 不引入第三方库、测试框架、打包配置（pyproject / console script）
- 不做并发写入保护与文件锁（单用户单终端为既定场景）
- 不做 i18n 框架（中文文案直接写在代码中）
- 不做数据格式版本化与迁移框架（当前无既有数据）

## Decisions

以下为 Open 阶段已确认的技术决策索引，逐项的理由、备选与代价展开见正式设计文档：

1. **命令解析**：标准库 `argparse` + `ArgumentParser` 子类，统一覆写错误与用法文案为中文。备选：手写 argv 解析（代码更多、易错）；click/typer（引入第三方依赖，违背零依赖）。
2. **数据模型**：`todos.json` 为 JSON 字符串数组，数组顺序即添加顺序。备选：对象数组（为 created_at 等元数据预留字段）——当前无此需求且增加损坏判定面，不作。
3. **数据文件定位**：每次调用惰性地按进程当前工作目录解析 `todos.json`（`Path.cwd()` 基准）。备选：脚本所在目录（违背 spec 的目录独立场景）；环境变量或参数指定（超出已确认范围）。
4. **写入策略**：完整序列化 → 同目录临时文件 → `os.replace` 原子替换；读取与校验在写入之前完成，任何读取错误直接失败退出。备选：直接覆盖写（中途中断会截断原文件）。
5. **错误与退出码**：成功为 0；数据损坏、空白内容等运行期错误为 1；用法错误沿用 argparse 的 2（均为非零，满足 spec 约定）。错误信息输出到 stderr，中文表述并指明数据文件路径。
6. **编码**：数据文件读写与标准流均显式 UTF-8（Windows 管道/重定向下避免 locale 编码导致中文乱码或异常）。
7. **`.gitignore`**：新增 `todos.json` 与 `__pycache__/` 忽略规则（后者由 `python -m py_compile` 与模块导入在仓库根产生），运行与验证期产物不污染仓库状态。
8. **代码组织**：单文件内按「常量与错误类型 → 数据读写层 → 子命令处理 → argparse 装配 → `main()` 入口」分区。
9. **验证方式**：不引入测试框架；以子进程黑盒命令逐条执行 spec 场景，另以 `python -m py_compile todo_cli.py` 作确定性语法检查（对齐仓库既有检查方式）。

## Risks / Trade-offs

- [无并发保护：两个进程同时 add 可能后写覆盖先写] → 单用户单终端为既定非目标；限制写入正式设计文档的风险表。
- [字符串数组格式将来需要元数据时须迁移] → 当前无既有数据，格式变更成本低；由后续 change 显式升级并说明迁移。
- [argparse 覆写点对版本差异敏感] → 覆写集中在一个子类、只使用公开接口；最低支持版本定为 Python 3.8。
- [中文输出在非 UTF-8 控制台可能异常] → 标准流重配 UTF-8，数据文件始终 UTF-8 读写。
- [空白内容、损坏文件等边界仅在运行时暴露] → 已固化为 spec Scenario，验证阶段逐条执行。

## 设计阶段 Spec Patch

无。Design 阶段核对全部 11 个 Spec Scenario 未发现验收缺口，未回写 delta spec。

## Migration Plan

无数据迁移。回滚方式：删除 `todo_cli.py` 并从 `.gitignore` 移除 `todos.json` 条目，即回到基线提交状态。部署：文件就位即可运行，无构建步骤。

## Open Questions

已确认采用：成功提示 `已添加：<内容>`、空状态 `暂无待办`、列表每行 `1. <内容>`（详见正式设计 D7）。以上均为可后调的呈现细节，不改变 spec 的行为契约与任务划分。

```

## docs/openspec/changes/add-todo-cli/tasks.md

- Source: docs/openspec/changes/add-todo-cli/tasks.md
- Lines: 1-28
- SHA256: c88415c6de76fc13a2e126c24245166464e3599c99cefd17ea33d615bf04f7f0

```md
# Tasks

## 1. 项目落点与数据读写层

- [x] 1.1 创建 `todo_cli.py` 骨架：按「常量与错误类型 → 数据读写层 → 子命令处理 → argparse 装配 → `main()` 入口」分区并含分区注释，入口用 `if __name__ == "__main__"` 守卫；验证：`python -m py_compile todo_cli.py` 退出码 0 <!-- comet-task:fb1e723f-df4e-4fd7-9f91-597132817469 -->
- [x] 1.2 在 `.gitignore` 增加 `todos.json` 忽略规则；验证：`git check-ignore -v todos.json` 命中该规则，且仓库根运行工具后 `git status` 不出现 `todos.json` <!-- comet-task:c1fc50f4-b256-4bca-aab9-dfd0033ab1ca -->
- [x] 1.3 实现数据读取层：按当前工作目录定位 `todos.json`；文件缺失返回空列表；内容非合法 JSON 或不是字符串数组时按数据损坏抛错（错误信息含文件路径）；验证：在临时目录用 `python -c` 调用读取函数，覆盖「缺失→空列表」「正常→返回条目」「损坏→抛错且文件内容未变」三种情形 <!-- comet-task:7fe8c513-5455-4f32-b9a3-bd44b5f09def -->
- [x] 1.4 实现数据写入层：完整序列化 → 同目录临时文件 → `os.replace` 原子替换，UTF-8 编码；验证：临时目录调用写入后读回内容一致，且目录内无残留临时文件 <!-- comet-task:d8375e79-e159-4cae-b704-240c12994ee7 -->

## 2. add 子命令

- [x] 2.1 实现 `add <内容>` 正常路径与空白拒绝：成功后输出中文成功提示（工作措辞 `已添加：<内容>`）且退出码 0；空串或纯空白输入输出中文错误、退出码 1、数据文件不被修改；验证：临时目录黑盒运行「add 一条→文件包含该条」「连续 add 三条→顺序正确」「add ""→非零退出且文件不变」 <!-- comet-task:7cdd6de1-5ef8-4ffb-8462-7a8e0a620c4a -->
- [x] 2.2 实现 add 的边界路径：数据文件缺失时自动创建并写入；数据文件损坏时输出中文错误、退出码 1，且原文件内容保持不变；验证：无数据文件目录首次 add 后出现 `todos.json` 且内容含新条目；对损坏文件运行 add 前后比对文件内容完全一致 <!-- comet-task:aefd6139-b3c6-4ea6-8532-d9fac811c641 -->

## 3. list 子命令

- [x] 3.1 实现 `list`：按添加顺序逐行输出全部待办（工作格式 `1. <内容>`）；无任何待办（文件缺失或空数组）时输出中文空状态提示（工作措辞 `暂无待办`）且退出码 0；验证：黑盒运行「三条待办按添加顺序输出」「空目录与空数组两种情形均输出空提示且退出码 0」 <!-- comet-task:07d71791-d010-413c-972a-47e0a77acce1 -->
- [x] 3.2 实现 list 的数据损坏路径：输出中文错误、退出码非零，原文件保持不变；验证：构造损坏文件运行 list，退出码非零且前后文件内容一致 <!-- comet-task:21529c1f-84aa-4fd9-a240-5b7ea17df479 -->

## 4. 命令行界面与中文输出

- [x] 4.1 装配 argparse 子命令解析：`add`/`list` 子命令与参数均含中文帮助说明；`--help` 输出包含中文说明且退出码 0；验证：黑盒运行 `--help`、`add --help`、`list --help`，检查中文说明存在与退出码 <!-- comet-task:a334aa00-a168-4ebd-bae6-567170bb9795 -->
- [x] 4.2 覆写 ArgumentParser 的错误与用法输出为中文：无效子命令（如 `foo`）或未提供子命令时输出中文用法/错误提示且退出码非零；验证：黑盒运行 `foo` 与无参数调用，检查退出码非零且输出含中文提示 <!-- comet-task:c11feb7f-7e96-4b75-b47f-20f3b81383d9 -->

## 5. 集成验收

- [x] 5.1 逐条执行 `specs/todo-cli/spec.md` 的全部 Scenario（含跨调用持久化、目录独立性、UTF-8 中文内容读写、损坏文件保护），记录命令、输出与退出码对照表；验证：每条场景的实际结果与 spec 的 WHEN/THEN 逐项一致 <!-- comet-task:dab9693e-d5eb-440a-9c5e-09b28b8ae4f1 -->
- [x] 5.2 在仓库根实际运行 `python todo_cli.py add "验证一条"` 与 `python todo_cli.py list` 完成端到端演示；验证：两条命令输出符合预期、退出码 0，且运行后 `git status` 中不出现 `todos.json` <!-- comet-task:e558a6f2-4823-4a34-9bcf-9064ce92705d -->

```

## docs/openspec/changes/add-todo-cli/.openspec.yaml

- Source: docs/openspec/changes/add-todo-cli/.openspec.yaml
- Lines: 1-2
- SHA256: 1dfdca412094f24473d8b842866201ec26f200b29b17064b03f1e4982c35a7b9

```md
schema: spec-driven
created: 2026-10-12

```

## docs/openspec/changes/add-todo-cli/specs/todo-cli/spec.md

- Source: docs/openspec/changes/add-todo-cli/specs/todo-cli/spec.md
- Lines: 1-82
- SHA256: 002e4c6019db6212be903c7c1df70d308819c3221f1fdf9c4c8c509acd020278

[TRUNCATED]

```md
# Spec Delta

## Purpose

定义 todo-cli 命令行待办工具对外可观察的行为：add/list 子命令、当前工作目录 JSON 数据文件的持久化及其缺失与损坏处理，以及中文输出与退出码约定，使该工具可被独立验收。

## ADDED Requirements

### Requirement: 添加待办

系统 SHALL 提供 `add` 子命令，把一条待办追加保存到数据文件；保存成功后 SHALL 输出中文成功提示并以退出码 0 结束。内容为空串或仅由空白字符组成的输入 MUST 被拒绝并报错。

#### Scenario: 成功添加一条待办

- **WHEN** 运行 `python todo_cli.py add "买牛奶"`（无论数据文件中是否已有待办）
- **THEN** 命令以退出码 0 结束，输出中文成功提示，数据文件中新增该条待办且原有待办保持不变

#### Scenario: 连续添加保持追加顺序

- **WHEN** 依次运行 add 添加 "写周报"、"预约体检"、"买牛奶" 三条待办
- **THEN** 数据文件中三条待办按添加先后顺序保存

#### Scenario: 空白内容被拒绝

- **WHEN** 运行 add 且内容为空串或仅包含空白字符
- **THEN** 命令以非零退出码结束，输出中文错误提示，数据文件内容不被修改

### Requirement: 列出全部待办

系统 SHALL 提供 `list` 子命令，按添加顺序输出数据文件中的全部待办；无任何待办时 SHALL 输出中文空状态提示；两种情况均以退出码 0 结束。

#### Scenario: 列出全部待办

- **WHEN** 已在当前工作目录添加三条待办后运行 `python todo_cli.py list`
- **THEN** 退出码为 0，输出按添加顺序包含全部三条待办的内容

#### Scenario: 无待办时的空状态提示

- **WHEN** 数据文件不存在，或其中没有任何待办时运行 `python todo_cli.py list`
- **THEN** 退出码为 0，输出中文空状态提示而非报错

### Requirement: 当前工作目录的 JSON 数据持久化

系统 SHALL 将待办以 JSON 格式保存在当前工作目录下的 `todos.json`；数据 MUST 跨命令调用持久保留。数据文件不存在时 SHALL 按无待办处理，并在首次写入时创建。不同工作目录的数据相互独立。

#### Scenario: 数据跨命令调用持久保留

- **WHEN** 在当前工作目录运行 add 添加一条待办，随后另起一次命令运行 list
- **THEN** list 的输出中包含此前添加的待办（数据经文件持久保留）

#### Scenario: 数据位置随工作目录相互独立

- **WHEN** 在目录 A 添加一条待办，随后在目录 B 运行 list
- **THEN** B 的 list 不包含该待办；A 目录下存在 `todos.json`，其为合法 JSON 且包含该待办

#### Scenario: 首次写入自动创建数据文件

- **WHEN** 当前工作目录不存在 `todos.json` 时运行 add
- **THEN** 命令结束后该目录下出现 `todos.json`，且其中包含新添加的待办

### Requirement: 数据文件损坏的错误处理

当 `todos.json` 存在但其内容不是合法 JSON、或不符合约定的待办数据结构时，系统 SHALL 按数据文件损坏处理：SHALL 输出明确的中文错误提示并以非零退出码结束，且 MUST NOT 覆盖、清空或改写原文件内容。

#### Scenario: 损坏文件导致明确报错且原数据不被覆盖

- **WHEN** `todos.json` 内容不是合法 JSON（或结构不符合约定）时运行 list 或 add
- **THEN** 命令以非零退出码结束并输出中文错误提示，且运行结束后该文件内容与运行前完全一致

### Requirement: 中文界面与退出码约定

系统全部用户可见输出（成功提示、错误信息、待办列表、帮助与用法说明）SHALL 使用中文；成功操作 SHALL 以退出码 0 结束，错误情况 SHALL 以非零退出码结束。

#### Scenario: 帮助与用法说明为中文

- **WHEN** 运行 `python todo_cli.py --help`
- **THEN** 退出码为 0，输出中包含中文的子命令与参数说明

#### Scenario: 无效调用以中文提示并失败


```

Full source: docs/openspec/changes/add-todo-cli/specs/todo-cli/spec.md

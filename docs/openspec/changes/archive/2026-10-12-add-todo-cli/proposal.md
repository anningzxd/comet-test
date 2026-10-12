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

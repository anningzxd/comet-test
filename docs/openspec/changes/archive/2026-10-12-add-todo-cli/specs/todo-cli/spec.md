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

- **WHEN** 运行未定义的子命令（如 `python todo_cli.py foo`）或未提供任何子命令
- **THEN** 命令以非零退出码结束，并输出中文的用法或错误提示

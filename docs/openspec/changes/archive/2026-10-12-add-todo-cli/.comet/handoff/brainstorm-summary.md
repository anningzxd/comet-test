# Brainstorm Summary

- Change: add-todo-cli
- Date: 2026-10-12
- Status: 用户已确认本设计（Comet Step 1c）

## 确认的技术方案

- 单文件 `todo_cli.py`，分区：常量与错误类型 → 数据读写层 → 子命令处理 → argparse 装配 → `main(argv=None)`
- argparse 子类统一中文化错误与用法输出；错误文案为通用中文（不翻译内部消息）；子命令缺省由 `main` 自检报错 exit 2
- 数据：当前工作目录 `todos.json`，JSON 字符串数组；`ensure_ascii=False, indent=2`、LF、无 BOM；读取 `utf-8-sig` 兼容 BOM
- 原子写入：同目录 mkstemp + `os.replace`；失败清理临时文件；`OSError`/`JSONDecodeError` → `TodoDataError` → exit 1
- UTF-8：文件显式 encoding；`main()` 内 reconfigure stdout/stderr
- 退出码：0 成功 / 1 数据与运行错误 / 2 用法错误
- 呈现：`已添加：<内容>` / `暂无待办` / `1. <内容>`

## 关键取舍与风险

- 错误消息：通用中文文案；不提取 argparse token（脆弱）
- 保存原始输入（不 trim），仅 strip 后为空拒绝
- 标准流 UTF-8 reconfigure（不依赖 locale / `PYTHONIOENCODING`）
- 无并发保护（既定非目标，已记入风险表）
- BOM 兼容读取；内容含换行不做转义（已知展示限制）

## 测试策略

无测试框架；黑盒子进程命令逐条执行 spec 全部 11 个场景（临时目录）；`python -m py_compile todo_cli.py` 确定性检查；验证脚本不新增仓库文件

## Spec Patch

无（11 个场景核对后无验收缺口）

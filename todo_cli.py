#!/usr/bin/env python3
"""todo-cli：简单的命令行待办工具。

用法：
    python todo_cli.py add "<内容>"    添加一条待办
    python todo_cli.py list            按添加顺序列出全部待办

数据保存在命令执行的当前工作目录下的 todos.json（JSON 字符串数组）。
"""

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. 常量与错误类型
# ---------------------------------------------------------------------------

DATA_FILENAME = "todos.json"

EXIT_OK = 0           # 成功
EXIT_DATA_ERROR = 1   # 数据或运行错误
EXIT_USAGE_ERROR = 2  # 用法错误


class TodoDataError(Exception):
    """数据文件相关错误：读取/写入失败，或内容不符合约定结构。"""


# ---------------------------------------------------------------------------
# 2. 数据读写层（不打印用户输出，不调用 sys.exit）
# ---------------------------------------------------------------------------

def data_path():
    """返回当前工作目录下的数据文件路径（每次调用时解析，不缓存）。"""
    return Path.cwd() / DATA_FILENAME


def load_todos():
    """读取全部待办。文件缺失按空列表处理；损坏时抛出 TodoDataError。"""
    path = data_path()
    try:
        raw = path.read_text(encoding="utf-8-sig")
    except FileNotFoundError:
        return []
    except UnicodeDecodeError:
        raise TodoDataError("数据文件已损坏（内容不是合法 UTF-8 文本）：{}".format(path))
    except OSError as exc:
        raise TodoDataError("无法读取数据文件 {}：{}".format(path, exc))

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise TodoDataError("数据文件已损坏（内容不是合法 JSON）：{}".format(path))

    if not isinstance(data, list) or any(not isinstance(item, str) for item in data):
        raise TodoDataError("数据文件已损坏（内容不是字符串数组）：{}".format(path))
    return data


def save_todos(todos):
    """原子写入全部待办：同目录临时文件写入后以 os.replace 替换。"""
    path = data_path()
    payload = json.dumps(todos, ensure_ascii=False, indent=2) + "\n"

    tmp_fd = None
    tmp_path = None
    try:
        tmp_fd, tmp_path = tempfile.mkstemp(
            dir=str(path.parent), prefix=".todos-", suffix=".tmp"
        )
        with os.fdopen(tmp_fd, "w", encoding="utf-8", newline="\n") as tmp_file:
            tmp_fd = None  # 已交由 tmp_file 管理
            tmp_file.write(payload)
        os.replace(tmp_path, str(path))
        tmp_path = None
    except OSError as exc:
        raise TodoDataError("无法写入数据文件 {}：{}".format(path, exc))
    finally:
        if tmp_fd is not None:
            os.close(tmp_fd)
        if tmp_path is not None:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# ---------------------------------------------------------------------------
# 3. 子命令处理（打印用户输出，返回退出码）
# ---------------------------------------------------------------------------

def cmd_add(args):
    """add 子命令：把一条待办追加保存到数据文件。"""
    content = args.content
    if not content.strip():
        print("错误：待办内容不能为空或仅包含空白字符。", file=sys.stderr)
        return EXIT_DATA_ERROR

    todos = load_todos()
    todos.append(content)
    save_todos(todos)
    print("已添加：{}".format(content))
    return EXIT_OK


def cmd_list(args):
    """list 子命令：按添加顺序列出全部待办。"""
    todos = load_todos()
    if not todos:
        print("暂无待办")
        return EXIT_OK

    for index, item in enumerate(todos, start=1):
        print("{}. {}".format(index, item))
    return EXIT_OK


# ---------------------------------------------------------------------------
# 4. argparse 装配（中文帮助、用法与错误输出）
# ---------------------------------------------------------------------------

HELP_HINT = "请运行 'python todo_cli.py --help' 查看说明。"
HELP_ACTION_HELP = "显示此帮助信息并退出"


class ChineseArgumentParser(argparse.ArgumentParser):
    """把 argparse 的用法前缀、帮助标题与错误输出统一为中文。"""

    USAGE_PREFIX = "usage: "

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 帮助输出的分组标题；属性不存在时静默跳过，仅影响显示
        for attr, title in (("_positionals", "位置参数"), ("_optionals", "选项")):
            group = getattr(self, attr, None)
            if group is not None:
                group.title = title

    @classmethod
    def _localize_usage_prefix(cls, text):
        """把默认的 "usage: " 前缀替换为中文「用法：」。"""
        if text.startswith(cls.USAGE_PREFIX):
            return "用法：" + text[len(cls.USAGE_PREFIX):]
        return text

    def format_usage(self):
        """用法行使用中文「用法：」前缀。"""
        return self._localize_usage_prefix(super().format_usage())

    def format_help(self):
        """帮助首行同样使用中文「用法：」前缀。"""
        return self._localize_usage_prefix(super().format_help())

    def error(self, message):
        """用法错误统一输出中文提示并以退出码 2 结束。"""
        self.print_usage(sys.stderr)
        self.exit(EXIT_USAGE_ERROR, "用法错误：参数或子命令无效。\n" + HELP_HINT + "\n")


def build_parser():
    """构造完整的命令行解析器。"""
    parser = ChineseArgumentParser(
        prog="todo_cli.py",
        description="简单的命令行待办工具：add 添加待办，list 列出全部待办。",
        add_help=False,
    )
    parser.add_argument("-h", "--help", action="help", help=HELP_ACTION_HELP)
    subparsers = parser.add_subparsers(dest="command", parser_class=ChineseArgumentParser)

    add_parser = subparsers.add_parser(
        "add",
        help="添加一条待办",
        description="添加一条待办并保存到当前工作目录的 todos.json。",
        add_help=False,
    )
    add_parser.add_argument("-h", "--help", action="help", help=HELP_ACTION_HELP)
    add_parser.add_argument("content", metavar="内容", help="待办内容（不能为空或纯空白）")

    list_parser = subparsers.add_parser(
        "list",
        help="列出全部待办",
        description="按添加顺序列出当前工作目录 todos.json 中的全部待办。",
        add_help=False,
    )
    list_parser.add_argument("-h", "--help", action="help", help=HELP_ACTION_HELP)
    return parser


# ---------------------------------------------------------------------------
# 5. 入口
# ---------------------------------------------------------------------------

def main(argv=None):
    """程序入口：配置标准流、解析参数、分发子命令、统一错误出口。"""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8")

    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command is None:
        parser.print_usage(sys.stderr)
        print("用法错误：未提供子命令。", file=sys.stderr)
        print(HELP_HINT, file=sys.stderr)
        return EXIT_USAGE_ERROR

    handlers = {"add": cmd_add, "list": cmd_list}
    try:
        return handlers[args.command](args)
    except TodoDataError as exc:
        print("错误：{}".format(exc), file=sys.stderr)
        return EXIT_DATA_ERROR


if __name__ == "__main__":
    sys.exit(main())

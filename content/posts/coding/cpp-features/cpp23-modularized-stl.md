---
date: '2024-12-13T01:34:07+08:00'
draft: false
title: 'C++23：标准库模块(一)'
slug: '98796ded'
authors:
    - Stephen
summary: '初见STL modules'
series:
    - C++ Features
tags:
    - cpp23
    - ISO
categories:
    - C++
---

## Preface

随着LLVM 19 release的发布，标准模板库STL终于可以使用`import`关键字进行导入了。这一特性本该随着C++20 Modules特性的落地而落地，但是由于编译器御三家的进展缓慢而拖到了今天。

值得注意的是，即便目前MSVC/LLVM已经完全支持[^1]了STL modules，但是它的大规模应用仍然有种遥不可及的味道。目前C++构建系统的事实标准，cmake对modules的支持仍有限：
- 仅支持Ninja/MSVC构建
- 不支持STL modules或者其他由编译器提供的modules

此外，C++构建系统的后起之秀[xmake](https://xmake.io/#/guide/project_examples?id=c20-module)，实现了较好的modules支持，供参考：[xmake: C++20 modules](https://xmake.io/#/guide/project_examples?id=c20-module)。

[^1]: GCC 15将会有限的支持STL modules

工具方面，LLVM附带的一些C++ tools对STL modules的支持可以说比较完善：语言服务器clangd支持从`std`模块中补全、查看以及重构；格式化工具`clang-format`也可以对`import`语句进行处理；静态检查工具`clang-tidy`在某些情况下会出现错误，但是大部分情况是可以运行的。

本文主要介绍如何初步使用STL modules，以及`clangd`工具的配置。

## Getting Started

### 测试源码

本文使用单文件进行测试，代码如下。

```cpp
// main.cpp
import std;

namespace views = std::ranges::views;

auto main(int c, char** v) -> int
{
    auto vec = std::vector<int> { 1, 2, 3, 4, 5 };
    auto gen = vec | views::drop(1) | views::reverse | views::filter([](auto&& n) -> bool { return n % 2 == 0; });

    std::print("{}\n", gen);
    return 0;
}
```

### 使用STL Modules编译

测试环境：

- LLVM 19.1.5 (aarch64), installed by Homebrew.
- Visual Studio Code

#### 生成BMI文件

BMI(Built Module Interface)文件是LLVM支持的可导入模块单元的预编译结果，它的常见后缀名通常是`.pcm`。

LLVM 19虽然完整实现了STL modules，但是并没有提供预编译好的BMI文件。因此在使用`import std;`之前，必须先编译STL modules：

```bash
clang++ -std=c++23 \
    /opt/homebrew/Cellar/llvm/19.1.5/share/libc++/v1/std.cppm
    -Wno-reserved-identifier -Wno-reserved-module-identifier \
    --precompile -o std.pcm
```

这条命令将会在当前目录下生成`std.pcm`文件，供`main.cpp`使用。注意`std.cppm`文件位置即可。


#### 编译`main.cpp`

使用这条命令编译`main.cpp`：

```bash
clang++ -std=c++23 main.cpp -o main -fmodule-file=std=std.pcm -fprebuilt-module-path=.
```

其中，`-fmodule-file=<module-name>=<BMI-file>`指定了导入的模块名，以及BMI文件名，`-fprebuilt-module-path`指定了BMI文件的搜索路径。

如果编译成功，则可以运行`./main`查看结果。

#### 配置语言服务器`clangd`

本文通过vscode调用`clangd`。

通过[vscode-clangd](https://github.com/clangd/vscode-clangd)插件传递给`clangd`的命令行参数如下：

```json {hl_lines=[7, 13]}
{
    "clangd.arguments": [
        "-j=6",
        "--log=info",
        "--pch-storage=memory",
        "--enable-config",
        "--header-insertion=never",
        "--clang-tidy",
        "--completion-style=detailed",
        "--background-index",
        "--all-scopes-completion",
        "--pretty",
        "--experimental-modules-support"
    ],
}
```

需要注意的是，`--experimental-modules-support`必须存在，否则`clangd`可能无法识别`import`关键字；此外`--header-insertion`的值最好设置为`never`，避免头文件自动插入导致`clangd`解析失败。

除此之外，项目配置文件`.clangd`必须存在，且`-std=c++23`选项必须存在，不然`clangd`可能会无法识别STL modules。

```yaml
--- # .clangd
CompileFlags:
  Add:
    - -xc++
    - -std=c++23
    - -fbuiltin-module-map
    - -fprebuilt-module-path=.
    - -fmodule-file=std=std.pcm
```

除此之外，后续`-f`选项也是必须的：`-fbuiltin-module-map`为`clangd`提供了STL modules的内容信息，缺少此项会导致`clangd`可以识别到`std`是有效的模块，但是无法生成相关的补全建议，也无法通过hover hints查看STL类和函数的相关信息；后两者在上一步中已经提到过，此处不再赘述。

### 优势与缺点

Modules无疑是便利的，仅以STL而言，几乎所有的`#include`都可以被一条`import`语句所替换。而且由于BMI的存在，编译时长必然存在明显的下降，这对大型项目而言无疑是重大利好。

目前Modules自身的诸多限制，例如：

- 编译器方面，不同编译器生成的预构建模块无法互相识别，类似于C++ ABI一样的分裂问题；
- 构建系统方面，截止到CMake v3.30，依然只能有限地支持Ninja/MSVC，且配置复杂，不够实用；
- 自身语法问题，不支持导出宏，不能很方便地和预处理器协作；

以上这些问题，使其完全替代头文件或者预处理器，还有很长的路要走。

工具方面，`clangd`作为目前唯二的C++ LSP server之一[^2]，它必须依赖module map才可以查找模块的内容并提供相关信息，而LLVM目前还不能根据模块的编译信息自动生成module map备用，这导致`clangd`的使用也受到了一定的限制。相关讨论见[clangd discussion #1979](https://github.com/clangd/clangd/discussions/1979)。而且目前它还存在一些其他的bug，例如无法为`import`关键字正确提供基于语义的高亮。

[^2]: 另一个是VSCode C/C++ Tools的LSP server。`ccls`被看作是`clangd`的衍生版本，不在此之列。

总的来说，STL modules还不太能满足笔者的期望，期待它的后续发展。

## References

1. [P2465R3: Standard Library Modules `std` and `std.compat`](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2022/p2465r3.pdf)
2. [LLVM doc: Standard C++ Modules](https://clang.llvm.org/docs/StandardCPlusPlusModules.html)
3. [Modules Report for C++20](https://github.com/royjacobson/modules-report)

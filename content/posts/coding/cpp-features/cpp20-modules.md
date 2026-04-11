---
date: '2026-04-11T02:20:31+08:00'
draft: false
title: 'C++20：模块使用中的误区'
slug: 'cd5e9d70'
authors:
    - Stephen
summary: 'C++20模块基本用法及CMake支持'
series:
    - C++ Features
tags:
    - cpp20
    - ISO
categories:
    - C++
series_weight: 2002
---

## Preface

C++20 引入的模块（Modules）可能是语言历史上最大的语法革新之一。但很多开发者在学习时，会下意识地套用其他语言（如Python或Java）中“模块”或“包”的概念，导致一系列误解和奇怪的编译错误。

本文聚焦于实际使用中**最令人困惑的疑点、陷阱**，以及 C++20 模块独有的、与其他语言不同的机制。默认读者应该了解基本的模块语法。

## 点号（`.`）不是子模块，只是模块名的一部分

**误解**：看到 `import std.core;` 就以为 `std` 是大模块，`core` 是它的子模块，可以用 `import std;` 导入整个 `std` 家族。

**真相**：在 C++20 中，**点号在模块名中没有特殊语义**。`import std.core;` 只是导入了一个名字叫 `"std.core"` 的独立模块。不存在嵌套或层级关系，也没有 `import std;` 就能自动导入 `std.core` 的机制。

```cpp
// 模块定义：mymath.ixx
export module mymath.vectors;   // 模块全名就是 "mymath.vectors"
export class Vec3 { ... };

// 另一个文件
import mymath.vectors;   // ✅ 正确
import mymath;           // ❌ 错误，不存在名为 "mymath" 的模块
```

## `export import` 会传递依赖，但不能用点号链式访问

**误解**：如果模块 `A` 写了 `export import B;`，那么外部就能用 `import A.B;` 来只导入 `B` 的部分。

**真相**：`export import B;` 的含义是：任何导入 `A` 的代码，**自动且不可选择地**也能看到 `B` 中的所有导出内容。但你不能通过 `A` 来“限定”访问 `B`，也不能写 `import A.B;`。`B` 的符号会直接注入到导入 `A` 的作用域中。

```cpp
// A.ixx
export module A;
export import B;   // B 也是一个模块

// main.cpp
import A;
b_function();      // ✅ 可以直接使用 B 中的导出函数
// import A.B;     // ❌ 语法错误
```

**与其他语言的区别**：Python 的 `from A import B` 后可以用 `B.func()`；C++20 没有嵌套命名空间式的模块访问，所有导入的内容都扁平地注入当前翻译单元。

## 分区之间可以互相引用，但私有片段与分区互斥

### 分区内部互相引用

**误解**：模块分区就像 Java 的内部类，彼此独立，只能通过主模块接口通信。

**真相**：分区是**同一模块内的逻辑分片**，它们之间可以**直接互相引用**，无需经过主模块接口。而且，分区中的所有声明（无论是否 `export`）对同一模块的其他分区都**完全可见**。

```cpp
// M-part1.cppm (分区接口单元)
export module M:part1;
import :part2;   // ✅ 直接导入同模块的另一分区
void from_part2();  // 声明，实现在 part2 中
export void foo() { from_part2(); }

// M-part2.cppm (分区实现单元，没有 export)
module M:part2;
void from_part2() {}  // 对 part1 可见，但对外部不可见
```

**限制**：分区之间不能循环导入（`part1` 导入 `part2`，`part2` 导入 `part1` 会导致编译错误）。

**标准依据**：C++20 [module.unit]/7-8。

### 私有模块片段与分区——你只能二选一

**误解**：私有模块片段可以像“模块内的 `private` 区域”一样，和分区一起使用。

**真相**：C++20 标准明确规定：**私有模块片段只能出现在单文件模块的唯一模块单元中**。一旦你写了 `module :private;`，该模块就不能再拥有任何其他模块单元（包括分区和额外的实现文件）。反过来，如果你使用了分区，就不能再写私有模块片段。

```cpp
// 单文件模块（可以使用私有片段）
export module single;
export void f();
module :private;
void f() {}

// 多文件模块（使用分区，不能有私有片段）
// M.cppm
export module M;
export import :part;
// module :private;   // ❌ 错误，已有分区
```

**为什么会有这个限制？** 私有模块片段本质上是把实现单元内嵌到接口单元的语法糖，与多文件分区模型不兼容。

## 分区实现单元（不带 `export`）不能被主模块导出

**误解**：主模块接口可以用 `export import :part;` 把任意分区的内容重新导出给外部。

**真相**：只有**分区接口单元**（声明为 `export module M:part;`）才能通过主模块的 `export import` 被重新导出。**分区实现单元**（声明为 `module M:part;`，无 `export`）即使被主模块 `import :part;`，也无法将其任何内容导出给外部——分区实现单元的作用仅限于**模块内部共享实现**。

```cpp
// 分区实现单元（无 export）
module M:impl;
void internal_helper() {}

// 主模块接口
export module M;
import :impl;           // ✅ 允许，internal_helper 对主模块可见
export import :impl;    // ❌ 错误！不能导出分区实现单元
```

**正确做法**：如果需要某个分区的部分接口对外可见，必须：
1. 将该分区定义为分区接口单元（`export module M:part;`）。
2. 在该分区中用 `export` 标记要导出的声明。
3. 在主模块中写 `export import :part;`。

## `export template` 的限制与 `export {}` 块

C++20 允许将模板声明放在模块接口单元（带 `export`），定义放在实现单元。但模板特化的导出有特殊规则，容易引起误解。

### 直接 `export` 模板特化是禁止的

根据 **P2615R1**（作为 DR 回溯至 C++20），以下写法**不合法**：

```cpp
export module M;
export template<> void func<int>(); // ❌ 错误：不能直接 export 特化
```

无论主模板是否被导出，单独使用 `export` 关键字修饰一个特化声明都是被标准禁止的。

### 推荐做法：使用 `export { }` 块导出特化

将模板及其特化放在同一个 `export { }` 块中，两者都会被正确导出：

```cpp
export module M;

export {
    template<typename T> void func();   // 导出主模板
    template<> void func<int>();        // ✅ 合法，特化随块导出
}
```

`export { }` 块不引入新作用域，只是批量导出声明的语法糖。块内的每个声明都获得 `export` 语义，因此特化可以被导出。

### 规则总结

| 写法 | 合法性 |
|------|--------|
| `export template<typename T> void f();` | ✅ 导出主模板 |
| `export template<> void f<int>();` | ❌ 直接导出特化，非法 |
| `export { template<> void f<int>(); }`（主模板已导出） | ✅ 合法 |
| `export { template<typename T> void f(); template<> void f<int>(); }` | ✅ 合法，更清晰 |

### 重要前提

- 特化的可见性依赖于其主模板。如果主模板**没有被导出**（且不在同一个 `export` 块中），即使特化被放在 `export { }` 块中，也**无法被导出**。
- 因此，最安全的做法是将主模板和特化**一起放入 `export { }` 块**，确保两者都被导出。

### `export { }` 块的其他规则

- 不能在内再次使用 `export` 关键字。
- 块内不能包含具有内部链接的实体（如 `static` 变量、匿名命名空间中的函数）。

### 编译器支持现状

- **Clang 17+** 和 **GCC 14+** 已实现 P2615R1 的规则。
- **MSVC** 对直接 `export` 特化有扩展支持（允许但不标准），为了可移植性仍建议使用 `export {}` 块。

## 私有模块片段中的命名空间扩展不会导出任何东西

**误解**：因为命名空间 `X` 被导出了，所以在私有片段中向 `X` 添加的函数也会被导出。

**真相**：私有模块片段中的所有代码（包括在已导出命名空间内的定义）**完全不具有外部可见性**。外部代码只能看到私有片段之前的、显式 `export` 的声明，但看不到私有片段中定义的任何新符号。

```cpp
export module demo;
export namespace Math {
    int add(int a, int b);   // 仅声明
}
module :private;
namespace Math {
    int add(int a, int b) { return a + b; }   // 实现，不导出
    int sub(int a, int b) { return a - b; }   // 额外函数，也不导出
}
```

外部代码：
```cpp
import demo;
Math::add(1, 2);   // ✅ 链接成功（实现来自私有片段）
Math::sub(1, 2);   // ❌ 编译错误：'sub' 不是 Math 的成员
```

**结论**：私有片段是真正的“实现细节区域”，即使扩展命名空间，也不会泄露给外部。

## 头文件单元（Header Unit）——披着模块外衣的传统头文件

**误解**：`import <iostream>;` 就等于把标准库完全模块化了，可以享受模块的所有好处。

**真相**：`import <iostream>;` 导入的是一个**头文件单元**，它与真正的命名模块（如 `import std;`）有本质区别。头文件单元是 C++20 为平滑迁移提供的过渡机制。

### 头文件单元 vs 命名模块 vs 传统 `#include`

| 特性 | 传统 `#include` | 头文件单元 | 命名模块 |
|------|----------------|------------|----------|
| 宏传递 | 会传递 | **会传递**，但在预编译时冻结 | 不传递 |
| 编译速度 | 慢 | 中等 | 快 |
| 隔离性 | 差 | 中等 | 优秀 |
| 迁移成本 | — | 低 | 高 |

### 头文件单元最隐蔽的陷阱：宏的“冻结”效应

当头文件被编译为头文件单元时，其内部的宏定义在**编译 BMI 的那个时刻就被固定**。之后任何导入该头文件单元的代码，无论之前定义了什么宏，都无法影响头文件单元内部的宏状态。

```cpp
// lib.h
#ifndef DEF_VAL
#define DEF_VAL 10
#endif
inline int getVal() { return DEF_VAL; }

// 头文件单元用法：宏被冻结
#define DEF_VAL 100
import "lib.h";  // ⚠️ DEF_VAL 已经是 10，外部的 #define 无效！
// getVal() 返回 10，而非 100
```

### 全局模块片段与头文件单元的关系

- **全局模块片段**（`module;` 开始）中的 `#include` 用于在模块接口单元内部隐式地包含头文件，这些头文件的内容会成为模块实现的一部分，但不会被导出。
- **头文件单元**（`import <header>`）将头文件作为独立的、可导入的单元，其导出的符号对当前翻译单元可见。

选择建议：
- 头文件仅用于模块内部实现 → 使用全局模块片段 `#include`。
- 头文件提供模块使用者也需要使用的接口（如标准库）→ 使用头文件单元 `import` [^1]。

[^1]: 由于cmake尚不支持头文件单元，因此实际项目中应该慎用这一特性

## 总结：C++20 模块的独特哲学

| 其他语言（Java/Python） | C++20 模块 |
|------------------------|------------|
| 点号表示嵌套，`import a.b` 可导入子包 | 点号只是名字的一部分，无嵌套语义 |
| 模块/包是运行时概念 | 模块是纯编译期概念，无运行时开销 |
| 子模块可以独立存在 | 分区不是独立模块，仅用于拆分文件 |
| 通常不支持“重新导出” | `export import` 可传递依赖 |
| 私有成员通过 `private` 关键字控制 | 私有片段和分区实现单元提供文件级隐藏 |

**给开发者的建议**：
- 忘掉 Java 的包和 Python 的模块，把 C++20 模块看作“经过编译的、能防止宏泄露的超级头文件”。
- 遇到点号时，提醒自己：`import mylib.core;` 和 `import mylib.utils;` 是两个毫无关系的模块，除非你手动用 `export import` 关联它们。
- 优先使用单文件 + 私有片段组织中小型模块，需要物理拆分多个文件时才使用分区。

## 标准草案及编译器实现参考

以下为本文引用的主要标准提案及实现状态（基于公开资料）：

| 要点 | 提案 | 标准文本 | GNU | LLVM | MSVC |
|------|------|----------|-----|------|------|
| 模块名中的点号无层级语义 | [P1873R1](https://wg21.link/p1873r1)[^2] | [[module.unit]/3](https://eel.is/c++draft/module.unit#3) | 11 | 17 | 14.28 |
| `export import` 传递导出 | [P1103R3](https://wg21.link/p1103r3) | [[module.import]/7](https://eel.is/c++draft/module.import#7) | 11 | 17 | 14.28 |
| 分区之间可以互相引用 | [P1103R3](https://wg21.link/p1103r3) | [[module.unit]/7](https://eel.is/c++draft/module.unit#7) | 11 | 17 | 14.28 |
| 私有片段与分区互斥 | [P1103R3](https://wg21.link/p1103r3) | [[module.private.frag]/1](https://eel.is/c++draft/module.private.frag#1) | 11 | 17 | 14.28 |
| 分区实现单元不能被导出 | [P1103R3](https://wg21.link/p1103r3) | [[module.import]/8](https://eel.is/c++draft/module.import#8) | 11 | 17 | 14.28 |
| 直接导出模板特化禁止，`export {}` 允许 | [P2615R1](https://wg21.link/p2615r1) | [[module.interface]/6](https://eel.is/c++draft/module.interface#6) | 15 | 17 | 14.28 |
| 私有片段中命名空间扩展不导出 | [P1103R3](https://wg21.link/p1103r3) | [[module.private.frag]/2](https://eel.is/c++draft/module.private.frag#2) | 11 | 17 | 14.28 |
| 头文件单元宏冻结 | [P1103R3](https://wg21.link/p1103r3) | [[module.import]/5](https://eel.is/c++draft/module.import#5) | 11 | 17 | 14.28 |
| 全局模块片段 | [P1103R3](https://wg21.link/p1103r3) | [[cpp.include]/7](https://eel.is/c++draft/cpp.include#7) | 11 | 17 | 14.28 |
| 命名空间内 export 导致隐式导出 | [P1103R3](https://wg21.link/p1103r3) | [[module.interface]/2.1](https://eel.is/c++draft/module.interface#2.1) | 11 | 17 | 14.28 |

[^2]: P1873R1 提案试图从 C\++20 中移除模块名中的点号，其动机正是 __`.` 仅提供隐含的层级暗示而无标准定义的关系__。尽管提案最终未被采纳，但这一论述恰好印证了 C+\+20 中点号无层级语义的事实。

希望本文能帮你少走弯路，正确理解并使用 C++20 模块。

---
date: '2026-04-06T23:15:14+08:00'
draft: false
title: 'C++26：std::optional终于等来了引用支持'
authors:
    - Stephen
slug: 'f6e4aed2'
summary: 'optional<T&> 的前世今生与使用指南'
series:
    - C++ Features
tags:
    - cpp26
    - optional
    - ISO
categories:
    - C++
series_weight: 2601
---

## Preface

春节前写业务代码（C\++20）时，我遇到了一个很常见的需求：写一个查找函数，查找某个大对象。如果找到就返回对象的引用，找不到就表示“没有”。直觉告诉我 `std::optional<T&>` 是最自然的写法——清晰表达“可能有引用，也可能没有”。结果编译器直接报错，查了文档才想起来：C\++17 引入的 `std::optional` 不支持存放引用类型。最后只能使用返回裸指针的方法交差。

要想让 `optional` 持有引用，只能用 `std::optional<std::reference_wrapper<T>>`，代码一下子变得啰嗦且晦涩。这个“洞”在标准库里存在了近十年，直到 C\++26 才被正式补上。为什么一个看起来顺理成章的功能等了这么久？这背后其实有一段挺有意思的设计争议。

## 为什么 C++17 未引入 `optional<T&>`？

`std::optional` 的提案最早可追溯到 2005 年。第一版提案其实已经包含了 `std::optional<T&>` 的特化，但在后续修订中，委员会对引用版本产生了严重分歧。

核心争议在于赋值操作的含义。看这段代码：

```cpp
int x = 1;
int y = 2;
std::optional<int&> ref{x};  // ref 绑定到 x
ref = y;                     // 应该做什么？
```

委员会内部主要有三种看法：

- **Rebind（重新绑定）**： ref 放弃对 x 的引用，改为绑定到 y。这种语义更贴近 optional 作为“值容器”的本意，也是 [P2988R0](https://wg21.link/p2988r0) 最终采纳的方案。
- **Assign‑through（穿透赋值）**：保持引用绑定不变，但把 y 的值拷贝到 x。这更贴近普通引用的行为。
- **禁止赋值**：既然 T& 本身不可重新绑定，那就干脆禁用赋值操作。

三种方案各有道理，竞争激烈。提案作者在 2013 年的 Revision 3 中决定“弃车保帅”，把 `std::optional<T&>` 剥离出去，优先让  `std::optional<T>` 进入 C++17。原话是：委员会可以选择只接受值版本，如果觉得引用版本不可接受的话。

此后，多个提案试图推动引用支持。[P1175R0](https://wg21.link/p1175r0) 在 2018 年为 C+\+20 重新提议了引用特化，但未被采纳。[P1683R0](https://wg21.link/p1683r0)对现存的各种 optional 引用实现做了一次全面调查，指出了赋值行为在不同状态下可能产生的不一致陷阱。直到 2023 年，Steve Downey 和 Peter Sommerlad 提出的 [P2988R0](https://wg21.link/p2988r0) 才真正在设计层面达成共识，被 Library Evolution Working Group 批准进入 C+\+26。

## 为什么`optional<T&>`饱受争议？

最大的争议来自两个方面：
1. `optional<T>` 是为值语义设计的容器
2. 引用类型并非 C++ 的一等公民，这导致一些在值语义下看起来复合直觉的操作反而会违反直觉

要理解 `optional<T&>` 的争议，需要先搞清楚一个概念：在 C++ 中，引用不是**一等公民**（First‑class citizen）。

一等公民通常指一个语言实体能够：

- 存储在变量中
- 作为参数传递
- 从函数返回
- 在运行时动态创建
- 比较身份（identity）而非值

C+\+ 的引用（`T&`）在前三条上勉强过关，但在后两条上彻底失败：

- 无法动态创建：不能 `new int&`，引用必须在初始化时绑定到已有对象。
- 无法比较身份：`r1 == r2` 比较的是所绑定的对象的值，而不是引用本身。要比较引用是否绑定到同一对象，只能 `&r1 == &r2` ——取地址后比较指针。

此外，引用还有两个“二等”特征：

- 不能重新绑定：普通引用一旦初始化，永远无法指向另一个对象。
- 不能形成“引用的引用”：`int && &` 会折叠为`int&`，不会产生真正的引用的引用。

这些缺失让引用在泛型编程中成为一个“二等公民”——你无法像对待值类型或指针那样用统一的模板去处理它。而 `optional<T>` 是为值类型设计的容器，要把引用塞进去，自然会在语义上产生剧烈冲突。这也是为什么 `optional<T&>` 花了近十年才落地。

## C++26 的 std::optional<T&> 是什么？
C++26 正式接纳了 `std::optional<T&>`。它的核心特性如下：

- 非持有型：它只引用已存在的对象，不拥有所有权，也不管理生命周期。使用者必须保证被引用对象的生命周期覆盖 `optional` 的使用期。
- Rebind 赋值语义：`opt = y`; 会让 `opt` 放弃原来的引用，转而绑定到 `y`。这与普通引用的行为不同，但与 `optional` 作为“容器”的直觉一致。
- 浅层 `const`：`const std::optional<T&>` 解引用后得到 `T&`（非 `const`）。如果需要深层 `const`，可以用 `const std::optional<const T&>`。
- `value_or` 返回值：即使对 `optional<T&>` 调用 `value_or`，返回的也是 `T` 类型的值（按值拷贝），而不是引用。这避免了悬垂引用和语义混淆。
- `make_optional` 被禁用：`std::make_optional<T&>` 已被禁止，直接使用构造函数：`std::optional<int&>(x)`。

## `reference_wrapper` 与 `optional<T&>` 怎么选？
在 C++26 之前，如果需要“可存放、可重新绑定的引用”，唯一的标准方案是 std::reference_wrapper<T>。它和新的 optional<T&> 有重叠，但定位不同。

## `optional<T&>` 的内部实现

既然 `optional<T&>` 已经正式加入标准，我们不妨看看它内部是如何实现的——**它存储的是 `T*` 指针，而非 `reference_wrapper<T>`**。

根据标准提案 [P2988R0](https://wg21.link/p2988r0) 及主流标准库实现（libc++、libstdc++），`optional<T&>` 的特化大致如下：

```cpp
template <class T>
class optional<T&> {
    T* __ptr_;  // 内部存储指针，nullptr 表示空状态

public:
    // 构造
    constexpr optional() noexcept : __ptr_(nullptr) {}
    constexpr optional(nullopt_t) noexcept : __ptr_(nullptr) {}
    constexpr optional(T& __v) noexcept : __ptr_(std::addressof(__v)) {}

    // Rebind 赋值语义
    constexpr optional& operator=(T& __v) noexcept {
        __ptr_ = std::addressof(__v);  // 重新绑定到新对象
        return *this;
    }

    // 解引用
    constexpr T& operator*() const noexcept { return *__ptr_; }
    constexpr T* operator->() const noexcept { return __ptr_; }
    // ...
};
```

### 为什么不用 `reference_wrapper<T>`？

你可能会问：既然 `reference_wrapper` 已经能给引用提供”值语义”，为什么不直接用它？

关键在于**空状态**：

| 特性 | `reference_wrapper<T>` | `optional<T&>` 的需求 |
|------|------------------------|----------------------|
| 空状态 | ❌ 默认构造被删除，必须有引用 | ✅ 需要显式空状态（`nullopt`） |
| 与 `optional` 互操作 | ❌ 不支持 `nullopt` | ✅ 必须支持 `nullopt` |

`reference_wrapper` 必须在构造时绑定到有效对象，无法表达”没有引用”。而 `optional` 的核心语义就是”可能有值，也可能没有”，所以底层必须用指针实现，用 `nullptr` 表示空状态。

这也解释了为什么 `make_optional<T&>` 被禁用：如果用 `make_optional`，会涉及模板推导和临时对象的陷阱，而直接使用构造函数 `optional<T&>(obj)` 清晰且安全。

## 四种**引用**方式的对比与选择

理解了 `optional<T&>` 的内部实现后，我们来看看 C++ 中表达”引用”概念的几种方式：普通引用 `T&`、原始指针 `T*`、`std::reference_wrapper<T>`，以及 C++26 新增的 `std::optional<T&>`。它们各有适用场景，理解其区别有助于写出更清晰、更安全的代码。

### 横向对比

| 特性 | `T&` | `T*` | `std::reference_wrapper<T>` | `std::optional<T&>` (C++26) |
| :--- | :--- | :--- | :--- | :--- |
| **可空性** | ❌ 必须绑定有效对象 | ✅ 可为 `nullptr` | ❌ 必须绑定有效对象（默认构造被移除） | ✅ 显式 `nullopt` |
| **重新绑定** | ❌ 不可变 | ✅ 可修改指针值 | ✅ 可重新绑定 | ✅ 可重新绑定（通过赋值） |
| **容器存储** | ❌ 不可（C++26 前） | ✅ 可存指针 | ✅ 可直接存 | ✅ 可直接存 |
| **语法开销** | 零（编译期别名） | 需要 `*` 或 `->` | 需要 `.get()` 或隐式转换 | 支持 `*` 和 `->` |
| **比较语义** | 比较所绑定的对象的值 | 比较指针地址 | 比较所绑定的对象的值  | 先判断是否为空，后比较存储的地址 |
| **monadic 方法** | ❌ 无 | ❌ 无 | ❌ 无 | ✅ `and_then`, `transform`, `or_else` |
| **生命周期安全** | 编译器检查（部分） | 需手动确保 | 需手动确保 | 需手动确保 |

### 如何取舍？

#### 优先用普通引用 `T&`
- 引用**永远不会为空**，且不需要重新绑定。
- 作为函数参数、局部别名、返回类成员（生命周期明确），此时不持有对象的所有权，仅能访问。

#### `T*` 对 `T&`的补充
- 需要与 C 库交互的场景。
- 可以表示数组（函数传参退化时）。
- 可以完全覆盖 `T&` 的用途。但存在空指针表示可选引用。
C++26 后：**表达“可选引用”时，可以优先考虑 `optional<T&>`**，因为指针的语义过于模糊（可能表示可选、可能表示数组、可能表示所有权）。

#### 需要存入容器或重新绑定时，考虑 `reference_wrapper`
**注意**：`reference_wrapper`是符合引用语义的对象，但它并非引用，而是一个存储了指针的结构体。
确定引用**一定存在**（不处理空状态），且需要存放在 `vector` 等容器中，或者需要频繁改变引用的目标。例如：`std::vector<std::reference_wrapper<Widget>>` 存储一组对象的引用，这些对象由其他人管理生命周期。

#### 新代码表达“可选引用”时，使用 `std::optional<T&>`
- 返回值可能“没有对象可引用”（如查找失败）。
- 类成员表示一个可能不存在的依赖关系。
- 需要 monadic 链式操作（见第六章）。

### 结论：何时选择`optional<T&>`？

结合前述对比，以下情况应避免使用 `optional<T&>`：

- **引用永远不会为空**：直接用 `T&`。强行使用 `optional` 会引入无意义的空状态检查开销，且让代码更复杂。
- **需要拥有对象的所有权**：`optional<T&>` 不管理生命周期，对象的销毁由外部负责。如果需要拥有对象，用 `std::unique_ptr<T>` 或直接存储 `T` 的值。
- **只需存放多个引用，无需空状态**：`std::vector<std::reference_wrapper<T>>` 比 `std::vector<std::optional<T&>>` 更紧凑（少一个字节的状态标记），且语义更清晰——这里的每个元素都必然引用某个对象。
- **需要指针算术或作为数组游标**：使用原始指针或 `std::span`。
- **你的代码仍处于 C++20 或更早标准**：此时没有标准 `optional<T&>`，需用 `optional<reference_wrapper<T>>` 或指针代替。

### 一个小例子：从原始指针迁移到 `optional<T&>`

```cpp
// before cpp26
Widget* findWidget(const std::string& name) {
    auto it = std::find_if(widgets.begin(), widgets.end(),
                           [&](auto& w) { return w.name == name; });
    return it != widgets.end() ? &*it : nullptr;
}
// 调用
if (Widget* w = findWidget("gizmo")) {
    w->doSomething();  // 需要检查空指针
}

// after cpp26
std::optional<Widget&> findWidget(std::string_view name) {
    auto it = std::ranges::find_if(widgets, [&](auto& w) { return w.name == name; });
    if (it != widgets.end()) return *it;
    return std::nullopt;
}
// 调用
findWidget("gizmo").and_then([](Widget& w) {
    w.doSomething();
    return w; // or nullopt if nothing found, it will break the invoke chain
});
```

新代码的意图更明确：返回值要么有引用，要么没有。调用者无法直接忽略检查（如果直接 `*w` 而 `w` 为空，会抛异常）。相比原始指针，`optional<T&>` 在类型层面强制了对空状态的处理。

## 引用的“一等公民”之路

C++ 的引用不是一等公民，前文已述。但标准库一直在尝试“曲线救国”，逐步给引用补上缺失的能力。

### `std::reference_wrapper`：第一次赋予“值语义”

C++11 引入了 `std::reference_wrapper<T>`。它内部存一个指针，但对外表现得像一个“可以重新绑定、可以拷贝、可以放进容器”的引用。

```cpp
int a = 1, b = 2;
auto ref = std::ref(a);
ref = std::ref(b);                // 重新绑定
std::vector<std::reference_wrapper<int>> vec{ref}; // 可存入容器
```

它给引用补上了三条一等公民的缺失能力：
- **可拷贝/可赋值**：支持重新绑定。
- **可存放于容器**：`vector<reference_wrapper<T>>` 合法。
- **可比较身份**：比较的是内部地址，即是否引用同一对象。

但它有一个局限：**没有“空状态”**。 `reference_wrapper` 的默认构造函数被移除，使用时必须确保它绑定到有效对象。

### `std::optional<T&>`：第二次进化，带来可空性与 monadic 操作

`std::optional<T&>` 在 `reference_wrapper` 的基础上，补上了**显式的空状态**，并且引入了 **monadic 方法**（`and_then`、`transform`、`or_else`）。

| 能力 | `T&` | `reference_wrapper` | `optional<T&>` |
| :--- | :--- | :--- | :--- |
| 不拥有对象 | ✅ | ✅ | ✅ |
| 可重新绑定 | ❌ | ✅ | ✅ |
| 可存入容器 | ❌ | ✅ | ✅ |
| 可比较身份 | ❌ | ✅ | ✅ |
| **可空（nullable）** | ❌ | ❌ | ✅ |
| **monadic 方法** | ❌ | ❌ | ✅ |

**monadic 方法的价值**：当有一连串可能失败的操作时，传统写法会层层 `if` 嵌套，难以阅读和维护。monadic 方法将这些检查链式化：

```cpp
// 传统嵌套 if
if (auto user = findUser(42)) {
    if (auto order = getLastOrder(*user)) {
        if (auto discount = getDiscount(*order)) {
            applyDiscount(*discount);
        }
    }
}

// monadic 链式调用
findUser(42)
    .and_then(getLastOrder)   // 返回 optional<Order&>
    .and_then(getDiscount)    // 返回 optional<Discount&>
    .and_then(applyDiscount); // 短路：任何一步为空则停止
```

`and_then` 只在 `optional` 有值时调用函数，否则直接传递空值；`transform` 用于映射值（自动包装）；`or_else` 用于处理空状态（如打日志）。这些方法让代码线性化、可组合，且不会拷贝被引用的对象。

注意：`optional<T&>` 的 `and_then` 只有单个 `const` 重载（不像主模板有四个值类别重载），因为引用不应被移动。

### 进化仍未完成

虽然 `optional<T&>` 让引用在“库层面”接近了一等公民，但语言层面依然存在根本限制：
- 不能声明 `int&` 的数组。
- 不能有 `int&` 的指针（`int&*` 非法）。
- 不能在运行时动态创建 `int&`（`new int&` 非法）。

目前的标准库方案中，`reference_wrapper` + `optional<T&>` 已在实用性与语言稳定性之间找到平衡。它们不是让引用本身变成一等公民，而是提供了“可以像值一样使用的引用替代品”。`optional<T&>` 在 `reference_wrapper` 的基础上，补上了可空性和 monadic 操作，让开发者可以用统一、安全的方式表达“可选的、可重新绑定的、不拥有所有权的引用”。

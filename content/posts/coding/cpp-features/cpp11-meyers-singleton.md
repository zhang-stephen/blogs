---
date: '2023-12-01T09:36:00'
draft: false
title: C++11：使用Meyers Singleton的一些思考
slug: '1e1f6c71'
authors: [Stephen]
summary: Meyers Singleton
tags:
    - cpp11
    - ISO
categories:
    - C++
series:
    - C++ Features
series_weight: 1101
---

## 关于C++中Meyers Singleton的若干思考

最近在工作中看到了一个单例类的使用，该部分代码大致如下：

```cpp
class A : public Singleton<A>
{
public:
    A()
    {
        if (gcond)
        {
            // do something...
        }
        else
        {
            // do something else without gcond...
        }
    }
};
```

其中，`Singleton<T>`是一个典型的带有CRTP特性的Meyers Singleton，它的基本实现如下：

```cpp
template <typename T>
class Singleton
{
public:
    static T& instance()
    {
        static T singleton;
        return singleton;
    }

protected:
    Singleton() = default;
    virtual ~Singleton() = default;

    Singleton(const Singleton&) = delete;
    Singleton(Singleton&&) = delete;
    Singleton& operator=(const Singleton&) = delete;
    Singleton& operator=(Singleton&&) = delete;
};
```

于是，就有几个问题无中生有了起来。

## Q1：`class A` 的构造时机与 `gcond` 的依赖问题

**问题**：在 `class A` 的默认构造函数中，`gcond` 是一个运行时才能确定的条件，那么 `class A` 在何时构造？这决定了 `gcond` 是否按预期行为生效。

**解答**：

`Singleton<T>::instance()` 采用 **Meyers Singleton** 模式，其核心是 **函数局部静态变量**。C++11 标准保证了：当控制流第一次经过 `static T singleton;` 语句时，该变量被初始化（构造），并且该初始化是 **线程安全** 的。

因此，`class A` 的构造时机是 **第一次调用 `A::instance()` 的时刻**。这个时刻通常发生在程序运行过程中的某个不确定点，例如：

- 在 `main()` 函数启动后的某个函数调用中；
- 或者在某个全局对象的构造函数中（若存在静态初始化顺序问题，可能导致未定义行为）。

**关键后果**：`gcond` 的值取决于调用 `A::instance()` 时的运行时状态。如果 `gcond` 在程序启动后还会发生变化（例如由用户输入、配置文件加载、网络消息等改变），那么 `A` 的构造行为就 **锁定** 在第一次调用时的 `gcond` 值。后续即便 `gcond` 改变，已经构造好的 `A` 单例对象也不会重新执行构造函数，因此其内部行为将保持与初始 `gcond` 一致。

**潜在 Bug 示例**：

```cpp
// 假设 gcond 初始为 false
bool gcond = false;

int main() {
    auto& a = A::instance();   // 此时 gcond == false，走 else 分支
    gcond = true;              // 稍后条件改变
    // 但 A 对象内部已经按照 false 的逻辑初始化，无法响应变化
}
```

**建议**：
- 如果 `gcond` 可能变化，且需要单例行为随之变化，则不应在构造函数中依赖该条件，而应将条件判断移到实际使用的方法中。
- 或者，提供 `reload()` / `update()` 机制，在条件改变时重新初始化单例的内部状态。
- 更根本的设计：**单例对象应当是“无状态”或“状态不可变”的**，避免依赖外部可变全局条件。

## Q2：C++ Core Guidelines I.3 为什么要求避免使用单例？

**原文**：[I.3: Avoid singletons](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#i3-avoid-singletons)

**核心原因**：单例模式本质上是一个 **全局状态** 的包装器，而全局状态会带来以下严重问题：

1. **破坏可测试性**
   单例的全局唯一性使得单元测试之间无法隔离。测试 A 修改了单例的内部状态，测试 B 如果依赖该单例，会看到被污染的状态。即使使用 `delete` 或重置技巧，也容易引入竞态和复杂度。

2. **隐藏依赖关系**
   一个类如果内部调用了 `Singleton<X>::instance()`，它的接口并没有声明这个依赖。阅读代码的人无法一眼看出该类依赖于 `X`，导致理解困难和重构风险。

3. **违反单一职责原则**
   单例类既负责自己的业务逻辑，又负责控制自身的实例化数量（生命周期管理）。职责混杂降低了内聚性。

4. **并发问题**
   虽然 Meyers Singleton 的初始化是线程安全的，但单例 **状态** 的访问通常需要额外的同步机制。开发者容易忘记加锁，导致数据竞争。

5. **静态初始化顺序问题**
   如果某个单例的构造函数依赖另一个全局对象（包括另一个单例），在不同编译单元中，初始化顺序是未定义的，可能引发崩溃（即 [Static Initialization Order Fiasco](https://isocpp.org/wiki/faq/ctors#static-init-order)）。
   **注意**：Meyers Singleton不会因为静态初始化的顺序出现问题，因为它是延迟初始化的。

6. **阻碍依赖注入和接口抽象**
   现代 C++ 推荐使用依赖注入（通过构造函数或 setter 传递依赖），使得组件可替换、可模拟。单例模式则强制代码直接依赖具体类型，无法轻松替换为测试桩（mock）或不同实现。

**笔者的观点**：存在即合理，单例并非洪水猛兽。在 **确实需要全局唯一且不可替换的资源**（如日志系统、硬件寄存器映射、进程级配置）且 **不会成为测试瓶颈** 的少数场景下，可以谨慎使用。但团队应当建立明确规则，禁止滥用；且类型`T`最好能提供`reset()`等恢复初始状态的方法。

## Q3：单例模式到底解决了什么问题？

单例模式的核心意图是 **确保一个类只有一个实例**，并 **提供一个全局访问点**。它解决了以下实际问题：

1. **资源共享与协调**
   例如：打印池、线程池、日志管理器、数据库连接池。多个模块需要共享同一资源池，避免重复创建和资源浪费。

2. **全局配置/状态**
   例如：应用程序设置、环境变量缓存。所有组件需要读取同一份配置，且配置在运行时可能被修改（如用户切换主题）。

3. **硬件或系统资源独占访问**
   例如：串口、文件系统驱动、窗口管理器。物理资源通常只能有一个控制对象。

4. **避免重复开销**
   如果创建对象的代价很高（如加载大词典、建立网络连接），单例可以确保只构造一次，后续复用。

5. **控制实例数量**
   严格来说，单例是“限制为 1 个”，但模式可扩展为“限制为 N 个”（如对象池）。

**与全局变量的区别**：全局变量（`extern` 或静态成员）也能提供全局访问，但无法 **阻止** 创建第二个实例（如通过 `new` 或拷贝构造）。单例模式通过私有构造函数、删除拷贝操作等语言机制，**强制执行唯一性**。同时，单例通常使用 **延迟初始化**（首次使用时构造），避免全局变量的静态初始化顺序问题（虽然 Meyers Singleton 解决了该问题）。

## Q4：Meyers Singleton with CRTP 的改进空间

原始实现：

```cpp
template <typename T>
class Singleton
{
public:
    static T& instance() { static T singleton; return singleton; }
    // ...
};
```

此时如果`T` 具有 **公开的默认构造函数**，那么类型`T`还是可以可以在别处被构造的，例如：https://godbolt.org/z/a6YsTjs31

为了进一步提升封装性，可以把 `T` 的构造函数被设为 `protected`，继而通过一个公开继承了 `T` 的子类来调用 `T::T()` ：

```cpp
template <typename T>
class Singleton
{
private:
    struct Instance : public T
    {
        // inherits CTORs from T
        using T::T;

        // or forward T::T() to Instance()
        // Instance() : T() {}
    };

public:
    static T& instance()
    {
        static Instance inst;
        // return T& to hide Instance
        return inst;
    }

protected:
    // ...
};
```

## 总结

- **Q1**：单例构造时机是首次调用 `instance()`，此时 `gcond` 被快照，后续变化不影响单例内部状态——这是需要警惕的陷阱。
- **Q2**：指南避免单例主要因为全局状态破坏测试、隐藏依赖、引发并发和初始化问题。但合理场景仍可使用。
- **Q3**：单例解决唯一性、全局访问、资源共享、延迟初始化等问题，优于裸全局变量。
- **Q4**：通过内部继承子类 `Instance` 可以强制 `T` 的构造访问控制，提升封装性。

**最终建议**：优先考虑依赖注入、工厂模式或普通全局对象（若确实简单）。当您 **100% 确定** 需要全局唯一且不可替换的资源时，使用改进后的 Meyers Singleton，并在代码注释中明确其设计意图与限制。

## References

- [C++ Core Guidelines I.3](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#i3-avoid-singletons)
- [Meyers Singleton (C++11 thread-safe)](https://stackoverflow.com/questions/1661529/is-meyers-implementation-of-singleton-really-thread-safe)

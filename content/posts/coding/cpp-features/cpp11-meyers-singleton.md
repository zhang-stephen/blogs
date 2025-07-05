---
date: '2023-12-01T09:36:00'
draft: true
title: 使用Meyers' Singleton的一些思考
slug: '1e1f6c71'
authors: [Stephen]
summary: Meyers' Singleton
tags:
    - cpp11
    - ISO
categories:
    - C++
series:
    - C++ Features
---

最近，在工作中看到了一个单例类的使用，该部分代码大致如下：

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
}
```

其中，`Singleton<T>`是一个典型的带有CRTP特性的Meyers' Singleton，它的基本实现如下：

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

    ~Singleton() = default;

protected:
    Singleton() = default;
    Singleton(const Singleton&) = delete;
    Singleton(Singleton&&) = delete;
    Singleton& operator=(const Singleton&) = delete;
    Singleton& operator=(Singleton&&) = delete;
}
```

于是，就有几个问题无中生有了起来。第一个问题是业务逻辑的问题：

- 显然，在`class A`的默认构造函数中，`cond1`是一个在运行时才能确定的条件，那么`class A`在何时进行构造？这是`cond1`是否可以按预期行为获取的关键。

其次，是对单例模式的一些其他思考：

- [C++ Core Guidelines I.3](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#i3-avoid-singletons) 明确要求避免使用单例，为什么？
- 单例模式到底解决了什么问题？
- 上述的Meyers' Singleton with CRTP还有什么改进的空间？

### Q1: `class A`的构造时机

显然，`class A`的构造时机是在首次调用`Singleton<T>::instance()`时。

在第一段代码中，当`A`的实例被创建后，如果全局条件`gcond`发生变化，那么`A`的行为不会发生变化，依然保持在条件变化之前。这样就造成了潜在的bug，也是笔者想要写博客的主要目的。

### Q2: 为什么要避免使用单例？

这个问题相对来说比较复杂…… 在单例模式的使用问题上，一直存在着“合理使用V.S.完全禁用”的争论。笔者的观点则是存在即合理，所以应当合理使用单例，而且应当杜绝滥用。

单例模式是对系统中某些资源访问权限的抽象。

### Q3: 单例模式解决的问题

### Q4: 一点小小的改进


### References

1.

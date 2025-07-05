---
date: '2024-04-24T00:45:24+08:00'
draft: false
title: 'C++20：泛型lambda表达式'
slug: 'bb142767'
authors:
    - Stephen
summary: '泛型lambda表达式，用起来有点小纠结……'
series:
    - C++ Features
tags:
    - cpp20
    - ISO
categories:
    - C++
---

## Preface

最近在工作中，遇到一个需求，要读取某个硬件加速器的一系列计数寄存器，以确定网络通信的状态。这一系列寄存器有类似的定义：

```cpp
union reg {
    uint64_t u;
    struct reg_s {
        uint64_t stat : 48; //!< statistics
        uint64_t      : 16; //!< reserved
    }s;
};
```

同时，芯片厂商提供的驱动库中提供了一个同名但全大写的API，用于确定寄存器的地址：

```cpp
uint64_t REG(const uint64_t abId); // ab: acclerating block
```

由于寄存器的地址空间不受kernel管理，因此还提供了一个通用的，读取寄存器的API：

```cpp
uint64_t read_reg64(const uint64_t regAddr);
```

一般情况下，针对单个寄存器的读取操作，可能最符合直觉的写法应该就是这样了：

```cpp
void dumpAbStatRegs(const uint64_t abId)
{
    auto r = reg({.u = 0});
    r.u = read_reg64(REG(abId));
    // ...
}
```

但是，这一系列寄存器有十几二十几个，难道我要把这段代码复制N次？这也太不符合我的风格了，于是自然而然想到了封装。读取寄存器的操作遵循一个非常固定的模式，在这个模式中，只有寄存器类型`reg`和寄存器寻址API`REG`会发生变化。那么，能使用lambda来完成这件事情吗？

## 泛型lambda表达式

泛型lambda是C++20引入的一个新特性，一个基本的泛型lambda的声明如下：

```cpp
auto lambda = [captures] <template_params> (params) -> trailing_type
{
    // body
};
```

和普通的lambda表达式相比，泛型lambda只是在捕获列表和形参列表之间插入了一个模板形参列表。该模板形参列表除了没有使用`template`关键字之外，与普通形式的模板形参没有区别，也可以接受`concept`作为了类型约束。上述的声明等价于：

```cpp
struct anonymous
{
    template<template_params>
    auto operator() (params) -> trailing_types
    {
        // body
    }
} lambda;
```

### 尝试解决上述问题

了解到这个特性以后，我立刻使用泛型lambda写了第一版实现（含一个类型约束）：

```cpp
template <typename Reg>
concept StatReg = requires (Reg r)
{
    std::is_union_v<Reg>;                       // Reg should be union
    r.u;                                        // there should be a member named as `u` in Reg
    std::is_same_v<decltype(r.u), uint64_t>;    // type of `r.u` should be u64
    r.s.stat;                                   // there should be a structure member, and
                                                    // 1. it is named as `s`
                                                    // 2. there should be a member named as `stat` in `s`
};


// in function dumpAbStatRegs()
auto readStatReg = [=]<StatReg R, std::function<uint64_t(const uint64_t)> RF>()
{
    auto r = R({.u = 0});
    r.u = read_reg64(RF(abId)); // abId is captured
    return r.s.stat;            // return this field for logging
}

auto r1 = readStatReg<reg1, REG1>(); // ERROR!
```

显然，我打算把寄存器类型和寻址API直接通过模板形参进行传递。但是，这个实现有两个比较麻烦的问题需要解决。

#### 问题1：模板形参推导

先考虑一个比较简单的泛型lambda：

```cpp
auto foo = []<typename T>(const T& t)
{
    return t;
}

auto rt = foo(1u); // T would be deduced as unsigned integer, u8, u16, u32 or others
```

这个例子过于简单，但是反映了C++模板一个重要的特性，模板参数推导。得益于这个特性，我们在使用泛型API时，不一定要显式声明入参的类型，从而简化代码。

但是`readStatReg`并没有入参，因此调用它时必须显式声明模板参数。这时候另一个问题暴露出来了，考虑到泛型lambda的等价形式，`readStatReg`的类型并非一个模板，而它的成员函数`operator()`才是模板！因此，对它的调用应该写作：

```cpp
auto r1 = readStatReg.template operator()<reg1, REG1>();
```

可以看到，第一版实现中调用完全搞错了模板实例化的位置！不过说真的，与其这样使用泛型lambda，还不如单独实现一个独立的函数模板，起码可读性要好一些……

#### 问题2：`std::function`不能作为模板的非类型参数

这个问题与泛型lambda无关，但是值得一提。即`std::function`并非`constexpr`对象，因为它可以处理多种不同的可调用对象，在传入带捕获的lambda时，它的构造过程不可避免地要动态分配内存。

基于以上原因，模板形参列表中的非类型参数`RF`的声明是非法的，即便我的本意是想传入一个简单的全局函数。解决方法也很简单，直接使用函数指针类型替代`std::function`即可。

## Reference

1. [cppreference - lambda表达式](https://zh.cppreference.com/w/cpp/language/lambda)
2. [Stack Overflow - How to provide template arguments to a lambda with a call operator template?](https://stackoverflow.com/questions/50713214/how-to-provide-template-arguments-to-a-lambda-with-a-call-operator-template)

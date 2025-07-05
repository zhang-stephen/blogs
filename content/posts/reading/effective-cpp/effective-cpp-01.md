---
date: '2024-04-04T23:26:25+08:00'
draft: false
title: 'Effective C++ Part I: Accustoming Yourself to C++'
slug: 'd059cc46'
authors:
    - Stephen
summary: '《Effective C++》迟到的读书笔记～'
series: [Effective C++]
tags:
    - cpp11
    - cpp14
    - cpp17
    - cpp20
    - cpp23
    - cpp2b
    - reading
categories:
    - shorthands
    - C++
---

## Preface

早在2022年，笔者就在工作的基础上阅读学习*Effective C+\+*，也想正经八百地写几篇博客，做一点简单的总结，奈何懒癌晚期，最近终于决定把这事提上日程，慢慢开始写吧。

回到*Effective C\+\+*，这本经典C\++书籍出版时，C++11标准尚未发布，而笔者日常工作中却在使用C\+\+20[^1]标准，因此读书笔记中会有一部分提及在新旧标准的差异，至多覆盖到C\++2b（C\++26草案），以及在新标准下的最佳实践。

[^1]: 工作环境的编译器版本为GCC 11.3.0，因此C++20的语核全部可用，但是STL部分特性暂不支持，例如`constexpr vector`等。

## Item 1: 将C++视作语言联邦

Item 1要表达的意思其实是国内很多C++教材开篇提到过的，C\+\+可以实现多种编程范式[^2]，例如C-Style的面向过程、OOP（C with Class）、模板以及STL。当然在实际应用中，我们总是会不可避免地混合使用这些范式，只要牢牢记住这条原则，其实C\+\+也不会很复杂，因为只需要考虑对应的范式遇到的问题。

[^2]: 不同教材的划分可能不太一样，例如笔者记忆中就是面向过程、面向对象、函数式编程等等。

## Item 2: 优先使用`enum`、`const`以及`inline`，而不是`#define`

### 常量声明

使用`enum`、`const`等关键字声明常量主要带来以下提升：
- 更严格的类型检查，确保计算不会发生错误
- 常量，或者说常值变量，受到作用域的约束，不会污染其他作用域

值得一提的是，类内的整数类型静态常量是声明而非定义。例如：

```c++
class GamePlayer
{
private:
    static const int numOfTurns = 5; // declaration, not definition
};
```

对`numOfTurns`取地址是非法的，除非为其添加定义，由于它的声明中已经赋过初值，因此定义中不可以再次赋值：

```c++
const int GamePlayer:: numOfTurns; // do not assign
```

也可以使用`enum`代替静态常量成员，这种方法被称作**enum hack**。例如：

```c++
class GamePlayer
{
private:
    enum
    {
        numOfTurns = 5,
    };
};
```

由于`enum`的特性[^3]，`numOfTurns`的行为类似于`#define`，它不会被分配内存，即不可以被取地址，同时又是常量。更重要的是，它的作用域仅限于这个类内部。因此，这种写法曾被广泛使用。但是，C++11标准引入`constexpr`关键字，即编译期的常量表达式后，这种写法的必要性似乎就下降很多了。

[^3]: 枚举类型作为类成员时，它的各项枚举值对所属类是可见的，与该枚举类型是否匿名无关。

### 使用`inline`代替宏函数

我们一般把可以接受参数的宏称为宏函数，但是它并不是函数，不参与编译。使用宏函数的时候，它的参数在替换文本中**应当**被`()`包围，以保证不会因为运算符的优先级等出错。

即便如此，宏函数的使用也可能因为传入的参数是一个表达式而引入潜在的bug。例如：

```c++
#define CALL_WITH_THE_MAX(a, b) (f((a) > (b) ? (a) : (b)))

// FIXME: WRONG Invoking
CALL_WITH_THE_MAX(++a, b);
```

上例中，对宏`CALL_WITH_THE_MAX`的调用将会被展开为（去除了多余的括号）如下的样子。显然在`a`和`b`不同的取值时，表达式`++a`的执行次数是不确定的，由此可能会引入一些bug。

```c++
f((++a) > b ? (++a) : b);
```

针对这个例子，可以使用`inline`函数解决这个问题：

```c++
template <typename T>
inline void callWithMax(const T& a, const T& b)
{
    f(a > b ? a : b); // we assume that function could accept constant reference
}
```

*吐槽*：其实这里完全可以不使用`inline`关键字的，因为`#define`最大的特点不是文本替换后的行为类似内联函数，而是它完全无视参数的类型，因此泛型才应该是这一小节讨论的重点。

### C++11起: 优先使用`constexpr`

C++11标准新增了`constexpr`关键字，用于声明编译期常量表达式。`constexpr`几乎可以出现在任何位置，而且它隐式地包含了`inline`声明，因此[常量声明](#常量声明)中的例子可以这样写：

```c++
// GamePlayer.hpp
constexpr size_t maxNumOfPlayers = 16; // OK, it's implied as inline

class GamePlayer
{
private:
    static constexpr int numOfTurns = 5;
};
```

但是要注意的是，`constexpr`声明的表达式将会在编译期对其进行求值，因此它在运行时是不可以取地址的。

## Item 3: 尽可能使用`const`关键字

### `const`关键字修饰的目标

对于简单类型，`const`关键字的意思非常明晰，即该类型实例不可变；但是对于复合类型，例如指针、原生数组（严格来说原生数组其实就是指针的语法糖）以及引用，该关键字的作用则有必要进行讨论。

以指针为例，这里有一个简单的例子：

```c++
int arr[16] = {0xFF}; // the data

// --------------------------   const data? | const pointer?
int* p1 = arr;              //        N     |       N
const int* p2 = arr;        //        Y     |       N
int* const p3 = arr;        //        N     |       Y
const int* const p4 = arr;  //        Y     |       Y
```

可以通过`const`关键字出现的位置来判断是指针自身不可变，还是指针指向的数据不可变：当`const`关键字出现在`*`左侧时，数据不可变，反之指针不可变。这一规则也适用于向函数传递指针作为参数时。在*C++ Primer*中，数据不可变的时称为底层`const`，指针不可变则相应的称为顶层`const`。

对于引用和原生数组，在它们的声明中可以看做隐含了顶层`const`——引用不能重新绑定，而数组也不可以直接进行赋值，除非数组用于传参而退化为指针类型。

### 迭代器中的`const`

STL对大部分容器提供了迭代器（Iterator）机制，用于统一访问容器内元素的方法，行为类似于指针。迭代器也被看作是STL的六大组件之一（其他分别为容器、算法、适配器、仿函数以及分配器）。

在STL中，存在两种不同的迭代器，对应上一小节提到的`const`修饰位置不同的指针。

```cpp
auto v = std::vector<int>(64);

// -------------------------- const iter ? | const data ?
const auto iter = v.begin();  //   Y       |      N
auto const_iter = v.cbegin(); //   N       |      Y
```

由于迭代器是独立的类型，因此它的底层`const`隐含在迭代器的定义中，即无法通过关键字的位置区分迭代器是否为`const iterator`。但是获取迭代器的方法为我们做出了区分，如上。

### `const`成员方法

`const`成员方法是指那些在方法尾部声明`const`限定的方法。这些方法中传入的`this`指针隐含底层`const`，因此不能在它们内部修改类成员的值。

```cpp
class TextBlock
{
private:
    char* storage;
public:
    auto* getRawStorage() const
    {
        // return storage++; // ERROR! cannot modify the members
        return storage;      // OK, it's read-only
    }
};
```

BTW，将函数的返回类型添加`const`限定可以防止某些情况下对右值赋值的错误，但是当函数返回值类型时，这样可能无法享受到右值引用的全部好处[^4]。

[^4]: [StackOverflow: Purpose of returning by const value?](https://stackoverflow.com/a/8716406)

#### 两种不变性（constness）

一般情况下，`const`关键字所能提供的不变性称为Bitwise Constness，它能保证对象的每一个bit都是不可变的。但是这种不可变性在面临实际业务时却可能会存在一些缺陷，想象一下，某个类持有一种系统资源，我们在访问资源后都要对它的状态进行维护——即所谓的句柄类（handlers）。

由于句柄类是通过某种方式，例如文件描述符，持有系统资源（而不是真的拥有那些资源），因此为安全考虑，可能会把某些成员方法声明为`const`方法，此时无法对类内表示状态的成员进行修改——`const`关键字提供了非常好的Bitwise Constness!

```c++
class SocketWrapper
{
private:
    int sockfd;
    bool connected;

public:
    void read(uint8_t* buffer, size_t len) const
    {
        if (connected)
        {
            // do some operation to read buffers
        }
        else
        {
            connected = false;  // ERROR! cannot modify class member!
        }
    }
};
```

上面这段代码示例就很好的展现了Bitwise Constness和状态维护的矛盾问题。对于这样的仅期待部分成员不可变的不变性，称为Logical Constness，它并不要求对象中的每一个bit都保持不变，而是仅要求“重要”的成员保持不变。

`read()`方法虽然声明为`const`，但是它的行为并没有那么符合要求，因此在这种场景下，可以将要被修改的成员声明为`mutable`以解决问题。从而这个类也就符合Logical Constness了。

当然这个例子举得不十分恰当，还是参考原书中的例子为好。

### 消除`const/non-const`方法的重复代码

这里直接使用原书中的示例。

```c++
class TextBlock
{
public:
    const char& operator[](std::size_t position) const
    {
        // do bounds checking ...
        // log access data ...
        // verify data integrity
        return text[position];
    }

    char& operator[](std::size_t position)
    {
        // do bounds checking ...
        // log access data ...
        // verify data integrity
        return text[position];
    }

private:
    std::string text;
};
```

显然不同的`operator[]`中存在着大量的重复代码，我们的目的就是为了减少这些重复代码以提升可维护性。而解决方法也很简单，使某个版本的`operator[]`调用另一个即可，代码示例如下。

```c++
char& TextBlock::operator[](std::size_t position)
{
    return const_cast<char&>(
        static_cast<const TextBlock&>(*this)[position]
    );
}
```

这里使用了两层转换，内层的`static_cast`是为了将`*this`转换为constant reference，以便函数重载决议时，匹配到`const`成员方法；外层的`const_cast`则是为了去掉返回值的`const`限定，使返回的数据类型相匹配。

但是问题是，为什么是non-const版本调用const版本？

`const`方法承诺不会修改成员变量。因此在`const`成员方法中调用普通的成员方法，有可能导致数据成员被修改，从而违反`const`限定——永远不要在`const`成员方法中调用普通方法，这不局限于此处消除重复代码的示例，而是适用于任何时候。

## Item 4: 确保对象在使用前被初始化

对于内置类型，可以手动初始化它们。

### 优先使用成员初始化列表

C++在执行构造函数之前，会先对类成员进行初始化，如果没有指定成员初始化列表，则调用成员的默认构造函数。此时在构造函数内对成员初始化只能是以赋值的形式进行。

而指定了初始化列表的情况下，当类成员在执行构造函数前都进行了初始化后，相比上一种情况将会省下调用默认构造的开销。具体示例见书中提供的代码。

### 避免静态非局部变量之间跨编译单元引用

C++不保证静态非局部变量的初始化顺序，因此要**避免**在静态非局部变量跨编译单元引用其他的静态非局部变量；但是静态局部变量的初始化顺序是确知的，即控制流首次经过其声明时进行初始化。因此在需要跨编译单元引用静态非局部变量时，可以考虑修改设计，使用一个返回该类型引用的函数以保证它被引用时被正确地初始化过了。

这样的一个函数示例如下：

```cpp
T& getInstance()
{
    static T inst; // it would be initialized when the function invoked for the first time
    return inst;
}
```

关于静态局部变量初始化顺序的解释见[这里](https://zh.cppreference.com/w/cpp/language/storage_duration#.E9.9D.99.E6.80.81.E5.B1.80.E9.83.A8.E5.8F.98.E9.87.8F)；更多示例见原书。

## References

1. *Effective C++*, Scott Meyers, 2008
2. [C++ Reference Online](https://en.cppreference.com/w/cpp)

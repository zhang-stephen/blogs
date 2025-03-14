---
date: '2025-03-02T13:09:16Z'
draft: false
title: Markdown语法测试 - Hugo Goldmark
slug: '1432755858'
summary: "测试一下goldmark对markdown语法的覆盖程度"
authors:
    - Stephen
tags:
    - hugo
    - markdown
categories:
    - blogs
---

## Preface

本文是第一篇使用[Hugo](https://gohugo.io)框架渲染的博文，虽然本博客只服务于NSN内网，甚至仅服务于我自己，但是我还是选择博客这一表现形式——因为HTML页面的表现能力是远胜于单独的markdown的。

原本我的[个人博客](https://blogs.stephen-zhang.cn)是基于[Hexo](https://hexo.io)框架的，但是该框架并不便于在NSN内网使用：
- 依赖于Node.js，该框架在内网环境下安装不方便
- 它的markdown渲染配置较为复杂，主要依赖markdown-it及其插件，不够稳定
- 速度太慢，远不及Hugo

具体的关于两种框架的分析，也许后面我会单独写一篇文来对比，不过个人博客暂无迁移计划。本文是[Goldmark](https://github.com/yuin/goldmark/)及其扩展[hugo-goldmark-extensions](https://github.com/gohugoio/hugo-goldmark-extensions)的markdown语法（含扩展语法）的测试。

考虑到未来的需求，此处的配置应该尽量和Hexo框架的配置兼容，以消除可能的迁移成本。

_注意：非CommonMark标准的语法将会单独注明。_

## 行内元素

### 行内代码

行内代码使用反引号，即`` ` ``包裹，例如：

```markdown
这是一个行内代码示例：`rm -rf build/*`。
```
这是一个行内代码示例：`rm -rf build/*`。

如果行内代码块中存在反引号，那么可以使用两个反引号包裹它，例如：

```markdown
这是一个反引号：`` ` ``。
```
这是一个反引号：`` ` ``。

### 强调

#### 标准的强调元素

CommonMark支持的强调语法只适用于行内元素，主要有：
- 加粗：以``**``或者`__`包裹
- 斜体：以`_`或者`*`包裹

具体的示例如下：

```markdown
**bold**, __bold__
_italic_, *italic*
```
它们将会被渲染为：
**bold**, __bold__
_italic_, *italic*

*注意：推荐使用`**`或者`*`，`_`或者`__`在和CJK语言[^1]共同使用时有一定概率无法识别。*

[^1]: CJK语言：指Chinese，Japanese以及Korean，即东亚地区的主要非ASCII语种。

#### 扩展的强调元素

扩展的强调元素主要有三种，它们也可以同时使用，以及和上一节的标准强调语法同时使用。例如：

```markdown
==mark==, ++underline++, ~~strikethrough~~
==++**_~~mark, underline, bold, italic, deleted~~_**++==
```
它们会被渲染为：
==mark==, ++underline++, ~~strikethrough~~
==++**_~~mark, underline, bold, italic, deleted~~_**++==

### 上标和下标

上标和下标是一种常用的扩展语法，其中，上标的内容使用`^`包裹，而下标的内容则使用`~`包裹。例如：

```markdown
29^th^, H~2~O
```

它们将会被渲染为：
29^th^, H~2~O

*注意：此处下标的渲染是错误的，一般如果需要使用上标和下标的场景，建议使用$\LaTeX$代替。*

### 链接

markdown支持三种插入链接的方式：
- 自动链接：URL以`<>`包裹，是GFM扩展语法之一
- 普通链接（最常用）
- 引用式链接

它们的示例如下：

```markdown
[gh]: https://github.com （这里是引用链接的label定义）
这是一个自动链接：<https://github.com>
这是一个普通链接：[github](https://github.com)
引用链接需要先定义一个label，然后引用它：[github][gh]
```

[gh]: https://github.com
这是一个自动链接：<https://github.com>
这是一个普通链接：[github](https://github.com)
引用链接需要先定义一个label，然后引用它：[github][gh]

### HTML标签

可以直接在markdown文本中插入HTML标签，例如：

```markdown
行内代码使用反引号，即<code>`</code>包裹。
```

它将被渲染为：
行内代码使用反引号，即<code>`</code>包裹。

*注意：在goldmark渲染器中，需要将`markup.goldmark.renderer.unsafe`置为`true`，否则将会产生渲染时警告。*

*注意：markdown也支持使用HTML标签渲染区块元素，例如`<p></p>`等，下文不再赘述。*

### 转义字符

`\`在markdown中同样作为转义字符使用。例如：

```markdown {hl_lines=[2]}
这里的*不会被视为有效的markdown元素，而是作为文本的一部分，旁边的*也是。
这里的\*不会被视为有效的markdown元素，而是作为文本的一部分，旁边的*也是。
```

它们分别被渲染为（注意看第二行，两个`*`之间的内容没有被渲染为斜体）：
这里的*不会被视为有效的markdown元素，而是作为文本的一部分，旁边的*也是。
这里的\*不会被视为有效的markdown元素，而是作为文本的一部分，旁边的*也是。

## 区块元素

### 段落和换行

在markdown中，段落由空行隔开，例如：
```markdown
Paragraph 1

Paragraph 2
```

在markdown中，单个的换行符`\n`在渲染时不会被渲染为`<br>`,而是空格` `，这个特性在英文中无伤大雅，但是非常不符合东亚地区，尤其是汉字的习惯。这种换行符在markdown中被称为软换行符，例如：

```markdown
line1
line2
```
它应该被渲染为：

```markdown
line1 line2
```

相应地，可以被渲染为`<br>`的换行符被称为硬换行符：

- 行尾的两个及以上连续空格，基本所有的markdown渲染器都支持
- 行尾的`<br>`标签，基本所有的markdown渲染器都支持
- 行尾的反斜线`\`，CommonMark支持此种规范，但是并不通用


幸运的是，goldmark支持将软换行符渲染为`<br>`标签，只需将设置中的`markup.goldmark.renderer.hardWraps`置为`true`即可。*这个设置项难道不应该叫做`softWraps`么？*

### 标题

markdown共支持六级标题，它们以`#`开头，以`#`的数量确定级别：

```markdown
# H1
## H2
### H3
#### H4
##### H5
###### H6
```
这里仅使用H2-H5作为各小节的heading。渲染结果略。

### 块引用

块引用所在的行以`>`开头。

```markdown
> quota 1
```
它将会被渲染为：
> quota 1

#### GFM styled alerts

GFM对块引用做了一定的扩展，符合下列语法的内容将会被渲染为Alert Block：

```markdown
> [!<level>] <title>
> <alerts>
```

其中，实际的警告内容`alerts`可以有多行；`title`可以省略，省略则显示默认的标题；`level`必须是以下其中之一，不区分大小写，其严重程度自上而下递增：

- NOTE
- TIP
- IMPORTANT
- WARNING
- CAUTION

例如：

```markdown
> [!TIP] 一点提示
> 必须遵守以下操作步骤：
> ...
```

> [!TIP] 一点提示
> 必须遵守以下操作步骤：
> ...

*注意：目前goldmark对GFM styled alert的支持较依赖于主题自身。*

### 列表

#### 有序列表

有序列表的每一项的行首由**任意非负整数**和`.`构成，数字是否连续对列表的顺序无影响。

```markdown
1. Item 1
3. Item 2
2. Item 3
```

它们将会被渲染为：


1. Item 1
3. Item 2
2. Item 3


#### 无序列表

无序列表的每一项的行首可以是`+-*`的任意一个，例如：

```markdown
+ Item
- Item
* Item
```

它们将会被渲染为：

+ Item
- Item
* Item

### 代码块

在markdown中有两种方式确定代码块：
- 缩进代码块：即代码块的每一行都带有四个空格长度的缩进（不推荐）
- 围栏代码块，即使用多个反引号所在的行包裹代码块

围栏代码块的两侧包含的反引号数量必须相同，且如果需要在代码块中嵌套代码块时，外围反引号的数量要多于内侧，例如下面的例子，外侧使用了<code>````</code>。

````markdown
```python
import sys

print(f"amout of received argurments: {len(argv) - 1}")
```
````
它将会被渲染为：
```python
import sys

print(f"amout of received argurments: {len(argv) - 1}")
```

除了使用` ``` `包裹代码块之外，也可以使用`~~~`。

### 插入图片

插入图片的形式和普通链接类似，只是在`[]`之前多了一个`!`：

```markdown
<!-- ![<alt text>](<url of image>) -->
![Barret M82A1 and butterfly](https://s2.loli.net/2022/07/18/VFpG9qvoQMydhDi.jpg)
```
它将被渲染为：
![Barret M82A1 and butterfly](https://s2.loli.net/2022/07/18/VFpG9qvoQMydhDi.jpg)

如果图片的URL无效，则会在图像的显示区域显示`alt text`。例如：

![Barret M82A1 and butterfly]()

### 分割线

类似无序列表，`_-*`其一重复三次及以上即构成分割线，渲染示例如下（`---`）：。

---

*注意：分割线所在的行不能出现除了换行以外其他的字符，而且最好前后都放置一个空行。*

### 表格

表格是GFM (Github Flavoured markdown)扩展语法之一，它遵循这样的格式:

- 各列之间使用`|`隔开
- 首行作为表头，渲染时将会加粗或者使用其他方法强调
- 第二行作为对齐说明符，`---`不可省略，`:`出现的位置决定了对齐的方向，如果没有`:`则默认左对齐
- 第三行作为列表的内容，和首行共享一样的格式，可以重复出现

一个基本的例子如下，更多复杂的示例请查阅GFM specs：

```markdown
Left | Center | Right
:--- | :---:  | ---:
cell #0 | cell #1 | cell #2
```
它将被渲染为一个表格：
Left | Center | Right
:--- | :---:  | ---:
cell #0 | cell #1 | cell #2

### 复选框/任务列表

复选框/任务列表（checklists）也是GFM扩展之一：

```markdown
- [ ] ongoing task
- [x] finished task
```

它们将会被渲染为：
- [ ] ongoing task
- [x] finished task

### 数学公式

markdown中的数学公式一般指对$\LaTeX$的基础支持。常用于实现该基础支持的模块主要是[MathJax](https://docs.mathjax.org/en/latest/web/start.html)和[KaTeX](https://katex.org/docs/browser.html)。个人更推荐后者。

在markdown中使用数学公式，一般有两种形式：
- 行内公式，LaTeX字符串以`$`包裹
- 块状公式，LaTeX字符串以`$$`包裹，支持诸如`\begin`、`\end`等简单指令

*注意：LaTeX字符串的提示符delimeter可能有不同的形式，请注意查阅渲染器的文档。*

以下是两种情况的示例：

```markdown
这是一个行内公式：$\int C \mathrm dx = \frac 1 2 x^2 + C$。
斯托克斯（Strokes）公式可以表示为：

$$
\begin{equation}
    \begin{split}
        \oiint_L P \mathrm dx + Q \mathrm dy + R \mathrm dz
        &= \iint_\Sigma \begin{vmatrix}
            \mathrm dy \mathrm dz &\mathrm dz \mathrm dx & \mathrm dx \mathrm dy \\
            \frac \partial {\partial x} & \frac \partial {\partial y} & \frac \partial {\partial z} \\
            P & Q & R
        \end{vmatrix} \\
        &=\iint_\Sigma \begin{vmatrix}
            \cos \alpha & \cos \beta & \cos \gamma \\
            \frac \partial {\partial x} & \frac \partial {\partial y} & \frac \partial {\partial z} \\
            P & Q & R
        \end{vmatrix} \mathrm dS
    \end{split}
\end{equation} \tag{6-3}
$$
```

它们将会被渲染为：
这是一个行内公式：$\int C \mathrm dx = \frac 1 2 x^2 + C$。
斯托克斯（Strokes）公式可以表示为：

$$
\begin{equation}
    \begin{split}
        \oiint_L P \mathrm dx + Q \mathrm dy + R \mathrm dz
        &= \iint_\Sigma \begin{vmatrix}
            \mathrm dy \mathrm dz &\mathrm dz \mathrm dx & \mathrm dx \mathrm dy \\
            \frac \partial {\partial x} & \frac \partial {\partial y} & \frac \partial {\partial z} \\
            P & Q & R
        \end{vmatrix} \\
        &=\iint_\Sigma \begin{vmatrix}
            \cos \alpha & \cos \beta & \cos \gamma \\
            \frac \partial {\partial x} & \frac \partial {\partial y} & \frac \partial {\partial z} \\
            P & Q & R
        \end{vmatrix} \mathrm dS
    \end{split}
\end{equation} \tag{6-3}
$$

### 脚注

脚注也是一种常用的扩展语法，它的基本语法如下：

```markdown
这是一个脚注[^2]。
[^2]: 这是一个脚注。
```

它将被渲染为（脚注本身可以在文章结尾找到，也可点击脚注在行内的上标进行跳转）：
这是一个脚注[^2]。
[^2]: 这是一个脚注。

需要注意的是，很多markdown渲染器对脚注的实现的行为不尽相同，因此最好手动保证脚注使用连续且不重复的序号。而且如果需要做出说明时，应该尽量选择就地说明，相应的，脚注更适合纸质书籍那种页面大小固定的阅读模式，而对web页面这种流式增长的页面，可能会破坏阅读的连续性。

## Reference

1. [CommonMark Specs](https://spec.commonmark.org/)
2. [Configure Markup - Hugo](https://gohugo.io/getting-started/configuration-markup/)
3. [Github Flavoured markdown Specs](https://github.github.com/gfm/)
4. [GFM styled alerts](https://github.com/orgs/community/discussions/16925)

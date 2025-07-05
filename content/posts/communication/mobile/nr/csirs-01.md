---
date: '2021-08-05T23:53:57'
draft: false
title: 'NR协议读书笔记（二）：Channel-State Information Reference Signal'
slug: 'cf382e53'
authors: [Stephen]
summary: CSI-RS的生成与映射过程
tags:
    - NR
    - L1
    - Downlink
    - 3GPP
categories:
    - 5G
series:
    - NR Physical Layer
---

## Preface
在NR中，CSI-RS是UE级别的配置，但是不同的UE可以复用完全相同的CSI-RS配置，只不过每个UE都要独立的重复配置。

此外，CSI-RS占用从3000开始的至多32个天线端口，且引入了CDM（码分复用）的方式，这意味着可以在相同的RE集合可以传输不同的CSI-RS信号，彼此之间通过正交覆盖码区分。

CSI-RS的主要作用是：

+ 获取下行CSI，支持下行链路的自适应及用于下行MIMO的预编码；
+ 下行波束管理
+ 用作TRS，以便UE进行精细的时频跟踪；
+ 无线资源管理测量；
+ 无线链路监视测量；
+ 波束失效检测；
+ 基于信道互易性获取上行信道信息，并用于基于非码本的上行预编码；
+ PDSCH的速率匹配（主要通过zero-powered CSI-RS完成）。

## Generation
CSI-RS序列由此等式生成：
$$
r(m) = \frac{1}{\sqrt 2}(1 - 2 \cdot c(2m)) + j \frac{1}{\sqrt 2}(1 + 2 \cdot c(2m + 1)) \tag{1}
$$

其中，$c(i)$是伪随机码序列，其初值满足：
$$
c_{init} = (2^{10} (N^{slot}_{symb} \cdot n^\mu_{s, f} + l + 1) \cdot (2 n_{ID} + 1) + n_{ID}) mod 2^{31} \tag{2}
$$

式中$l$是当前slot内部的OFDM符号索引，$n^\mu_{s, f}$是radio frame中的slot的序号，$n_{ID}$是由更高层的参数，`scramblingID`或者`sequenceGenerationConfig`下发的。

## RE Mapping

### CDM group
NR中对CSI-RS引入了码分复用（CDM）的概念，一共有四种不同的CDM group。假设记CDM group的大小为$L$，则$L \in \{1, 2, 4, 8 \}$：

cdm-Type | RE in freq domain | RE in time domain | ports per group
:---|:---:|:---:|:---:
`noCDM` | 1 | 1 | 1
`fd-CDM2` | 2 | 1 | 2
`cdm4-FD2-TD2` | 2 | 2 | 4
`cdm8-FD2-TD4` | 2 | 4 | 8

占据相同时频资源[^1]，但是天线端口不同的CSI-RS视为隶属于同一CDM group。

[^1]: 此处是指在一个PRB及一个slot内，详见后文的例子

### 映射过程

#### 在时频资源网格上(单个时隙和单个PRB)

CSI-RS映射到RE $(k, l)_{p, \mu}$的过程中，满足下列公式：

$$
a^{k, l}_{(p, \mu)} = \beta_{CSI-RS} \cdot w_f(k') \cdot w_t(l') \cdot r_{l, n_{s, f}}(m') \tag{3}
$$

其中：
1. $a^{k, l}_{(p, \mu)}$是映射到$(k, l)_{p, \mu}$的上的，序列$r$的值，$m'$是对应的索引， 满足：

    $$
    m' = \lfloor n \alpha \rfloor + k' + \lfloor \frac{\overline{k} \rho}{N^{RB}_{sc}} \rfloor \tag{4}
    $$

2. 等式$(4)$中，$\rho$是CSI-RS信号的密度，它和$\alpha$满足下式，$X$是CSI-RS的天线端口数量：

    $$
    \alpha = \begin{cases}
    \rho, X = 1 \\
    2\rho, X > 1
    \end{cases} \text{ where } \rho \in \{ \frac{1}{2}, 1, 3 \} \tag{5}
    $$

2. $\beta_{CSI-RS}$是一个系数，对于非零功率的CSI-RS而言，其值大于零；
3. $k', l'$是用于CSI-RS序列的正交覆盖码（OCC）的索引，也是相对起始位置的偏移，满足：

    $$
    \begin{cases}
    k = nN^{RB}_{sc} + k' + \overline{k} \\
    l = l' + \overline{l}
    \end{cases} \tag{6}
    $$

    这些参数由更高层下发, 其中$(\overline{k}, \overline{l})$是每个CDM group在时频域上的起始位置；
4. $n$是当前slot在radio frame的编号（猜测，待验证）；

先来确定CSI-RS在时域上的位置，上层会下发一个或者两个时域上的起始位置，分别是$l_0 \in \{ 0, 1, \dots, 13 \}$和$l_1 \in \{ 2, 3, \dots, 12\}$（如果有第二个起始位置的话）。那么CSI-RS在时域上的位置集合就是$l \in \{ l_0 + l' \} \cup \{ l_1 + l' \}$。

可以根据`cdm-Type`，天线端口数$X$，以及密度$\rho$查询TS38.211中的*Table 7.4.1.5.3-1: CSI-RS locations within a slot* 获取时域上的偏移$l'$的值的集合。

![Table 7.4.1.5.3-1: CSI-RS locations within a slot](https://s2.loli.net/2022/07/18/qYhHtR8eCV2c6ad.png)

CSI-RS在频域上的起始位置由上层下发的bitmap确定，该bitmap可能是3-bit，4-bit，6-bit，或者12-bit。除了6-bit之外，其他情况均对应这张表里的特定行。$\overline{k}$的取值如下（$i$是1-base的）：

+ [$b_3 \dots b_0$]，$k_{i - 1} =  f(i)$，对应上表中的第一行；
+ [$b_{11} \dots b_0$]，$k_{i - 1} = f(i)$，对应上表中的第二行；
+ [$b_2 \dots b_0$]，$k_{i - 1} = 4f(i)$，对应上表中的第四行；
+ [$b_5 \dots b_0$]，$k_{i - 1} = 2f(i)$，对应上表中的其他所有行。

其中$f(i)$是序列中值为1的bit的序号。

同样，频域上的偏移$k'$也可以查表得到，因此，频域位置就可以确定了，$k \in \bigcup \{ k_{i-1} + k' \}$。$k = 0$的参考点是CRB0的首个子载波。

至此，就得到了CSI-RS信号在某一层的一个slot上占用的RE的位置集合。

#### 在空域上
CSI-RS使用的天线端口从3000开始，最多使用32个端口，因此：
$$
p = 3000 + s + jL \\
j = 0, 1, \dots, X/L - 1 \\
s = 0, 1, \dots, L - 1 \tag{7}
$$

其中$j$是CDM group的大小，即其中的RE数量，$s$是`cdm-Type`对应的$w_f(k'), w_t(l')$的组合的索引值，这些组合见TS38.211的*Table 7.4.1.5.3-2* 到*Table 7.4.1.5.3-5*。这样，利用矩阵的运算，就方便的将CSI-RS信号映射到不同的天线端口上了[^2]。

[^2]: 类似LTE-A中PDSCH的Precoding的过程

### 频域密度
密度指示了CSI-RS信号在频域上的重复的间隔，这个间隔以PRB计算的话，是$\lceil \frac{1}{\rho} \rceil$个PRB。

所以当$\rho = 3$时，CSI-RS信号在频域上每4个RE重复一次；$\rho = 1$时，每个PRB重复一次； $\rho = \frac{1}{2}$时，每两个PRB重复一次。特别地，$\rho = \frac{1}{2}$时，上层会指示CSI-RS所在的PRB number是奇数还是偶数[^3]。

[^3]: 见TS38.214, 5.2.2.3.1

> For density 1/2, the odd/even PRB allocation indicated in density is with respect to the common resource block grid.

## 示例

### 1st example
``` python3
nrofPorts = p1
cdm-Type = 'noCDM'
firstOFDMSymbolInTimeDomain = 4
frequencyDomainAllocation.other = '0100'
desity = 3
```

![example 1](https://s2.loli.net/2022/07/18/fUWvt3PEsLorXbM.png)

### 2nd example
CSI-RS信号可以存在多种不同的结构，例如上表中的row 6和row 7，只有$(\overline{k}, \overline{l})$的区别。

Row 6确定的CSI-RS信号在时域上占用一个OFDM symbol，而在频域上的占用8个subcarrier（每种颜色对应一个CDM group）：

``` python3
nrofPorts = p8
cdm-Type = 'fd-CDM2'
firstOFDMSymbolInTimeDomain = 4
frequencyDomainAllocation.other = '101011'
desity = 1
```

![example 2_0](https://s2.loli.net/2022/07/18/I1rutczjiNUW8GF.png)

而row 7确定的信号在时域上占用两个OFDM符号，在频域上占用4个subcarrier：

``` python3
nrofPorts = p8
cdm-Type = 'fd-CDM2'
firstOFDMSymbolInTimeDomain = 6
firstOFDMSymbolInTimeDomain2 = 7
frequencyDomainAllocation.other = '001010'
desity = 1
```
![example 2_1](https://s2.loli.net/2022/07/18/vPlciIf1ymQ5skY.png)

### 3rd example
以row 3为例，取$\rho = 0.5$：

``` python3
nrofPorts = p2
cdm-Type = 'fd-CDM2'
firstOFDMSymbolInTimeDomain = 1
frequencyDomainAllocation.other = '010000'
desity = 0.5
```
![examplp 3](https://s2.loli.net/2022/07/18/vajom8LTR2nrYez.png)

可以看到它在每两个PRB中只出现一次。

## Reference

1. TS38.211, Physical channels and modulation
2. TS38.214, Physical layer procedures for data
3. [Samsung: improvements of NR](https://www.cambridgewireless.co.uk/media/uploads/files/RadioAI_18.9.18-Samsung-Yinan_Qi.pdf)

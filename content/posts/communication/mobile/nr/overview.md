---
date: '2021-07-30T19:31:25'
draft: false
title: NR协议读书笔记（一）：初见
slug: '84087665'
authors: [Stephen]
summary: 初识NR物理层
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
终于有机会接触到5G NR的开发工作，不过在真正工作之前，要先了解NR的协议到底规定了什么。

## Technical Specifications
对于物理层而言，应该着重阅读的协议主要有：
+ 38.201, Physical Layer; General Description
+ 38.202, Services provided by the physical layer
+ 38.211, Physical channels and modulation
+ 38.212, Multiplexing and channel coding
+ 38.213, Physical layer proceduress for control
+ 38.214, Physical layer procedures for data
+ 38.300, NR; NR and NG-RAN Overall Description

可以在3GPP的网站上找到所有协议的下载链接：[3GPP Specifications Status Report.](https://www.3gpp.org/DynaReport/status-report.htm)

如无特殊说明，NR系列的读书笔记均以Release-16（R16）为准。

## Design Principles
5G NR三大设计原则：

1. Flexibility
即灵活性，NR将支持1-100 GHz的宽阔频谱，支持多种传输方案，例如URLLC、eMBB以及mMTC等；从L1的角度看，

2. Forward-compatiblity

    >Forward compatibility in NR is achieved by self-contained and well-confined transmissions. Self-containment means that data in a slot and a beam is decodable without dependency on other slots and beams. Well-confined transmissions refer to keeping transmissions confined in frequency and time domains to allow future inclusion of new types of transmissions in parallel with legacy transmissions.

3. Ultra-lean
即极简设计，从L1 Resource Grid上看，NR相对LTE而言确实更为简洁，删除了很多always-on（或称最小化always-on）的信号，例如CRS，这有效提高了频带利用率。在L1中，唯一always-on的信号只有SSB。

## Numerology
NR支持不同的Frequency Range(FR，即频率范围)：
+ FR1: $450MHz - 6GHz$, sub-6G
+ FR2: $24.25GHz - 52.6GHz$, mmWave

在频域上，NR支持的子载波频率为$\Delta f=15kHz$的整数倍，其系数可取$\mu \in \lbrace0, 1, 2, 3, 4\rbrace$，它们对循环前缀、数据传输及同步信号的支持如下表：

$\mu$ | $\Delta f = 2^\mu * 15 kHz$ | CP | data transmission | SSB
:---:|:---:|:---:|:---:|:---:
0 | 15 | normal | Y | Y
1 | 30 | noraml | Y | Y
2 | 60 | normal/extended[^1] | Y | N
3 | 120 | normal | Y | Y
4 | 240 | normal | N | Y

[^1]: 对extended CP的支持见3GPP提案[R1-1701179](https://www.3gpp.org/ftp/TSG_RAN/WG1_RL1/TSGR1_AH/NR_AH_1701/Docs/R1-1701179.zip)

## Frame Structure
NR的帧结构在时域上和LTE类似，每个Radio Frame长度均为$10ms$，划分为10个长度为$1ms$的subframe。其中radio frame的编号范围是0~1023，即在SSB中，SFN的长度为10bit。

每个subframe又可以划分为若干个slot，slot的数量和当前选用的Numerology，即$\mu$相关；每个subframe中slot的数量应为$N^{subframe, \mu}_{slot}$，对应的slot编号应为$n_s^\mu \in \lbrace0,...,N^{subframe, \mu}_{slot} - 1 \rbrace$；同理每个radio frame中含有$N^{frame, \mu}_{slot} = N^{subframe, \mu}_{slot} * 10$个slot，对应的slot编号为$n_{s, f}^\mu \in \lbrace0,...,N^{frame, \mu}_{slot} - 1 \rbrace$。

每个slot中包含的OFDM符号的个数和CP的长度有关：
$$
N^{slot}_{symb} = \begin{cases}
12, &\text{extended CP}\cr
14, &\text{normal CP}
\end{cases}
$$

除此之外，每个radio frame仍被划分为两个长度为$0.5ms$的half-frame，每个half-frame的首个OFDM符号的CP要略长于其他的符号[^2]，这里与LTE是一致的。

[^2]: 这个差值约为$16T_s$，其中$T_s = 32.55 * 10^{-9}s$，是LTE的基本时间单位

![NR Resource Grid overview](https://s2.loli.net/2022/07/18/rKWzN4Pj61UTmi8.png)

NR仍然支持TDD/FDD两种复用方式，TDD又被划分为semi-static TDD以及dynamic TDD。其中semi-static TDD的工作方式和LTE相似，在每个slot中，所有的OFDM符号可以被配置为DL、UL或者flexible，其中flexible符号可以支持DL或者UL传输, 这使得NR的slot可以被配置为类似LTE中特殊子帧的形式；dynamic-TDD中，如果没有配置semi-static TDD，那么所有符号默认全为flexible，由DCI决定符号的传输方向[^3]。

[^3]: 参考TS38.213

但是，在NR TDD中，从DL到UL的切换时，仍需设置保护周期，通常是由一个flexible符号充当这个保护周期的。

## Physical Resources
在NR中，RB的概念发生了变化，一个RB只代表频域上12个连续的subcarrier的宽度，而非LTE中，由时域上一个slot和频域上12个连续的subcarrier围成的resource grid的区域。

### Point A
Point A是resource grid的公共参考点。

### CRB
Common Resource Block在频域上从零开始编号，其中CRB0的首个subcarrier的中心被规定为Point A。对于RE$(k, l)$而言，其所在的CRB由下列公式确定：
$$
n^\mu_{CRB} = \lfloor \frac{k}{N^{RB}_{sc}} \rfloor
$$

### PRB & VRB
同LTE

## BandWidth Part
NR引入了BWP的概念，允许UE在小区带宽的子集上进行通信，此时UE只能看到部分载波，每个UE可以分配多个不同的BWP，通过bandwidth adaption自动切换适合当前场景的BWP，以达到效率和功耗的最佳状态。

## Down-link channels
NR中取消了PCFICH和PHICH，仅保留了PBCH、PDCCH以及PDSCH。

## Reference Signals
NR中取消了CRS，以提高频谱利用率。在NR中常见的参考信号，仍有以下几种：

### DMRS
由于取消了CRS，现在每个信道中都有专属的DMRS辅助定位和解调。

### PTRS
PTRS，全称Phase-Tracking Reference Signal，即相位追踪信号。发射机的相位噪声和发射频率成正比，因此在FR2中，PTRS是保证通信正常进行的不可或缺的角色。它主要被用于跟踪发射机和接收机的本地振荡器的相位，抑制相位噪声和公共相位误差（CPE）。

由于相位噪声的特点[^4]，PTRS在时域中具有高密度而在频域中具有低密度。系统根据振荡器的质量，载波频率，子载波间隔以及传输使用的调制和编码方案来配置PTRS。

[^4]: [什么是相位噪声？](https://www.zhihu.com/question/47391320)

### CSI-RS
CSI-RS，全称Channel State Information Reference Signal，即信道质量参考信号。NR中的CSI-RS极为灵活，最多可以配置为32个天线端口，并可以从某个时隙的任意符号插入，占用1/2/4个OFDM符号（取决于天线端口的数量）。

> 不同于LTE的是，NR中的CSI-RS变为UE级别的配置，但是多个UE可以共享同一种CSI-RS配置，只不过每个UE都要被独立的配置一次。 *by 温金辉老师*

NR中还引入了CDM group的概念：占据了相同RE资源但是天线端口不同的一组CSI-RS信号被认为隶属于同一个CDM group。其中，CSI-RS占用的天线端口的数量等于正交覆盖码（OCC）的数量和CDM group索引值的数量的乘积。

CSI-RS的密度分别可取$\rho \in \lbrace \frac{1}{2}, 1, 3 \rbrace$，其中$\rho = \frac{1}{2}$仅用于CSI-RS的获取，以降低导频开销；而$\rho = 3$用于精细化时频跟踪（Fine Time-Frequency Tracking）。

### PRS
全称Positioning Reference Signal，即定位参考信号。

### RIM-RS
全称Remote Interference Management Reference Signal，即远程干扰管理参考信号。用于消除小区间干扰。

## References
1. [Three design principles of 5G New Radio](https://www.ericsson.com/en/blog/2017/8/three-design-principles-of-5g-new-radio)
2. [5G New Radio: Unveiling the Essentials of the Next Generation Wireless Access Technology](https://arxiv.org/ftp/arxiv/papers/1806/1806.06898.pdf)
3. TS38.211, release-16
4. TS38.213, release-16

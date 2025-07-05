---
date: '2021-08-31T15:17:32'
draft: false
title: NR协议读书笔记（三）：Phase-Tracking Reference Signal
slug: 'bcc9c62d'
authors: [Stephen]
summary: 'PT-RS的生成和映射'
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
PT-RS是专门用于相位跟踪和测量的参考信号。UE接入gNB时，会通过测量PSS/SSS进行时频同步，在后续可以通过PT-RS补偿因为噪声干扰而产生的相位偏差。

确切来讲，PT-RS跟踪的是接收机与发射机各自振荡器的相位，能够抑制相位噪声和公共相位误差，尤其是在FR2这样的高频率场景下；由于相位噪声的特点，PT-RS在频域上的密度很低（可能多个PRB中仅出现一次），在时域上的密度较高（每个符号都有可能出现）。NR中这样映射PT-RS的原因在于，相位旋转会影响某个OFDM符号的所有子载波，但是在不同的符号之间，却呈现低相关性。

## Generation
对于子载波$k$而言，此处的PTRS序列由以下序列给出：

$$
r_k = r(2m + k') \tag{1}
$$

在$(1)$式中，右侧是定义在$(k, l_0)$处的DMRS序列。

## Mapping
PTRS只应出现在PDSCH占用的RB上。

PTRS序列在映射到RE之前，需要由$\beta_{PT-RS, i}$进行放缩，以适应实际的传输功率。因此实际上某个RE携带的PTRS应为:

$$
a^{(p, \mu)}_{k, l} = \beta_{PT-RS, i} \cdot r_k \tag{2}
$$

其中，$p, \mu$分别为当前PDSCH信号占用的天线端口和numerology；$k, l$是该RE占用的时频资源位置, 特别地， $l$是PDSCH占用的时域位置（一个slot内的OFDM符号数）。

用于携带PT-RS的RE必须满足：
+ 不被DMRS for PDSCH的占用
+ 不被非零功率的CSI-RS占用，除非CSI-RS被配置为非周期性的
+ 不被零功率CSI-RS占用
+ 不被SS/PBCH占用
+ 不是已被检测到的PDCCH区域
+ 没有被声明为'not available'，即不在包含SS/PBCH的PRB内

计算时域位置$l$的步骤如下：
1. 令$i = 0, l_{ref} = 0$；
2. 如果在范围$\lbrack \max(l_{ref} + (i - 1)L_{PT-RS} + 1, l_{ref}), l_{ref} + iL_{PT-RS} \rbrack$内的OFDM符号和DMRS符号重叠，那么：
    - 令$i = 1$，
    - 设置$l_{ref}$为DMRS信号中最后一个symbol的索引，
    - 重复本步，直到$l_{ref} + iL_{PT-RS}$超出PDSCH的范围，
3. 将$l_{ref} + iL_{PT-RS}$加到PT-RS的时间索引的集合中；
4. $i$自增1；
5. 重复第二步至第四步，直到$l_{ref} + iL_{PT-RS}$超出PDSCH的范围。

$L_{PT-RS}$是PT-RS在时域上的密度，它的取值可以查表Table 5.1.6.3-1, TS48.214得到，如下：
Scheduled MCS | $L_{PT-RS}$
:---: | :---:
$I_{MCS} < \text{ptrs-MCS}_1$ | no PT-RS
$\text{ptrs-MCS}_1 \le I_{MCS} < \text{ptrs-MCS}_2$ | $4$
$\text{ptrs-MCS}_2 \le I_{MCS} < \text{ptrs-MCS}_3$ | $2$
$\text{ptrs-MCS}_3 \le I_{MCS} < \text{ptrs-MCS}_4$ | $1$

时域位置的确定过程，简而言之，就是[^1]：
1. $l = 0$是第一个PT-RS符号；
2. 如果在区间$[l, l + L_{PT-RS}]$中不存在DMRS，则$l + L_{PT-RS}$就是下一个携带PT-RS的符号；
3. 如果此区间内存在DMRS，则令$l = l^{DMRS}_{right}$[^2]，取$l + L_{PT-RS}$为下一个携带PT-RS的符号；
4. 令$l = l + L_{PT-RS}$，并重复上述步骤，直到$l + L_{PT-RS} > 13$，即超出slot中符号的范围为止。

[^1]: 此处认为[ShareTechNotes](http://sharetechnote.com/html/5G/5G_PTRS_DL.html)给出的计算示例是错误的

[^2]: 如果DMRS信号只有一个符号宽度，则从此符号算起；如果DMRS占用两个符号宽度，则从第二个DMRS符号开始计算

频域位置$k$由$(3)$确定：
*注意：$k$的取值范围是$[0, N^{RB}_{sc}N_{RB} - 1]$。*

$$
k = k^{RE}_{ref} + (iK_{PT-RS} + k^{RB}_{ref}) \cdot N^{RB}_{sc} \tag{3}
$$

其中，$k^{RB}_{ref}$由$(4)$确定：

$$
k^{RB}_{ref} = \begin{cases}
n_{RNTI} \bmod K_{PT-RS}, \text{if } N_{RB} \bmod K_{PT-RS} = 0 \\
n_{RNTI} \bmod (N_{RB} \bmod K_{PT-RS})
\end{cases} \tag{4}
$$

上式中，$i = 0, 1, 2,\dots$；$K_{PT-RS} \in \lbrace 2, 4 \rbrace$，是PT-RS的频域密度，即频域上每$K_{PT-RS}$个RB中会出现一次携带PT-RS的RE；$n_{RNTI}$是由DCI消息下发的RNTI的值；$N_{RB}$是受到调度的PRB的总数; $k^{RE}_{ref}$可以查下表得到：

![RB references](https://s2.loli.net/2022/07/18/hjznqtMOD6bZGol.png)

### A Simple Example
假设当前slot内，不存在PDCCH，DMRS位于symbol 2处，占用一个符号宽度，$L_{PT-RS} = 4$，$K_{PT-RS} = 4$，$k^{RE}_{ref} = 3, n_{RNTI} = 1001$，共有10个PRB接受调度。

先计算时域分布，显然$l \in \{ 0, 6, 10\}$。

下面计算频域上的分布：

1. 由于$n_{RB} \bmod K_{PT-RS} = 10 \bmod 4 = 2 \neq 0$，可得：

    $$
    k^{RB}_{ref} = n_{RNTI} \bmod (n_{RB} \bmod K_{PT-RS})  = 1 \tag{5}
    $$

    即PT-RS从给定的BWP中的第二个PRB中出现；

2. 由$(3)$可以知道，PT-RS每$K_{PT-RS}$个PRB中出现一次，即其所占用的PRB应为$\{1, 5, 9\}$；又因为$k^{RE}_{ref} = 7$，可以计算出$k \in \{ 19, 67, 115 \}$。

在其中一个PRB上，PT-RS的分布如下图：
![PTRS example 01](https://s2.loli.net/2022/07/18/42gjavVrWEFZX73.png)

## Reference
1. TS38.211, Physical channels and modulation
2. TS38.214, Physical layer procedures for data
3. [PDSCH Allocation - NR ToolBox Help](https://ww2.mathworks.cn/help/5g/ug/nr-pdsch-resource-allocation-and-dmrs-and-ptrs-reference-signals.html#NewRadioPDSCHReferenceSignalsExample-7)
4. [On the Phase Tracking Reference Signal (PT-RS) Design for 5G New Radio (NR)](https://arxiv.org/ftp/arxiv/papers/1807/1807.07336.pdf)

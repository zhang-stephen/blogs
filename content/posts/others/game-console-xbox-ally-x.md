---
date: '2026-01-09T00:51:59+08:00'
draft: false
title: '杂谈：ROG Xbox Ally X的折腾记录'
slug: '5691d592'
authors: [Stephen]
summary: '在ROG掌机上尝试使用Bazzite系统的记录'
tags:
  - Steam
  - ROG
  - Game Console
  - AMD
  - Linux
categories:
  - Entertainment
series: []
---

## Preface

元旦前从某海鲜市场收了一个成色上好的ROG Xbox Ally X掌机（下文简称“掌机”），它默认的系统是定制版的Windows 11。该系统和常见的Windows 11其他版本最大的区别，是引入了“全屏体验”（Full Screen Experience, FSE）功能，允许Windows简化界面、提升游戏的沉浸式体验。该模式预计会在其他版本上推广。

但是可惜的是，FSE目前仅有Xbox App进行了适配。但是由于众所周知的原因，Xbox游戏体验其实不如Steam，而且XGP也无法使用。除此之外，该机器的硬件性能确实可圈可点：

- CPU: AMD Z2 Extreme，3p+5e up to @5GHz
- GPU: AMD Raedon 880M 16CUs
- RAM: 24GB LPDDR5
- SSD: 1TB NVMe 2.0, @2280

其中，24GB内存最多可以划分出16GB作为GPU VRAM，配合1080p的内置显示器，在某些3A游戏上确实也能一战。手柄部分采用了经典的Xbox布局，而且配置了西瓜键（Xbox按键），在体积和重量（~600g）都比较大的情况下，还是保持了很好的手感。不过在Windows 11系统下，该按键似乎被强制劫持为Xbox Game Bar的快捷方式，无法用于Steam Big Picture的全局菜单。

除此之外，根据部分性能测评，Windows 11的性能表现不如Steam OS及其衍生版本。基于种种考虑，最后笔者决定放弃Windows系统，转而安装Bazzite。为什么没有选择官方的Steam OS？主要是Steam OS目前主要为Steam Deck设计，对其他硬件的兼容性可能不够好，而Bazzite集成了众多工具，可以开箱即用。

## 安装Bazzite系统
总之先放一张`fastfetch`的输出在这里……
![20260109011815](https://s2.loli.net/2026/01/09/IxHmfSbapTnZQlz.png)

安装Bazzite可以直接参考[官方文档](https://docs.bazzite.gg/General/Installation_Guide/Installing_Bazzite_for_Handheld_PCs/)进行，笔者选择抹去自带的Windows系统以节省硬盘空间。

不过需要注意的是，在进行安装时，最好可以通过Type-C扩展坞（支持显示功能）添加外接显示和键鼠，方便操作；另外最好可以提供网关级别的网络加速（例如自带科学上网的OpenWRT路由器），以免遇到网络问题。

## 优化Bazzite

虽然Bazzite可以说是开箱即用，但是有些优化还是可以使游戏体验更上一层楼。

### 串流：Sunshine+Moonlight

在Bazztie安装完成之后，可以通过串流的方式访问Bazzite的桌面模式，便于操作。

Bazzite预装了[Sunshine](https://github.com/LizardByte/Sunshine)作为串流服务器，可以通过命令`ujust setup-sunshine`启用和配置它。可以在其他机器上使用[Moonlight](https://github.com/moonlight-stream/moonlight-qt)作为串流客户端。

但是目前该方案不支持跨设备复制粘贴，也不支持文件传输。

P.S. Moonlight在默认情况下将会完全捕获鼠标，如果需要鼠标自由移动，可以在设置中勾选“为远程桌面而不是游戏优化鼠标”。

### 系统更新

Bazzite的系统更新是比较简单的，只有一条命令，即`ujust update`。

该命令主要做三件事：拉取`bazzite-deck`镜像、更新flatpaks、更新brew软件包。鉴于国内的网络环境，我们要分别针对这三种方式换源。

Bazzite的底层系统是Fedora Atomic，它使用[ostree](https://ostreedev.github.io/ostree/introduction/)进行系统的更新维护。默认的系统更新镜像是`gchr.io/ublue-os/bazzite-deck:stable`，在国内，可以使用[南京大学镜像站](https://mirror.nju.edu.cn/)为`ghcr.io`加速。使用如下命令替换默认的系统更新镜像的地址：

```bash
rpm-ostree rebase ostree-image-signed:docker://ghcr.nju.edu.cn/ublue-os/bazzite-deck:stable
```

如果想要尝试测试版本，可以将`stable`替换为`testing`或者`unstable`。

Flatpak可以使用[中科大镜像](https://mirrors.ustc.edu.cn)，稳定性和速度都保持在不错的水平：

```bash
flatpak remote-modify flathub --url=https://mirrors.ustc.edu.cn/flathub
```

然后是brew，只需在`~/.bashrc`中添加以下几行，使用[清华大学Tuna镜像](https://mirrors.tuna.tsinghua.edu.cn)：

```bash
export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"
export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"
export HOMEBREW_INSTALL_FROM_API=1
export HOMEBREW_API_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/api"
export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"
export HOMEBREW_PIP_INDEX_URL="https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple"
```

P.S. Fedora默认的`dnf`包管理器镜像源可以自由选择。

### 软件安装

显然，游戏可以通过Steam直接安装，略过不提。如果需要其他软件。则有以下几种安装方式：

- Linux Brew，用过Mac的朋友对这个命令应该比较熟悉
- 由于Bazzite基于Fedora Atomic构建，因此`dnf`软件包管理器也可用
- 通过系统自带的flatpak商店`Bazaar`安装

软件安装完毕后，可以通过右键菜单`Add to Steam` 添加到Steam库中，下次使用就无需切换到桌面模式了。

### 开启FSR4

理论上，只有RDNA4架构的AMD GPU才可以开启FSR4。而AMD Z2 Extreme的核显属于RDNA3.5架构。不过之前在B站看到有人尝试成功了，甚至可以在上一代AMD Z1 Extreme上开启FSR4（例如Steam Deck OLED）……《黑神话：悟空》的评测结果如下：

{{< bilibili BV1W3UVBAEkf >}}

在Bazzite系统内，可以使用命令`ujust toggle-global-fsr4-rdna3`开启FSR4支持，但是仅限于Proton GE、Proton EM等第三方兼容层。

### Steam Decky Loader

使用`ujust setup-decky`命令即可。

### 其他

有一点需要注意的是，由于华硕并未放出指纹传感器的驱动，因此指纹传感器无法用于系统登录。详细讨论见[issue #3752](https://github.com/ublue-os/bazzite/issues/3752)。

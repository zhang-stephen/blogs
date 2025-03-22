---
date: 2023-04-03T00:21:01
draft: false
title: 为ZeroTier搭建私有Planet Server
slug: '1027185260'
authors: [Stephen]
summary: '为ZeroTier网络搭建真正私有的Planet Server'
tags:
    - zerotier
    - SD-WAN
categories:
    - shorthands
series: []
---

## Preface

[ZeroTier](https://www.zerotier.com/)是一个由C++开发的软交换机，可以让多台内网机器组成一个私有的局域网。ZeroTier的节点分为三类：

- Planet Server: 官方的根服务器，用于记录和配置每个局域网下客户端信息（以下简称Planet）；
- Moon Server: 官方推荐的私有Planet Server的部署方法，在默认Planet无法访问的时候承担Planet的作用（以下简称Moon）；
- Leaf: 局域网中既不是Planet也不是Moon的其他客户端。

ZeroTier在搭建自己的Moon的时候，需要一个具有公网IP地址的服务器以及开放UDP 9993端口。因此它大概[^1]是通过UDP打洞实现的。

[^1]: 仅猜测，未作深入研究。

根据官方消息[^2]，ZeroTier 2.0将会放弃现有的Planet-Moon机制，而改用一套去中心化的根服务器机制，名为LF，它将允许用户自由运行和建立根服务器。因此本文**仅**适用于ZeroTier 1.x版本。

[^2]: https://www.zerotier.com/blog/zerotier-2-0-status/

在国内，由于众所周知的原因，以及UDP流量受限于QoS的限制，官方的Planet的连接稳定性很差，而自建Moon的优先级似乎始终低于Planet，因此在某些情况下，局域网客户端通信的质量（时延、稳定性）可能会非常不稳定。于是我们需要一个真正意义上私有Planet，而不是作为备份Planet的Moon。

这种方法并非官方推荐的，在Github Issue中的很多讨论都可以证实官方的态度，因此在LF机制尚未落地前，这种方法仅用于临时过渡。

## 搭建方法

### 准备工作

- 一个已经搭建好的ZeroTier网络，以及它的网络ID；
- 一台开放UDP 9993端口的公网服务器，例如阿里云服务器；
- 一点点浅显的C++编程知识。

### Let's Go!

首先在云服务器上使用包管理器安装ZeroTier，例如：

```shell
$ sudo apt install zerotier-one
```

然后使用命令`sudo zerotier-cli join <network id>`加入已经建立好的ZeroTier网络；确保服务器上已经安装了支持C\++11标准的GCC或者LLVM，并可以使用它们编译C++源文件。

克隆ZeroTier的源代码到本地，例如：

```shell
$ git clone https://github.com/zerotier/ZeroTierOne.git --depth 1 --branch dev ~/zerotier-one
```

切换到`~/zerotier-one/`目录下，打开文件`attic/world/mkworld.cpp`，可以看到这里是默认声明了四个根服务器，即官方的Planet（以洛杉矶Planet为例）：

```c++
// Los Angeles
roots.push_back(World::Root());
roots.back().identity = Identity("3a46f1bf30:0:76e66fab33e28549a62ee2064d1843273c2c300ba45c3f20bef02dbad225723bb59a9bb4b13535730961aeecf5a163ace477cceb0727025b99ac14a5166a09a3");
roots.back().stableEndpoints.push_back(InetAddress("185.180.13.82/9993"));
roots.back().stableEndpoints.push_back(InetAddress("2a02:6ea0:c815::/9993"));
```

把此处的Planet都注释掉，把云服务器的信息添加进来：

```c++
roots.push_back(World::Root());
roots.back().identity = Identity("<identity string>");
roots.back().stableEndpoints.push_back(InetAddress("<public IPv4>/9993"));
roots.back().stableEndpoints.push_back(InetAddress("<public IPv6>/9993")); // 如果云服务器没有IPv6地址，可省略此行
```

其中`<identity string>`可以在`/var/lib/zerotier-one/identity.public`文件中找到，复制到对应位置即可。

接下来切换到`attic/world/`目录下，执行此处的`build.sh`脚本，即可生成一个名为`mkworld`的可执行文件。执行`./mkworld`就可以得到一个新的`world.bin`文件 —— 这就是我们需要的新的Planet的数据文件。

将此文件拷贝到`/var/lib/zerotier-one/`目录下，并重新命名为`planet`，接着重启ZeroTier服务，私有Planet的服务端就搭建完成了。

将`world.bin`下载到本地，替换掉本地的`planet`文件，以Windows为例，该文件位于`C:\ProgramData\ZeroTier\One\planet`下，替换此处的文件需要管理员权限。替换完成后，同样需要重启ZeroTier服务。

重启完成后，在具有管理员权限的Powershell终端中，切换到ZeroTier的安装目录，执行`./zerotier-cli.bat listpeers`，若看到如下图中仅存在一个Planet，且其IP地址为云服务器公网IP时，证明私有Planet搭建成功。

![listpeers.png](https://s2.loli.net/2023/04/03/blsKdSj9UpLC8rT.png)

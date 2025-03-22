---
date: '2022-05-09T00:43:37'
draft: false
title: 杂谈：在云服务器上部署分布式的饥荒联机服务器
slug: '1434336213'
authors: [Stephen]
summary: 适用于饥荒联机版的“分布式”服务器搭建
tags:
    - steam
    - lua
    - DST
categories:
    - Entertainment
series: []
---

### Preface

最近和小伙伴游玩联机饥荒的时候，采用了本地服务器配合[FRP](https://github.com/fatedier/frp)，将UDP端口10998/10999通过云服务器暴露到公网上，以实现联机。这个场景下，服务器在小伙伴的局域网下，我作为客户端位于另一个局域网下，虽然成功实现了联机，但是延迟很高，无法正常游玩。

为什么在有云服务器的情况下，不能直接把饥荒服务端部署上去呢？因为阿里云学生机的性能太差了，无法流畅运行同时拥有地上世界和洞穴的游戏世界。

通过简单研究Windows版的饥荒服务器，我们发现，饥荒服务端的地上世界和洞穴是两个不同的进程，而且在存档配置文件`cluster.ini`中有一个属性名为`master_ip`，值默认是`127.0.0.1`。这好像暗示着，地上世界和洞穴的进程可以进行分布式部署？

正好我和小伙伴各拥有一台阿里云轻型应用服务器（学生机），说干就干，以下是具体的实现方法。

基本配置：

CPU | RAM | Bandwidth | Traffic Limit
:---: | :---: | :---: | :---:
Intel Xeon 1C2T @2.5GHz | 2GiB | 5Mbps | 1 TiB/month

### How to?

*默认使用的操作系统是Ubuntu 20.04 LTS。*

*安装[steamcmd](https://developer.valvesoftware.com/wiki/SteamCMD)及其依赖的步骤略。*

> [!TIP] 提示
> 如无==特殊说明==，以下步骤需要在两台云服务器上分别执行。

#### 在开始之前……

在启动服务端时，可以配合`screen`命令或者`tmux`命令，这样，可以将服务端会话方便的置于后台运行，即使断开与服务器的SSH链接，也不会中断游戏进程。此外，设置并启动地上世界和洞穴进程的步骤较为相似，注意不要填错IP，也不要搞错了`-shard`后面的参数。

其次，为安全起见，不要使用root用户直接安装和启动steamcmd以及饥荒客户端，而应该建立一个专门的用户来做这些事情，也不要授予该用户使用`sudo`的权限。所有的操作都**应该**在此用户的家目录下执行。

适用于Steam玩家，wegame及主机平台未测试。

#### 安装饥荒服务端

安装steamcmd到家目录下，安装好的路径应该是`~/steamcmd/`，接下来，使用命令`~/steamcmd/steamcmd.sh`启动steamcmd。

依次执行以下命令安装饥荒专用服务器：

1. `login anonymous`，即匿名登录；*注意：有些游戏的Dedicated Server是需要验证Steam账户后才可以下载的，但是饥荒不必如此*；

2. `force_install_dir <path>`，可选命令，将游戏安装到指定的目录，即`<path>`，该设置生效直至退出登录；如果不执行该命令，将会把游戏默认安装到`~/Steam/steamapps/common/`；

3. `app_update 303450 validate`，安装饥荒服务端，并验证文件完整性；

4. `exit`，退出登录。

#### 配置饥荒服务端

主要是配置需要运行在服务端的mods。

进入目录`~/Steam/steamapps/common/"Don't Starve Together Dedicated Server/mods/"`，编辑文件`dedicated_server_mods_setup.lua`，示例如下：

```lua
--ServerModSetup takes a string of a specific mod's Workshop id. It will download and install the mod to your mod directory on boot.
        --The Workshop id can be found at the end of the url to the mod's Workshop page.
        --Example: http://steamcommunity.com/sharedfiles/filedetails/?id=350811795
        --ServerModSetup("350811795")
        ServerModSetup("2506886144")
        ServerModSetup("362175979")
        ServerModSetup("375859599")
        ServerModSetup("378160973")
        ServerModSetup("623749604")
        ServerModSetup("666155465")
```

即在函数`ServerModSetup()`中，填写创意工坊mod页面提供的workshop ID即可。

如果懒于写代码，可以将Windows端已经安装好的mod打包上传到云服务器，并解压到此位置也可，服务器启动后会根据扫描到的mod自动生成该文件。

P.S.: 也可以在创意工坊中创建一个mod集合，然后使用函数`ServerModCollectionSetup()`，使服务器在启动时自动加载mod。

#### 上传存档

饥荒服务器linux端的存档位置是`~/.klei/DontStarveTogether/`。获取存档的方法有两种：

1. 在饥荒联机版中创建一个新世界，配置完毕后可以提取存档；Windows下存档路径是`C:/Users/<username>/Documents/Klei/DontStarveTogether/`[^1]；

[^1]: `C:/Users/<username>/`可以替换为`~/`，在Win7及更新的系统上，路径分隔符`/`和`\`是等价的。

2. 使用Klei官方提供的[配置工具](https://accounts.klei.com/account/game/servers?game=DontStarveTogether)，生成并下载存档。

假设存档的名字为`Cluster_1`，使用`scp`[^2]命令或者FTP工具将压缩后的存档上传即可：

[^2]: Win10/Win11自带openSSH组件，无需额外安装。

```shell
scp ~/Documents/Klei/DontStarveTogether/Cluster_1.zip \
        <username>@<server_ip>:~/.klei/DontStarveTogether/
```

解压存档：

```shell
cd ~/.klei/DontStarveTogether/ && unzip Cluster_1.zip
```

#### 打开端口

需要在云控制台中打开的端口号如下表：

Configuration  | field| type | port | usage
:---: | :---: | :---: | :---: | :---
`cluster.ini` | `master_port` | TCP/UDP | 10888 | 地上世界和洞穴进行进程间通信
`Master/server.ini` | `server_port` | TCP/UDP | 10999 | 玩家客户端和地上世界通信
`Caves/server.ini` | `server_port` | TCP/UDP | 10998 | 玩家客户端和洞穴通信
`Caves/server.ini` | `master_server_port` | TCP/UDP | 27017 | 未知
`Caves/server.ini` | `authentication_port`| TCP/UDP |  8767 | 疑似用于Steam验证

*其实可以确定部分端口是UDP-only的，但是方便起见还是打开了对应的TCP端口。测试未尽之处，不再赘述。*

#### 检查服务器token

检查`Cluster_1/cluster_token.txt`，两份存档的token必须相同。否则可能无法注册服务器。

*按照前面的生成存档的方法，该文件应该不会缺失，如果该文件丢失，可以去[Klei - account](https://accounts.klei.com/account/info)页面生成token，创建文件并粘贴即可。*

#### 配置并启动地上世界进程

==此步骤在地上世界所在的服务器上执行。==

修改`Cluster_1/cluster.ini`的如下部分：

```ini
[SHARD]
shard_enabled = true
bind_ip = <aliyun_master_intranet_ip>
master_ip = <aliyun_master_intranet_ip>
master_port = 10888
cluster_key = defaultPass
```

*众所周知，每台阿里云服务器拥有一个内网IP和一个公网IP，这两个地址通过aliyun的某种服务实现了端口对应的映射，即发给公网IP的数据，会被此服务转发至内网IP相同的端口上，反之亦然。* 因此此处的`master_ip`和`bind_ip`**必须**填写该云服务器的内网IP，否则两个世界无法进行通信。

至于`master_port`，必须设置为10888，设置为其他任何端口，都会提示端口被占用，疑似是服务端的bug；而且上一步中已经打开了这个端口，因此就不必修改了。

删除`Cluster_1/Caves/`目录，启动服务端[^3]：

[^3]: 饥荒现在已经提供了64-bit的服务端可执行文件，因此无需安装32-bit的依赖；如果依赖缺失，应当直接安装其64-bit版本。

```shell
cd ~/Steam/steamapps/common/"Don't Starve Together Dedicated Server"/bin64/
./dontstarve_dedicated_server_nullrenderer_x64 -console -cluster Cluster_1 -shard Master
```

似乎必须在服务端可执行文件目录下启动服务端，否则会加载`scripts/main.lua`失败。

#### 配置并启动洞穴进程

==此步骤在洞穴所在的服务器上执行。==

修改`Cluster_1/cluster.ini`的如下部分：

```ini
[SHARD]
shard_enabled = true
bind_ip = <aliyun_master_internet_ip>
master_ip = <aliyun_master_internet_ip>
master_port = 10888
cluster_key = defaultPass
```

与上一步相对应地，此处的`master_ip`和`bind_ip`应该填写地上世界服务器的公网IP。

删除`Cluster_1/Master/`目录，启动服务端：

```shell
cd ~/Steam/steamapps/common/"Don't Starve Together Dedicated Server"/bin64/
./dontstarve_dedicated_server_nullrenderer_x64 -console -cluster Cluster_1 -shard Caves
```

#### 开动！

完成上述步骤，并看到两个服务端日志中都打印出`Sim Pause`的字样时，证明搭建成功，此时应该可以在“浏览游戏”中搜索到自己的服务器，可以愉快的玩耍了~

### Reference

1. [Klei官方搭建指南](https://steamcommunity.com/sharedfiles/filedetails/?id=590565473)
2. [Tmux使用教程 - 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2019/10/tmux.html)

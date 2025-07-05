---
date: '2022-07-22T23:44:03'
draft: false
title: 'Git使用技巧（一）：从远程仓库拉取特定commit'
slug: 'e1a44d1e'
authors: [Stephen]
summary: 如题
tags:
    - git
categories:
    - shorthands
series: []
---

## Preface

今天在工作中，需要将项目切回到一个较旧的版本上验证问题，但是此版本在远程仓库上既不是独立分支，也没有tag标记。如果使用`git reset --hard <commit id>`回退到旧版本，那么打断当前工作流不说，还需要较长的时间，因为还有submodule和LFS回退的问题。

后来经过简单思考，想到了一个简单的，单独clone某个commit的方法，简单记录一下。

## How to?

1. 新建一个空文件夹，并且初始化为git仓库，
    ```bash
    mkdir repo2 && cd repo2
    git init
    ```

2. 设置远端仓库地址，
    ```shell
    git remote add <nick name> <url>
    ```

3. 使用`git fetch`取得对应的commit，
    ```shell
    git fetch <nick name> <commit id>
    ```

4. 检出`FETCH_HEAD`即可。
    ```shell
    git checkout FETCH_HEAD -b <new branch>
    ```

当然，如果有对远端仓库操作的权限，那么完全可以将此commit打一个临时的tag，然后使用`git clone <url> -b <tag> --depth 1`即可达到目的。

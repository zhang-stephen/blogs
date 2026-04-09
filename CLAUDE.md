# CLAUDE.md

## 项目简介

这是 Stephen Zhang 的个人博客项目，基于 [Hugo](https://gohugo.io/) 静态网站生成器构建，使用 [DoIt](https://github.com/HEIGE-PCloud/DoIt) 主题。

- **本地地址**: http://localhost:1313/
- **默认语言**: 简体中文 (zh-cn)
- **时区**: Asia/Shanghai

## 目录结构

```
blogs/
├── config/           # 配置文件
│   └── _default/
│       └── hugo.yml  # Hugo 主配置
├── content/          # 博客内容
│   └── posts/        # 文章目录
│       ├── coding/           # 编程相关
│       │   └── cpp-features/ # C++ 特性系列
│       ├── communication/    # 通信技术
│       ├── network/          # 网络技术
│       ├── git/              # Git 技巧
│       ├── reading/          # 读书笔记
│       └── others/           # 其他
├── themes/           # 主题目录 (DoIt)
├── static/           # 静态资源
├── assets/           # 可处理的资源
└── layouts/          # 自定义布局
```

## 常用命令

```bash
# 启动本地开发服务器
hugo server -D

# 构建（包含草稿）
hugo --buildDrafts

# 构建（生产环境）
hugo

# 新建文章
hugo new content posts/category/post-name.md
```

## 文章 Front-matter 规范

```yaml
---
date: '2026-04-06T23:15:14+08:00'
draft: false
title: '文章标题'
authors:
    - Stephen
slug: '唯一标识'  # 自动生成或手动指定
summary: '文章摘要'
series:          # 系列文章（可选）
    - 系列名称
tags:            # 标签
    - tag1
    - tag2
categories:      # 分类
    - 分类名
---
```

### 分类约定

- `coding` - 编程技术
  - `cpp-features` - C++ 新特性系列
- `communication` - 通信技术
- `network` - 网络技术
- `git` - Git 使用技巧
- `reading` - 读书笔记
- `others` - 其他内容

## 写作规范

1. **文件名**: 使用小写字母，单词间用连字符 `-` 连接，如 `cpp26-optional-ref.md`
2. **代码块**: 使用明确的语言标识，C++ 代码块使用 `cpp`
3. **图片**: 放在文章同目录下，引用使用相对路径 `./image.png`
4. **链接**: 外部链接使用完整 URL，内部链接使用相对路径
5. **系列文章**: 使用 `series` 字段标记，保持命名一致

## C++ 文章特殊规范

- 使用 `C++` 而非 `C++`（中间无空格）
- 标准版本标签：`cpp11`, `cpp20`, `cpp23`, `cpp26`
- 提案链接格式：`[P2988R0](https://wg21.link/p2988r0)`

## 主题更新

主题以 Git 子模块形式引入：

```bash
# 更新主题到最新版本
git submodule update --remote --merge
git add themes/DoIt
git commit -m "[chore] update DoIt theme to latest version"
```

## 部署

构建后的站点输出到 `public/` 目录，可直接部署到任意静态托管服务。

## Git 提交规范

提交信息使用以下前缀：

| 前缀 | 用途 | 示例 |
|------|------|------|
| `[feat]` | 新功能 | `[feat] add dark mode toggle` |
| `[fix]` | 修复 bug | `[fix] remove nested scrollbar in TOC dialog` |
| `[style]` | 样式/视觉调整 | `[style] refactor TOC styles and add custom scrollbar` |
| `[doc]` | 文档/文章 | `[doc] add C++26 optional reference post` |
| `[chore]` | 杂项/维护 | `[chore] update DoIt theme to latest version` |
| `[refactor]` | 代码重构（功能不变） | `[refactor] simplify CSS selectors` |
| `[test]` | 测试相关 | `[test] add visual regression for TOC` |

**规范**：
- 使用英文小写描述
- 简明扼要，描述改动内容而非改动方式
- 动词使用现在时（add/fix/remove/update）

## 注意事项

- 文章默认使用 Markdown 格式
- 支持 Emoji（`enableEmoji: true`）
- 支持 CJK 语言自动处理（`hasCJKLanguage: true`）
- 草稿文章（`draft: true`）在本地开发时可见，生产构建时默认排除

---
date: '{{ .Date }}'
draft: true
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
slug: '{{ now.UnixNano | hash.FNV32a }}'
summary:
tags:
categories:
---

---
date: '{{ .Date }}'
draft: false
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
slug: '{{ now.UnixNano | hash.FNV32a }}'
authors: [Stephen]
summary: ''
tags: []
categories: []
series: []
---

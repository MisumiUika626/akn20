---
title: "一本笔记，从一个小问题开始"
publishDate: 2026-10-10
description: "示例文章：用技术笔记记录问题、实验和仍然不确定的地方，为之后的真实写作留出空间。"
category: 笔记
tags: [技术笔记, 示例]
translationKey: welcome
---

:::note
这是 akn20 首版的示例文章，用于展示写作格式，不代表已经完成的研究项目或个人成果。
:::

技术笔记的价值在于留下可回看的过程：提出了什么问题，尝试了什么，观察到了什么，还有什么没有弄清楚。

## 一个小实验

先把问题说清楚。选择一个基线，记录输入，并提前说明什么结果会让你重新考虑原来的想法。

```python
def mean(values):
    if not values:
        raise ValueError("expected at least one value")
    return sum(values) / len(values)

assert mean([1, 2, 3]) == 2
```

公式也可以和代码放在同一页。样本均值为 $\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$。

## 留下一份有用的记录

- 写明问题与假设。
- 记录基线与测试条件。
- 区分观察与解释。
- 用下一个可验证的小问题收尾。

> 清楚的局限，也是结果的一部分。

之后可以用实际学习记录和实验依据替换这篇示例。

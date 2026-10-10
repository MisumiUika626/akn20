---
title: "A notebook, one small step at a time"
publishDate: 2026-10-10
description: "Sample article: a small technical notebook for questions, experiments, and things worth revisiting."
category: Notes
tags: [notebook, sample]
translationKey: welcome
---

:::note
This is a sample article for the first version of akn20. It demonstrates the writing format, not a completed research project or a personal achievement.
:::

The useful part of a technical notebook is the trail it leaves: what question was asked, what was tried, what happened, and what remains uncertain.

## A small experiment

Start with an explicit question. Choose a baseline, write down the input, and describe a result that would make you reconsider the idea.

```python
def mean(values):
    if not values:
        raise ValueError("expected at least one value")
    return sum(values) / len(values)

assert mean([1, 2, 3]) == 2
```

Mathematics can share the same page as code. The sample mean is $\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$.

## Leave a useful record

- State the question and the assumptions.
- Record the baseline and the test conditions.
- Separate observations from interpretations.
- End with the next small, testable question.

> A clear limitation is part of a useful result.

Future posts can replace this sample with actual notes and evidence.

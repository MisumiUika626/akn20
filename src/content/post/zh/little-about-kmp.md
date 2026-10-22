---
title: "Little about KMP"
publishDate: "2026-10-22T14:19:00.000Z"
description: "理解了KMP的运行过程"
category: "笔记"
tags: ["KMP","算法","C++","字符串"]
projects: []
draft: true
---

### Use
The central idea of KMP is to **avoid re-examining characters in the text** by exploiting the **internal structure** of the pattern.

Before we start, let's agree on some notation:
- `t`: text string
- `p`: pattern string
- `i`: the pointer of the text string
- `j`: the pointer of the pattern string
- `next[i]=j,next[j]=k`

### Next Array
#### Core Idea
The key to the KMP algorithm is the **next array** (closely related to the LPS array).
In this section, we use the convention `next[0] = -1`.
For each position `i>0`, `next[i]` stores the length of the **longest proper prefix** of `p[0...i-1]` that is also a **suffix** of the same substring.
In other words, `next[i]` tells us how many characters of the pattern can still be considered matched when a mismatch occurs at position `i`.

#### Code Implementation(to get the next array)
Suppose we already know`next[i-1]=j`,which means `p[0~j-1]==p[i-j-1~i-2]`.Now we want to get the value of `next[i]`.
- **Case 1**~~(Lucky :)~~  `p[i-1]==p[j]`
	- Now `p[0~j]==p[i-j-1~i-1]` -> `next[i]=j+1`
- **Case 2**~~(Unlucky :(~~  `p[i-1]!=p[j]`
	- Then we try to find the shorter proper prefix and suffix->**fall back to `next[j]`**
	![[c7cb5cb329ac6caec55d9ebaa3ffe69e_720.jpg]]
	- From the picture, we can see that we successfully match the new prefix and the suffix(the blue area).It's basically just the transitivity of equality.As long as `p[k]==p[i-1]` ,`p[0~k]`will perfectly match `p[i-k-1~i-1]`. 

- Through the discussion above,it's clear that the `next[i]`'s value depends on the previously computed values,just like in **DP** (dynamic programming).The trick is that when a mismatch occurs, we follow the fallback chain until we find a prefix that can be extended.
- Here is a C++ code for solving the next array
```C++
vector<int> getNext(const string& p){
	int m=p.length();
	if (m==0)return {};
	vector<int> next(m);
	int i=0,j=-1;
	next[0]=-1;
	while(i<m-1){
		if(j==-1||p[i]==p[j]){
			i++,j++;
			next[i]=j;
		}else{
			j=next[j];
		}
	}
	return next;
}
```
 🎉🎉🎉Then let's think about how to solve the pattern matching!

### Pattern Matching

#### Core Idea
Use next array for pattern matching.
keep the text pointer `i` moving forward, and use the next array to adjust the pattern pointer `j`whenever a mismatch occurs.
Since we already know that the previous `j` characters match,we can reuse this information instead of starting all over again.
During the whole process,**`i` never moves backward**.We just fall back to`next[j]`and try again.

#### Code Implementation
In this part we only talk about mismatching.(`t[i]!=p[j]`)
- **Case 1**: `next[j]!=0`
	- Same as the condition in solving the next array，`t[i-k~i-1]`match `p[0~k-1]`,`j`back to `next[j]`.(as the picture)
![[Pasted image 20261022175401.png]]


- **Case 2**: `next[j]==0`
	1. `p[0]==t[i]`
		If `p[0] == t[i]`, we can start a new match from here
		
	2. `p[0]!=t[i]`
		Then `j=next[0]=-1`.When `j==-1`,We do`i++,j++`.(try to match the elements after)
	![[Pasted image 20261022175851.png]]

- Here's the C++ code for pattern matching
```C++
int kmpSearch(const string& t, const string& p) {
    int n=t.size(), m=p.size();
    if(m==0)return 0;
    vector<int> next=getNext(p);
    int i=0, j=0;
    while(i<n&&j<m) {
        if(j==-1||s[i]==t[j]){
            i++;
            j++;
        }else{
            j=next[j];
        }
    }
	if(j==m){
	    return i-m;
	}else{
	    return -1;
	}
}
```

# 说明

该仓库是[B站手写 mini-vue视频教程](https://www.bilibili.com/video/BV1Rt4y1B7sC)的学习笔记。

所有的笔记会放在这个README文件中记录。相应的源码按照不通的阶段分为不同的文件夹进行管理。

# P1 reactivity响应式实现

要实现响应式，我们不妨先看看最简陋的情景，然后循序渐进，逐步实现最终的响应式，先看v1版本的代码:

## v1

```js
let a = 10
let b = a + 10
console.log(b)

a = 20
b = a + 10
console.log(b)
```
简单的两个变量，当a变更时，命令式的通过一个赋值表达式更新b的值。确实很简陋对吧，现在升级下，把重复出现的赋值表达式封装成函数就有了v2版本。

## v2

```js
let a = 10
let b
function update() {
    b = a + 10
    console.log(b)
}

update()
b = 20
update()
```

好像依然简陋，能不能不要每次变量变更都手动调用`update()`呢？可以，我们用`@vue/reactivity`模块，看v3版本。




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

## v3

```js
const { reactive, effect } = require('@vue/reactivity')

let a = reactive({
  value: 10
})
let b
effect(() => {
  b = a.value + 10
  console.log(b)
})
a.value = 20
```

使用了`@vue/reactivity`模块的`reactive`和`effect`方法，这样每次响应式数据发生变更时，都会自动执行副作用函数（相当于v2版本中的update方法）。接下来我们来自己实现这个响应式系统。

## 初步实现Dep和effectWatch

Vue的响应式最核心的点就是**收集依赖**和**触发依赖**。简单来说，当触发响应式数据的getter的时候收集依赖（这里可以简单理解为把v2版本中的update方法保存起来），当触发响应式数据的setter的时候触发依赖通知更新（这里可以简单理解为调用v2版本的update方法）。下面我们就来实现`Dep`类和副作用方法`effectWatch`：


```js
// 源码实现
export class Dep {
  constructor(val) {
    this.effects = new Set()
    this._val = val
  }

  get value() {
    this.depend()
    return this._val
  }

  set value (val) {
    this._val = val
    this.notice()
  }

  // 收集依赖
  depend() {
    if (currentEffect) {
      this.effects.add(currentEffect)
    }
  }

  // 触发依赖
  notice() {
    this.effects.forEach(effect => {
      effect()
    })
  }
}

let currentEffect
export function effectWatch(effect) {
  currentEffect = effect
  effect()
  currentEffect = null
}
```

```js
// 测试用例
let dep = new Dep(10)
let b
effectWatch(() => {
  b = dep.value + 10
  console.log(b)
})
dep.value = 20
```

我们从测试用例代码看起：

1. `let dep = new Dep(10)`这句代码创建了一个`Dep`实例`dep`。这相当于创建了一个响应式数据，此后`dep.value`触发getter即`get value()`方法收集依赖；`dep.value =`的赋值语句触发setter即`set value()`方法触发依赖通知更新。
2. `effectWatch(() => {})`这句代码，先把内部的`effect`回调函数`() => {}`保存在全局变量`currentEffect`上；然后执行`effect`回调函数；然后再把`currentEffect`重置为null。这个先暂存再清空的操作，咋一看是不是有点脱裤子放屁的感觉？别急，原因在`effect`回调函数里。
3. `b = dep.value + 10`这句代码中`dep.value`会触发`get value()`方法，`get value()`方法又接着调用`depend()`方法收集依赖，`depend()`方法体内判断全局的`currentEffect`为true（因为刚才我们已经把`effect`暂存到`currentEffect`上了），所以会把`effect`收集为依赖。当`effect`执行完毕，重新把`currentEffect`置为null，方便下一次依赖收集的条件判断。这就解释了第2步的困惑。
4. 紧接着`console.log(b)`这句，算得结果，**打印20**。
5. `dep.value = 20`这句代码触发`set value()`方法，接着调用`notice()`方法，`notice()`方法内部遍历依赖`effects`执行其中的所有依赖，于是再次调用`effect()`，**打印30**。注意，这次调用`effect`不是再次触发了`get value()`吗，不会造成重复收集依赖吗？这就是为什么我们使用`Set`数据结构来收集依赖，就是为了防止重复收集。

至此，调用过程分析清楚了，看起来很像Vue3的`ref`API了，接下来我们实现`reactive`API。






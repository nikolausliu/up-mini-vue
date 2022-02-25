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

## v4 初步实现Dep和effectWatch

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

# v5 实现reactive

```js
// 源码实现
let targetMap = new Map()
export function reactive(raw) {
  // target是对象，key是对象的key
  // targetMap是以对象为key，depsMap为值的Map
  // depsMap是以对象的key为key，dep实例为值的Map
  const getDep = (target, key) => {
    // 先以对象为key获取targetMap上存储的depsMap
    let depsMap = targetMap.get(target)
    // 如果获取不到，需要初始化一个depsMap存储到targetMap上
    if (!targetMap.get(target)) {
      depsMap = new Map()
      targetMap.set(target, depsMap)
    }
    // 以对象的key为key，获取depsMap上存储的dep实例
    let dep = depsMap.get(key)
    // 如果获取不到，需要初始化dep实例存储到depsMap上
    if (!depsMap.get(key)) {
      dep = new Dep()
      depsMap.set(key, dep)
    }
    return dep
  }

  return new Proxy(raw, {
    get(target, key) {
      const dep = getDep(target, key)
      // 在getter中 收集依赖
      dep.depend()
      return Reflect.get(target, key)
    },
    set(target, key, value) {
      const dep = getDep(target, key)
      const result = Reflect.set(target, key, value)
      // 在setter中 通知更新
      dep.notice()
      return result
    }
  })
}
```

```js
// 测试用例
import { reactive, effectWatch } from './core/reactivity/index.js'

const user = reactive({
  age: 18
})
effectWatch(() => {
  const double = user.age * 2
  console.log(double)
})
user.age++
```

在vue3中reactive使用Proxy来代理对象实现响应式。首先明确代码中的几个概念：

- target: 被代理的对象
- key: 被代理的对象上的属性key
- targetMap: 一个全局的Map数据结构，用来保存被代理对象上的依赖集合，其key是被代理的对象target，值是depsMap
- depsMap: 一个Map数据结构，每个被代理的对象都有一个depsMap，用来保存其依赖dep实例，其key是对象的key，值是dep实例。

调用`reactive()`会返回一个被代理的响应式对象。当触发对象上某个key的getter时，先**获取这个key对应的dep实例**，然后调用`dep.depend()`收集依赖。当触发对象上某个key的setter时，先获取这个key对应的dep实例，然后调用`dep.notice`触发依赖通知更新。

上面**获取dep实例*的过程(`getDep()`)是：先通过target获取到全局targetMap上存储的depsMap，如果没有，就先创建depsMap在存储。然后通过key获取到depsMap上保存的dep实例，如果没有就先创建dep实例再存储。

至此，reactive也基本分析完了。

# P2 setup&render

## v6 初步实现setup与render

到目前为止，我们实现的响应式都是通过`console.log`来打印数据，怎么实现视图与数据的绑定呢？接下来我们来实现vue3的setup与render。

```html
<div id="#app"></div>
<script src="./index.js" type="module"></script>
```

```js
// index.js
import App from './App.js'
import { createApp } from './core/index.js'
createApp(App).mount(document.getElementById('app'))
```

```js
// App.js
import { reactive } from './core/reactivity/index.js'
export default {
  render(context) {
    const div = document.createElement('div')
    div.innerText = context.state.count
    return div
  },

  setup() {
    const state = reactive({
      count: 0
    })
    window.state = state
    return {
      state
    }
  }
}
```

```js
// core/index.js
import { effectWatch } from './reactivity/index.js'

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      const context = rootComponent.setup()
      effectWatch(() => {
        const element = rootComponent.render(context)
        rootContainer.innerHTML = ''
        rootContainer.appendChild(element)
      })
    }
  }
}
```

上面的代码已经和vue3的初始代码很相似了。首先是`App.js`中定义了setup和render，render函数可以看成是我们实际`App.vue`中的模板部分，先不考虑vdom的实现，我们这里直接简单的返回一个div，div的文本由setup函数返回的响应式数据提供上下文，这样`App.render(App.setup())`就返回了一个文本节点为响应式对象的div，后面我们会消费这个div。

接着我们来看`createApp`函数，与vue3的API保持一致，`createApp(App)`会返回一个有mount方法的对象，调用mount方法，会首先通过调用`rootComponent.setup()`获取到响应式对象上下文，然后调用`rootComponent.render(context)`获取到我们前面说过的创建的div，最后把div追加到根节点上。

当然上一步需要被包裹在effectWatch中才能触发依赖收集，并在响应式数据发生变更时更新视图。此时我们在浏览器控制台输入`state.count++`可以看到界面的数字会从0开始递增。

到目前为止我们简单地完成了响应式数据与视图的绑定，但是现在是直接销毁根容器内的dom并重新创建的，开销比较大，下面我们会实现vdom。

## v7实现虚拟dom的h函数和mountElement函数

```js
// /core/h.js
export function h(tag, props, children) {
  return {
    tag,
    props,
    children
  }
}
```

```js
// /core/renderer/index.js
export function mountElement(vnode, container) {
  const { tag, props, children } = vnode

  // 根据tag创建element
  const el = document.createElement(tag)

  if (props) {
    // 如果有props，则遍历props，设置attribute
    for (const key in props) {
      const val = props[key]
      el.setAttribute(key, val)
    }
  }

  if (Array.isArray(children)) {
    // 1. 如果children是数组，则递归
    children.forEach(v => {
      mountElement(v, el)
    })
  } else {
    // 2. 否则，创建文本节点并插入
    const textNode = document.createTextNode(children)
    el.appendChild(textNode)
  }

  container.appendChild(el)
}
```

```js
// App.js
// ...
render(context) {
  return h('div', null, context.state.count)
},
// ...
```

```js
// /core/index.js
// ...
effectWatch(() => {
  rootContainer.innerHTML = ''
  const subTree = rootComponent.render(context)
  mountElement(subTree, rootContainer)
})
// ...
```

`h`函数接收三个参数，分别是标签名tag、属性集合对象props、子元素children，最终返回的vdom，其实就是一个对象，用对象来表示真实的对象。

这样`render`函数内最终返回的就是由`h()`函数生成的vdom，然后在`createApp`函数内，我们再调用`mountElement`函数把vdom生成真实的dom插入到根容器中，这个函数中需要注意的点是：如果children是一个数组，需要遍历这个数组，并递归调用`mountElement`来把vdom中的所有children都生成对应的真实dom。

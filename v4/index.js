import { Dep, effectWatch } from './core/reactivity/index.js'

// 1. 首先创建了一个dep实例 dep._val = 10
let a = new Dep(10)
let b
// 2. 调用effectWatch
effectWatch(() => {
  // 2.1 currentEffect = callback
  // 2.2 callback()
    // 2.2.1 a.value触发dep的get value()方法，触发 收集依赖dep.depend()方法，此时callback被收集进dep.effects
    // 2.2.2 b计算结果为20
    b = a.value + 10
    // 2.2.3 【打印结果】 20
    console.log(b)
  // 2.3 currentEffect = null
})
// 3. 赋值语句触发 dep的set value()方法，触发 触发依赖dep.notice()方法
a.value = 20
  // 3.1 再次执行callback，【打印结果】 30
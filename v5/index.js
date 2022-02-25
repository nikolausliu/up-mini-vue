import { reactive, effectWatch } from './core/reactivity/index.js'

const user = reactive({
  age: 18
})
effectWatch(() => {
  const double = user.age * 2
  console.log(double)
})
user.age++
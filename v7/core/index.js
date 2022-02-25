import { effectWatch } from './reactivity/index.js'
import { mountElement } from './renderer/index.js'

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      const context = rootComponent.setup()
      effectWatch(() => {
        rootContainer.innerHTML = ''
        // const element = rootComponent.render(context)
        // rootContainer.appendChild(element)
        const subTree = rootComponent.render(context)
        mountElement(subTree, rootContainer)
      })
    }
  }
}
import hljs from 'highlight.js'
import { marked } from 'marked'
import type { Directive, DirectiveHook } from 'vue'
import { nextTick } from 'vue'


const render = new marked.Renderer()
marked.setOptions({
  renderer: render,
  gfm: true,
  pedantic: false
})


const formatValue: DirectiveHook = async (el, binding) => {
  const html = marked(binding?.value ?? '')

  el.innerHTML = html
  await nextTick()

  if (binding.arg === 'hl') {
    const blocks = el.querySelectorAll('pre code')
    blocks.forEach((block: any) => {
      hljs.highlightBlock(block)
    })
  }
}


export const markedDirective: Directive = {
  mounted: formatValue,
  updated: formatValue
}

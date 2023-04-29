import DOMPurify from "dompurify"
import { useEffect, useMemo, useState } from "preact/hooks"
import { useParams } from "react-router-dom"
import useStore from "../store"
console.log(DOMPurify)

class AppContainer extends HTMLElement {
  connectedCallback() {
    const root = this.attachShadow({ mode: "open" })
    root.innerHTML = this.getAttribute("html")!
  }
  static get observedAttributes() {
    return ["html"]
  }
  attributeChangedCallback(_: unknown, _2: unknown, newValue: string) {
    if (this.shadowRoot) this.shadowRoot.innerHTML = newValue
  }
}

// declare global {
//   namespace preact.createElement.JSX {
//     interface IntrinsicElements {
//       "app-container": Partial<{ html: string, children: any }>;
//     }
//   }
// }

customElements.define("app-container", AppContainer)

const AppContainerElement = "app-container" as any

export function Component() {
  const [html, setHtml] = useState<string | null>(null)
  // <wbr> is for fixing a bug of sanitizing <style />
  const sanitizedHtml = useMemo(
    () =>
      html
        ? DOMPurify.sanitize("<wbr>" + html, {
            ADD_TAGS: ["style"]
          })
        : "",
    [html]
  )
  const appHook = useStore(state => state.appHook)
  const { name } = useParams()
  useEffect(() => {
    if (appHook === null) return
    ;(async () => {
      setHtml((await appHook(name!))?.html ?? null)
    })()
  }, [appHook, name])
  return <AppContainerElement html={sanitizedHtml} />
}

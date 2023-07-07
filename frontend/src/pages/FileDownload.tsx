import { useEffect, useState } from "preact/hooks"
import { useTitle } from "../tools"
import { useNavigate, useParams } from "react-router-dom"
import rpc from "../network"

export function Component() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [fileName, setFileName] = useState<string | null>(null)

  useTitle(fileName ? `Downloading "${fileName}"` : "Downloading file")

  useEffect(() => {
    ;(async () => {
      const { name, url } = await rpc.file.download(id!)
      setFileName(name)
      const content = await (await fetch(url)).blob()
      const element = document.createElement("a")
      element.download = name
      element.href = URL.createObjectURL(content)
      element.target = "_blank"
      element.click()
      if (history.length == 1) {
        navigate("/")
      } else {
        navigate(-1)
      }
    })()
  }, [])
  return null
}

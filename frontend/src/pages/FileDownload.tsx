import { useEffect } from "react"
import { useNetwork } from "../tools"
import { useNavigate, useParams } from "react-router-dom"

export default function FileDownload() {
  const { makeRequest } = useNetwork()
  const { id } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    (async () => {
      const { usrname: name, msg: url } = await makeRequest({
        type: "file_download",
        msg: id
      })
      const content = await (await fetch(url)).blob()
      const element = document.createElement("a")
      element.download = name
      element.href = URL.createObjectURL(content)
      element.target = "_blank"
      ;(window as any).e = element
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


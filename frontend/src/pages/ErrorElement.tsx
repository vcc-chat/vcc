import { useEffect } from "preact/hooks"
import { useTranslation } from "react-i18next"
import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom"
import { useTitle } from "../tools"

export default function NotFound({ content }: {
  content: string
}) {
  const error = useRouteError()
  const { t } = useTranslation()
  useEffect(() => {
    console.error(error)
  })

  const errorData = isRouteErrorResponse(error) ? `${error.status} ${error.data}` : content

  useTitle(errorData)

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">{errorData}</h1>
          <Link className="btn btn-primary mt-4" to="/">{t("Go back to home")}</Link>
        </div>
      </div>
    </div>
  )
}
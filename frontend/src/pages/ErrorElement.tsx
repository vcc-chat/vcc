import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom"

export default function NotFound({ content }: {
  content: string
}) {
  const error = useRouteError()
  return (
    <div className="flex-1 bg-gray-900 flex">
      <div className="m-auto font-mono text-3xl flex flex-col text-gray-100">
        <div className="mx-auto">{isRouteErrorResponse(error) ? `${error.status} ${error.data}` : content}</div>
        <div className="mx-auto">
          <Link className="text-gray-100 no-underline hover:text-gray-50" to="/">Go back to home</Link>
        </div>
      </div>
    </div>
  )
}
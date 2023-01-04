import styled from "@emotion/styled"
import { Link as RawLink, useRouteError, isRouteErrorResponse } from "react-router-dom"

const Root = styled.div`
  flex: 1;
  background: var(--gray-900);
  display: flex;
`

const Center = styled.div`
  margin: auto;
  font-family: monospace;
  font-size: 2em;
  display: flex;
  flex-direction: column;
`

const Item = styled.div`
  color: var(--gray-100);
  margin-left: auto;
  margin-right: auto;
`

const Link = styled(RawLink)`
  color: inherit;
  text-decoration: none;
  &:hover {
    color: var(--gray-50);
  }
`

export default function NotFound({ content }: {
  content: string
}) {
  const error = useRouteError()
  return (
    <Root>
      <Center>
        <Item>{isRouteErrorResponse(error) ? `${error.status} ${error.data}` : content}</Item>
        <Item>
          <Link to="/">Go back to home</Link>
        </Item>
      </Center>
    </Root>
  )
}
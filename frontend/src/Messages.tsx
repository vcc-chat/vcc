import styled from "styled-components"

export const Messages = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: auto;
  scrollbar-width: thin;
`

export const MessageTime = styled.div`
  display: none;
  color: var(--gray-500);
  margin-top: auto;
  margin-bottom: auto;
  margin-left: auto;
  margin-right: 1em;
  font-size: 0.75rem;
  font-weight: var(--normal-weight);
`

export const Message = styled.div`
  list-style-type: none;
  margin: 0.1em;
  :hover ${MessageTime} {
    display: block;
  }
`
export const MessageTitle = styled.div`
  display: flex;
  font-size: 1.25rem;
  font-weight: var(--bold-weight);
`
export const MessageBody = styled.div`
  
`
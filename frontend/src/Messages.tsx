import styled from "styled-components"

export const Messages = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: auto;
  scrollbar-width: thin;
  ::-webkit-scrollbar {
    width: 7px;
    background-color: var(--gray-200);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--gray-300);
    border-radius: 1px;
    &:hover {
      background: var(--gray-400);
    }
    &:active {
      background: var(--gray-500);
    }
  }
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

export const Message = styled.li`
  list-style-type: none;
  margin: 0.1em;
  &:hover {
    background-color: var(--gray-100);
  }
  &:hover ${MessageTime} {
    display: block;
  }
  padding: 0.1em;
`
export const MessageTitle = styled.div`
  display: flex;
  font-size: 1.25rem;
  font-weight: var(--bold-weight);
  line-break: anywhere;
`
export const MessageBody = styled.div`
  line-break: anywhere;
  white-space: pre-wrap;
`


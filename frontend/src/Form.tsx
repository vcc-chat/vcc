import styled from "styled-components"

export const FormList = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0.5em;
`
export const FormItem = styled.div`
  display: flex;
  & + & {
    margin-top: 0.1em;
  }
`

export const FormInput = styled.input`
  outline: none;
  padding: 0.1em;
`

export const FormSelect = styled.div`
  display: flex;
  flex-direction: column;
`
export const SendButtonContainer = styled.div`
  display: flex;
`

export const FormBottom = styled.div`
  visibility: hidden;
  margin-top: auto;
`
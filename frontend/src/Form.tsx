import styled from "styled-components"

export const FormList = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.5em;
  height: 100%;

`
export const FormItem = styled.div`
  display: flex;
  & + & {
    margin-top: 0.1em;
  }
`

export const FormInput = styled.input`
  outline: none;
  border-width: 1px;
  border-color: var(--gray-400);
  padding: 0.5em;
  font-family: inherit;
  letter-spacing: inherit;
  background-color: var(--gray-200);
  width: 100%;
  border: none;
`

export const FormInputBig = styled(FormInput)`
  border-top: 1px solid var(--gray-400);
  padding-bottom: 4em;
`

export const FormSelect = styled.div`
  display: flex;
  flex-direction: column;
`
export const SendButton = styled.button`
  display: flex;
  position: absolute;
  bottom: 0;
  right: 0;
  border: none;
  padding: 0.5em;
  border-radius: 0.2em;
  background-color: var(--gray-300);
  font-family: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  border-bottom-right-radius: 0.5em;
`

export const Form = styled.div`
  margin-top: auto;
  margin-bottom: 0.5em;
  margin-left: 0.2em;
  margin-right: 0.2em;
  display: flex;
  flex-direction: column;
  position: relative;
  
`

export const FormInputs = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 0.5em;
  overflow: hidden;
`
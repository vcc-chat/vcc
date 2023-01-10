import styled from "@emotion/styled"
import { useState, useEffect } from "react"
import { Accordion, AccordionDetails, AccordionSummary, AppBar, Toolbar, Typography, Container as RawContainer, TextField } from "@mui/material"
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material"

import { usePlugin } from "../Plugin"

const Root = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`

const MonospaceTypography = styled(Typography)`
  font-family: monospace;
  white-space: pre-wrap;
`

const MonospaceTextField = styled(TextField)`
  .MuiInput-input {
    font-family: monospace;
  }
`

const Container = styled(RawContainer)`
  margin-top: 2em;
`

function Item({ code, index }: {
  code: string,
  index: number
}) {
  const [modifiedCode, setModifiedCode] = useState("")
  useEffect(() => {
    setModifiedCode(code)
  }, [code])
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
      >
        <Typography>Plugin {index + 1}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <MonospaceTypography>{code}</MonospaceTypography>
        <MonospaceTextField multiline value={modifiedCode} onChange={ev => {
          setModifiedCode(ev.target.value)
        }} variant="standard" fullWidth />
      </AccordionDetails>
    </Accordion>
  )
}

export default function Plugin() {
  const { plugins } = usePlugin()
  return (
    <Root>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Plugin Settings
          </Typography>
        </Toolbar>
      </AppBar>
      <Container>
        {plugins.map((plugin, index) => (
          <Item code={plugin} index={index} key={plugin} />
        ))}
      </Container>
    </Root>
  )
}
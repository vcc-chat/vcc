import type { Request } from "./config"

declare global {
  interface Window {
    makeRequest: (req: Request) => Promise<Request>
    _makeRequest: (req: Request) => Promise<Request>
    sendJsonMessage: (req: Request) => Promise<void>
    _sendJsonMessage: (req: Request) => void
  }
}
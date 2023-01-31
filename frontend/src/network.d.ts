import type { Request } from "./config"

// declare global {
//   interface Window {
//     makeRequest: (req: {
//       type: RequestType,
//       uid?: number,
//       usrname?: string,
//       msg?: string
//     }) => Promise<Request>
//     _makeRequest: (req: Request) => Promise<Request>
//     sendJsonMessage: (req: Request) => Promise<void>
//     _sendJsonMessage: (req: Request) => void
//   }
// }
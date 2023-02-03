/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-svgr/client" />

import type { ComponentChildren } from "preact"

declare module "react" {
  type ReactNode = ComponentChildren
  type ComponentType<T = any> = any
  type ComponentPropsWithoutRef<T = any> = any
}
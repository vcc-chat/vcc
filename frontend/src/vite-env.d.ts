/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-svgr/client" />

import type { ComponentChildren, ComponentType as ComponentTypePreact, ComponentProps, JSX } from "preact"

declare module "react" {
  type ReactNode = ComponentChildren
  type ComponentType<P = {}> = ComponentTypePreact<P>
  type ComponentPropsWithoutRef<C extends any> = Omit<ComponentProps<C>, "ref">
}
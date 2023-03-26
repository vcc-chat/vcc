import { Outlet } from "react-router-dom"

import { MainLayout } from "../components/Sidebar"

export function Component(props: {}) {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  )
}
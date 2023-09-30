import { Outlet } from "react-router-dom"

import { MainLayout } from "../components/Sidebar"

export function Component() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  )
}

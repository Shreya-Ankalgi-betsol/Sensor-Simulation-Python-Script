import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Threats } from "./pages/Threats";
import { Sensors } from "./pages/Sensors";
import { Visualization } from "./pages/Visualization";
import { Profile } from "./pages/Profile";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "threats", Component: Threats },
      { path: "sensors", Component: Sensors },
      { path: "visualization", Component: Visualization },
      { path: "profile", Component: Profile },
    ],
  },
]);
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ThreatsBackend } from "./pages/ThreatsBackend";
import { Sensors } from "./pages/Sensors";
import { Visualization } from "./pages/Visualization";
import { Profile } from "./pages/Profile";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "threats", Component: ThreatsBackend },
      { path: "sensors", Component: Sensors },
      { path: "visualization", Component: Visualization },
      { path: "profile", Component: Profile },
    ],
  },
]);
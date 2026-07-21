import { Route, Routes } from "react-router-dom";

import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import SignInPage from "@/pages/SignIn";
import SignUpPage from "@/pages/SignUp";

import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import OverviewPage from "@/pages/dashboard/OverviewPage";
import ProjectsHubPage from "@/pages/dashboard/ProjectsHubPage";
import ProjectsPage from "@/pages/dashboard/ProjectsPage";
import MyTasksPage from "@/pages/dashboard/MyTasksPage";
import GoalsPage from "@/pages/dashboard/GoalsPage";
import ReportsPage from "@/pages/dashboard/ReportsPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="projects" element={<ProjectsHubPage />} />
          <Route path="projects/:projectId" element={<ProjectsPage />} />
          <Route path="daily" element={<ProjectsPage />} />
          <Route path="my-tasks" element={<MyTasksPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

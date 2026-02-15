import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ShellLayout from './components/ShellLayout.jsx';
import { LEGACY_MODULE_ROUTES, LEGACY_SETTINGS_ROUTES } from './config/legacyRoutes.js';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import LogoutPage from './pages/LogoutPage.jsx';
import ModuleWorkspacePage from './pages/ModuleWorkspacePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={(
          <ProtectedRoute>
            <ShellLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="modules/:moduleKey" element={<ModuleWorkspacePage />} />
        <Route path="modules/:moduleKey/:viewKey" element={<ModuleWorkspacePage />} />
        {LEGACY_MODULE_ROUTES.map((routeItem) => (
          <Route
            key={routeItem.path}
            path={routeItem.path}
            element={routeItem.path === 'sales'
              ? <Navigate to="/finance/pos" replace />
              : (
                <ModuleWorkspacePage
                  moduleKeyOverride={routeItem.moduleKey}
                  defaultTable={routeItem.table}
                  viewTitle={routeItem.title}
                />
              )}
          />
        ))}
        {LEGACY_SETTINGS_ROUTES.map((routeItem) => (
          <Route
            key={routeItem.path}
            path={routeItem.path}
            element={<SettingsPage section={routeItem.section} />}
          />
        ))}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="logout" element={<LogoutPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;

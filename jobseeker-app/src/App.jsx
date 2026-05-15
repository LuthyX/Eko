import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AuthPage from "./components/AuthPage";
import JobSeekerOnboarding from "./components/JobSeekerOnboarding";
import HomePage from "./components/HomePage";
import JobsNearYouPage from "./components/JobsNearYouPage";
import MyApplications from "./components/MyApplications";
import EarningsPage from "./components/EarningsPage";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token"),
  );

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const Protected = ({ children }) =>
    isAuthenticated ? children : <Navigate to="/auth" replace />;

  return (
    <Router>
      <Routes>
        {/* Authed users hitting /auth bounce to /onboarding — the onboarding
            screen itself checks if a profile exists and silently forwards to
            /home for returning users. New users see the form once. */}
        <Route
          path="/auth"
          element={
            !isAuthenticated ? (
              <AuthPage onAuthSuccess={handleAuthSuccess} />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />

        <Route
          path="/onboarding"
          element={
            <Protected>
              <JobSeekerOnboarding />
            </Protected>
          }
        />

        {/* Home is the new landing — dashboard view with greeting + stats */}
        <Route
          path="/home"
          element={
            <Protected>
              <HomePage />
            </Protected>
          }
        />

        <Route
          path="/jobs"
          element={
            <Protected>
              <JobsNearYouPage />
            </Protected>
          }
        />

        <Route
          path="/profile"
          element={
            <Protected>
              <MyApplications />
            </Protected>
          }
        />

        <Route
          path="/earnings"
          element={
            <Protected>
              <EarningsPage />
            </Protected>
          }
        />

        {/* Fallback: authed users go to /home, everyone else to /auth */}
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? "/home" : "/auth"} replace />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;

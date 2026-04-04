import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import Login from "./components/Login";
import Register from "./components/Register";
import MealCreator from "./components/MealCreator";
import MealTracker from "./components/MealTracker";
import GoalTracking from "./components/GoalTracking";
import GroceryList from "./components/GroceryList";

function App() {
  const [isDark, setIsDark] = useState(true);

  return (
    <AuthProvider>
      <div
        className={`min-h-screen transition-colors duration-700 ${isDark ? "bg-[#0C0B09] text-stone-100" : "bg-[#FAFAF9] text-stone-900"}`}
      >
        {/* The Navbar is now locked here at the global level! */}
        <Navbar isDark={isDark} toggleDark={() => setIsDark(!isDark)} />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage isDark={isDark} />} />
          <Route path="/login" element={<Login isDark={isDark} />} />
          <Route path="/register" element={<Register isDark={isDark} />} />

          {/* Protected Route (Meal Creation) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MealCreator isDark={isDark} />
              </ProtectedRoute>
            }
          />

          {/* Protected Route (Meal Tracker) */}
          <Route
            path="/tracker"
            element={
              <ProtectedRoute>
                <MealTracker isDark={isDark} />
              </ProtectedRoute>
            }
          />

          {/* Protected Route (Goal Tracking) */}
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <GoalTracking isDark={isDark} />
              </ProtectedRoute>
            }
          />

          {/* Protected Route (Grocery List) */}
          <Route
            path="/grocery"
            element={
              <ProtectedRoute>
                <GroceryList isDark={isDark} />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;

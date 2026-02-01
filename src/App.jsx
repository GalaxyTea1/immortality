import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GameProvider } from "./context/GameContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Cultivation from "./pages/Cultivation";
import World from "./pages/World";
import Inventory from "./pages/Inventory";
import Shop from "./pages/Shop";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import "./index.css";

/**
 * Protected Route Component
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">⟳</div>
        <p>Đang kết nối tu tiên giới...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Public route - Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <GameProvider>
                <Layout />
              </GameProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="cultivation" element={<Cultivation />} />
          <Route path="world" element={<World />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="shop" element={<Shop />} />
          <Route path="leaderboard" element={<Leaderboard />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

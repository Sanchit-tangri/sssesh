import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import Lobby from "./components/Lobby.tsx";
import Room from "./components/Room.tsx";
import Auth from "./components/Auth.tsx";
import { motion, AnimatePresence } from "motion/react";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen text-white/50">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/auth" />;
}

function AppContent() {
  return (
    <div className="relative min-h-screen">
      <div className="atmosphere" />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <PrivateRoute>
              <Lobby />
            </PrivateRoute>
          } />
          <Route path="/room/:id" element={
            <PrivateRoute>
              <Room />
            </PrivateRoute>
          } />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

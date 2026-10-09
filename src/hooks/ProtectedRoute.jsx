import { Navigate, useLocation } from "react-router-dom";
import { UserAuth } from "../context/contextoAuth";
import { Landing } from "../landing/Landing";

export function ProtectedRoute({ children, accessBy }) {
  const { user } = UserAuth();
  const { pathname } = useLocation();
  if (accessBy === "non-authenticated") {
    return user ? <Navigate to="/" replace /> : children;
  }
  // En "/" quien no ha iniciado sesión ve la página pública de Stockly (la que lee Google).
  if (!user && pathname === "/") return <Landing />;
  return user ? children : <Navigate to="/login" replace />;
}

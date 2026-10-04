import { Navigate } from "react-router-dom";
import { UserAuth } from "../context/contextoAuth";

export function ProtectedRoute({ children, accessBy }) {
  const { user } = UserAuth();
  if (accessBy === "non-authenticated") {
    return user ? <Navigate to="/" replace /> : children;
  }
  return user ? children : <Navigate to="/login" replace />;
}

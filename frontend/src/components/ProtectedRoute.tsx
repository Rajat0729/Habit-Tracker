
import React, { type JSX } from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../utils/auth.js";

type Props = { children: JSX.Element };

export default function ProtectedRoute({ children }: Props) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

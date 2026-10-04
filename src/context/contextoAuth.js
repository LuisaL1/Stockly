import { createContext, useContext } from "react";

export const AuthContext = createContext({ user: null });

export const UserAuth = () => useContext(AuthContext);

import { createContext, useState, useEffect, type ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  userId: string | null;
  login: (token: string, userId: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUserId = localStorage.getItem("userId");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUsername(payload.sub);
        setUserId(storedUserId);
        setIsAuthenticated(true);
      } catch (e) {
        logout();
      }
    }
  }, []);

  const login = (token: string, newUserId: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", newUserId);
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUsername(payload.sub);
    } catch (e) {
      setUsername("User");
    }
    setUserId(newUserId);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setUsername(null);
    setUserId(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

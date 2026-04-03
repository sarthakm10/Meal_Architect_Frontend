import { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import {
  ChefHat,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Clock,
  UtensilsCrossed,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

interface NavbarProps {
  isDark: boolean;
  toggleDark: () => void;
}

export default function Navbar({ isDark, toggleDark }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, username, logout } = useContext(AuthContext);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? isDark
            ? "rgba(12,11,9,0.85)"
            : "rgba(250,250,249,0.85)"
          : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled
          ? isDark
            ? "1px solid rgba(255,255,255,0.05)"
            : "1px solid rgba(0,0,0,0.05)"
          : "none",
      }}
    >
      <div className="px-8 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 cursor-pointer">
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0px #FB923C00",
                "0 0 16px #FB923C55",
                "0 0 0px #FB923C00",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-400/15 border border-orange-400/30"
          >
            <ChefHat className="w-4 h-4 text-orange-500" />
          </motion.div>
          <span
            className={`font-semibold tracking-tight transition-colors duration-500 ${isDark ? "text-stone-100" : "text-stone-900"}`}
          >
            MealCraft
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={toggleDark}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-xl border transition-colors duration-500 flex items-center justify-center ${isDark ? "border-white/[0.07] bg-white/[0.04] text-stone-400 hover:text-stone-200" : "border-black/[0.07] bg-black/[0.04] text-stone-500 hover:text-stone-700"}`}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </motion.button>

          {isAuthenticated ? (
            <>
              <motion.button
                onClick={() => navigate("/dashboard")}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border transition-colors duration-500 ${isDark ? "bg-white/[0.04] border-white/[0.07] text-stone-300 hover:text-orange-400" : "bg-black/[0.04] border-black/[0.07] text-stone-600 hover:text-orange-600"}`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" /> Builder
              </motion.button>
              <motion.button
                onClick={() => navigate("/tracker")}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border transition-colors duration-500 ${isDark ? "bg-white/[0.04] border-white/[0.07] text-stone-300 hover:text-emerald-400" : "bg-black/[0.04] border-black/[0.07] text-stone-600 hover:text-emerald-600"}`}
              >
                <Clock className="w-3.5 h-3.5" /> Tracker
              </motion.button>
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isDark ? "text-stone-300" : "text-stone-700"}`}
              >
                <UserIcon className="w-4 h-4 text-orange-500" /> {username}
              </div>
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border transition-colors duration-500 ${isDark ? "bg-white/[0.04] border-white/[0.07] text-stone-300 hover:text-red-400" : "bg-black/[0.04] border-black/[0.07] text-stone-600 hover:text-red-500"}`}
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                onClick={() => navigate("/login")}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border transition-colors duration-500 ${isDark ? "bg-white/[0.04] border-white/[0.07] text-stone-300 hover:text-stone-100" : "bg-black/[0.04] border-black/[0.07] text-stone-600 hover:text-stone-900"}`}
              >
                <LogIn className="w-3.5 h-3.5" /> Log in
              </motion.button>
              <motion.button
                onClick={() => navigate("/register")}
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 0 14px rgba(251,146,60,0.22)",
                }}
                whileTap={{ scale: 0.96 }}
                className="relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm bg-orange-500 text-white font-medium overflow-hidden"
              >
                <UserPlus className="w-3.5 h-3.5" /> Sign up free
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}

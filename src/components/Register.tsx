import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import api from "../api/axios";

interface UserResponse {
  token: string;
  userId: number;
}

export default function Register({ isDark }: { isDark: boolean }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // ─── 1. STANDARD REGISTRATION ───
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await api.post<UserResponse>("/auth/register", formData);
      navigate("/login");
    } catch (err: any) {
      setError(
        err.response?.data ||
          "Registration failed. Username or Email may be taken.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ─── 2. THE FIXED GOOGLE REGISTRATION ───
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    setIsLoading(true);
    try {
      // 1. Grab the raw JWT from Google
      const rawToken = credentialResponse.credential;

      // 2. Decode the payload manually
      const decodedPayload = JSON.parse(atob(rawToken.split(".")[1]));

      // 3. Send the mapped payload to Spring Boot
      await api.post<UserResponse>("/auth/google", {
        googleId: decodedPayload.sub,
        email: decodedPayload.email,
      });

      // 4. Send them to login to complete the loop
      navigate("/login");
    } catch (err: any) {
      setError("Google authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-8 relative z-10 pt-32 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full max-w-md p-8 sm:p-10 rounded-3xl border shadow-2xl backdrop-blur-md transition-colors duration-500 ${isDark ? "bg-[#131210]/80 border-white/[0.07]" : "bg-white/80 border-black/[0.07]"}`}
      >
        <div className="text-center mb-8">
          <h1
            className={`text-3xl font-bold tracking-tight mb-2 transition-colors duration-500 ${isDark ? "text-stone-100" : "text-stone-900"}`}
          >
            Create an account
          </h1>
          <p
            className={`text-sm transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-500"}`}
          >
            Start tracking your meals and hitting your goals.
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative group">
            <UserIcon
              className={`absolute left-4 top-3.5 w-5 h-5 transition-colors ${isDark ? "text-stone-500 group-focus-within:text-orange-500" : "text-stone-400 group-focus-within:text-orange-500"}`}
            />
            <input
              type="text"
              placeholder="Unique Username"
              required
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className={`w-full pl-11 pr-4 py-3.5 rounded-xl border outline-none transition-all duration-300 text-sm font-medium ${isDark ? "bg-white/[0.03] border-white/[0.07] focus:border-orange-500/50 focus:bg-white/[0.06] text-stone-200" : "bg-black/[0.02] border-black/[0.07] focus:border-orange-500/50 focus:bg-white text-stone-800"}`}
            />
          </div>
          <div className="relative group">
            <Mail
              className={`absolute left-4 top-3.5 w-5 h-5 transition-colors ${isDark ? "text-stone-500 group-focus-within:text-orange-500" : "text-stone-400 group-focus-within:text-orange-500"}`}
            />
            <input
              type="email"
              placeholder="Email Address"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={`w-full pl-11 pr-4 py-3.5 rounded-xl border outline-none transition-all duration-300 text-sm font-medium ${isDark ? "bg-white/[0.03] border-white/[0.07] focus:border-orange-500/50 focus:bg-white/[0.06] text-stone-200" : "bg-black/[0.02] border-black/[0.07] focus:border-orange-500/50 focus:bg-white text-stone-800"}`}
            />
          </div>
          <div className="relative group">
            <Lock
              className={`absolute left-4 top-3.5 w-5 h-5 transition-colors ${isDark ? "text-stone-500 group-focus-within:text-orange-500" : "text-stone-400 group-focus-within:text-orange-500"}`}
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className={`w-full pl-11 pr-4 py-3.5 rounded-xl border outline-none transition-all duration-300 text-sm font-medium ${isDark ? "bg-white/[0.03] border-white/[0.07] focus:border-orange-500/50 focus:bg-white/[0.06] text-stone-200" : "bg-black/[0.02] border-black/[0.07] focus:border-orange-500/50 focus:bg-white text-stone-800"}`}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-lg shadow-orange-500/20"
          >
            {isLoading ? "Creating account..." : "Sign up free"}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </motion.button>
        </form>

        <div className="mt-8 relative flex items-center justify-center">
          <div
            className={`absolute inset-x-0 h-px transition-colors duration-500 ${isDark ? "bg-white/[0.07]" : "bg-black/[0.07]"}`}
          />
          <span
            className={`relative px-4 text-xs font-medium tracking-wider transition-colors duration-500 ${isDark ? "bg-[#131210] text-stone-500" : "bg-white text-stone-400"}`}
          >
            OR CONTINUE WITH
          </span>
        </div>

        <div className="mt-6 flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              setError("Google Registration Failed. Please try again.")
            }
            theme={isDark ? "filled_black" : "outline"}
            size="large"
            text="signup_with"
            shape="pill"
          />
        </div>

        <p
          className={`mt-8 text-center text-sm transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-500"}`}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-orange-500 font-semibold hover:underline"
          >
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

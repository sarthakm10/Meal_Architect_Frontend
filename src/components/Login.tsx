import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, Flame } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

interface UserResponse {
  token: string;
  userId: number;
}

// ─── Floating food emojis in the background ───
const FOOD_ITEMS = [
  "🍜",
  "🥗",
  "🍕",
  "🥑",
  "🍣",
  "🧆",
  "🫕",
  "🥘",
  "🍱",
  "🧁",
  "🥩",
  "🍋",
  "🫙",
  "🌿",
];

const FloatingFood = ({
  emoji,
  delay,
  x,
  duration,
}: {
  emoji: string;
  delay: number;
  x: number;
  duration: number;
}) => (
  <motion.div
    className="absolute text-2xl select-none pointer-events-none"
    style={{
      left: `${x}%`,
      bottom: "-60px",
      filter: "opacity(0.18) blur(0.3px)",
    }}
    animate={{
      y: [0, -window.innerHeight - 100],
      rotate: [0, 360],
      scale: [0.8, 1.1, 0.9],
    }}
    transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
  >
    {emoji}
  </motion.div>
);

// ─── Animated gradient orbs ───
const GradientOrb = ({ className }: { className: string }) => (
  <motion.div
    className={`absolute rounded-full blur-[80px] opacity-30 ${className}`}
    animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
  />
);

export default function Login({ isDark }: { isDark: boolean }) {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();

  // ─── 1. STANDARD LOGIN ───
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await api.post<UserResponse>("/auth/login", formData);
      login(res.data.token, res.data.userId.toString());
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── 2. GOOGLE LOGIN ───
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    setIsLoading(true);
    try {
      const rawToken = credentialResponse.credential;
      const decodedPayload = JSON.parse(atob(rawToken.split(".")[1]));
      const res = await api.post<UserResponse>("/auth/google", {
        googleId: decodedPayload.sub,
        email: decodedPayload.email,
      });
      login(res.data.token, res.data.userId.toString());
      navigate("/dashboard");
    } catch (err: any) {
      setError("Google authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const floatingFoods = FOOD_ITEMS.map((emoji, i) => ({
    emoji,
    delay: i * 1.3,
    x: (i * 7.2 + 3) % 95,
    duration: 12 + (i % 5) * 2,
  }));

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-700 ${
        isDark ? "bg-[#0c0b09]" : "bg-[#faf6f1]"
      }`}
    >
      {/* ── Grain texture overlay ── */}
      <div className="grain-overlay" />

      {/* ── Gradient orbs ── */}
      <GradientOrb
        className={`w-[500px] h-[500px] -top-40 -right-20 ${isDark ? "bg-orange-600" : "bg-orange-300"}`}
      />
      <GradientOrb
        className={`w-[400px] h-[400px] -bottom-32 -left-20 ${isDark ? "bg-amber-700" : "bg-amber-200"}`}
      />
      <motion.div
        className={`absolute w-[300px] h-[300px] rounded-full blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isDark ? "bg-red-900/30" : "bg-rose-100/60"}`}
        animate={{ scale: [1, 1.4, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Floating food emojis ── */}
      {floatingFoods.map((item, i) => (
        <FloatingFood key={i} {...item} />
      ))}

      {/* ── Diagonal decorative lines ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {[...Array(8)].map((_, i) => (
          <line
            key={i}
            x1={`${i * 15 - 10}%`}
            y1="0%"
            x2={`${i * 15 + 30}%`}
            y2="100%"
            stroke={isDark ? "white" : "black"}
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* ── Main card ── */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 w-full max-w-md mx-4 float-card font-body`}
      >
        {/* Card glow ring */}
        <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-br from-orange-500/30 via-transparent to-amber-500/20 blur-sm" />

        <div
          className={`relative rounded-[28px] border overflow-hidden transition-colors duration-500 ${
            isDark
              ? "bg-[#131210]/90 border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
              : "bg-white/90 border-black/[0.06] shadow-[0_32px_80px_rgba(0,0,0,0.12)]"
          }`}
          style={{ backdropFilter: "blur(24px)" }}
        >
          {/* Top accent bar */}
          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

          <div className="px-8 pt-8 pb-10">
            {/* ── Brand header ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-center mb-8"
            >
              {/* Logo badge */}
              <div className="flex justify-center mb-4">
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30"
                >
                  <Flame className="w-7 h-7 text-white" fill="white" />
                </motion.div>
              </div>

              <h1
                className={`font-display text-4xl font-bold leading-tight mb-1 ${isDark ? "text-stone-100" : "text-stone-900"}`}
              >
                Welcome back
              </h1>
              <p
                className={`font-body text-sm font-light tracking-wide ${isDark ? "text-stone-500" : "text-stone-400"}`}
              >
                Sign in to{" "}
                <span className="shimmer-text font-semibold">MealCraft</span>{" "}
                and keep crafting
              </p>
            </motion.div>

            {/* ── Error message ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium tracking-wide">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Form ── */}
            <motion.form
              onSubmit={handleLogin}
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              {/* Email / Username field */}
              <div
                className={`relative rounded-xl border transition-all duration-300 glow-border ${
                  focusedField === "identifier"
                    ? isDark
                      ? "border-orange-500/50 bg-white/[0.05]"
                      : "border-orange-500/50 bg-orange-50/60"
                    : isDark
                      ? "border-white/[0.07] bg-white/[0.03]"
                      : "border-black/[0.07] bg-black/[0.02]"
                }`}
              >
                <Mail
                  className={`absolute left-4 top-3.5 w-4 h-4 transition-colors duration-300 ${focusedField === "identifier" ? "text-orange-500" : isDark ? "text-stone-600" : "text-stone-400"}`}
                />
                <input
                  type="text"
                  placeholder="Username or Email"
                  required
                  value={formData.identifier}
                  onChange={(e) =>
                    setFormData({ ...formData, identifier: e.target.value })
                  }
                  onFocus={() => setFocusedField("identifier")}
                  onBlur={() => setFocusedField(null)}
                  className={`input-field w-full pl-11 pr-4 py-3.5 bg-transparent outline-none text-sm font-medium rounded-xl ${isDark ? "text-stone-200" : "text-stone-800"}`}
                />
              </div>

              {/* Password field */}
              <div
                className={`relative rounded-xl border transition-all duration-300 glow-border ${
                  focusedField === "password"
                    ? isDark
                      ? "border-orange-500/50 bg-white/[0.05]"
                      : "border-orange-500/50 bg-orange-50/60"
                    : isDark
                      ? "border-white/[0.07] bg-white/[0.03]"
                      : "border-black/[0.07] bg-black/[0.02]"
                }`}
              >
                <Lock
                  className={`absolute left-4 top-3.5 w-4 h-4 transition-colors duration-300 ${focusedField === "password" ? "text-orange-500" : isDark ? "text-stone-600" : "text-stone-400"}`}
                />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className={`input-field w-full pl-11 pr-4 py-3.5 bg-transparent outline-none text-sm font-medium rounded-xl ${isDark ? "text-stone-200" : "text-stone-800"}`}
                />
              </div>

              {/* Submit button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={isLoading}
                className="relative w-full mt-1 py-3.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70"
                style={{
                  background:
                    "linear-gradient(135deg, #f97316 0%, #ea580c 60%, #c2410c 100%)",
                }}
              >
                {/* Button shimmer overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                    ease: "easeInOut",
                  }}
                />
                <span className="relative z-10">
                  {isLoading ? "Signing in…" : "Sign in to MealCraft"}
                </span>
                {!isLoading && (
                  <motion.span
                    className="relative z-10"
                    animate={{ x: [0, 4, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                )}
                {/* Shadow glow */}
                <div className="absolute inset-0 rounded-xl shadow-lg shadow-orange-500/30 pointer-events-none" />
              </motion.button>
            </motion.form>

            {/* ── Divider ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="my-6 relative flex items-center justify-center"
            >
              <div
                className={`absolute inset-x-0 h-px ${isDark ? "bg-white/[0.07]" : "bg-black/[0.07]"}`}
              />
              <span
                className={`relative px-4 text-[11px] font-medium tracking-widest uppercase ${isDark ? "bg-[#131210] text-stone-600" : "bg-white text-stone-400"}`}
              >
                or continue with
              </span>
            </motion.div>

            {/* ── Google Login ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex justify-center"
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setError("Google Login Failed. Please try again.")
                }
                theme={isDark ? "filled_black" : "outline"}
                size="large"
                text="continue_with"
                shape="pill"
              />
            </motion.div>

            {/* ── Sign up link ── */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className={`mt-7 text-center text-xs tracking-wide ${isDark ? "text-stone-500" : "text-stone-400"}`}
            >
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-orange-500 font-semibold hover:text-orange-400 transition-colors underline underline-offset-2 decoration-dotted"
              >
                Sign up free
              </Link>
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom tagline ── */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.35, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className={`absolute bottom-6 left-0 right-0 text-center font-display text-xs tracking-[0.25em] uppercase pointer-events-none ${isDark ? "text-stone-400" : "text-stone-500"}`}
      >
        Craft every meal with intention
      </motion.p>
    </div>
  );
}

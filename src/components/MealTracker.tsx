import { useState, useEffect, useContext, useCallback, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
} from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  X,
  Clock,
  Flame,
  TrendingUp,
  UtensilsCrossed,
  Zap,
  Search,
} from "lucide-react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface Ingredient {
  id: number;
  name: string;
  category: string;
  calories?: number;
  proteinGrams?: number;
  cost?: number;
  iconUrl?: string;
}

interface MealIngredient {
  ingredient: Ingredient;
  quantity: number;
}

interface Meal {
  id: number;
  name: string;
  mealIngredients: MealIngredient[];
}

type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";

interface MealLogEntry {
  id: number;
  meal: Meal;
  consumedDate: string;
  mealType?: MealType;
}

const MEAL_TYPES: { key: MealType; label: string; icon: string; color: string }[] = [
  { key: "BREAKFAST", label: "Breakfast", icon: "🌅", color: "#FBBF24" },
  { key: "LUNCH", label: "Lunch", icon: "☀️", color: "#FB923C" },
  { key: "SNACK", label: "Snack", icon: "🍿", color: "#A78BFA" },
  { key: "DINNER", label: "Dinner", icon: "🌙", color: "#60A5FA" },
];

interface DailyProgress {
  targetCalories: number;
  consumedCalories: number;
  targetProtein: number;
  consumedProtein: number;
  calorieGoalMet: boolean;
  proteinGoalMet: boolean;
}

/* ─── Utilities ──────────────────────────────────────────────────────── */
const MEAL_COLORS = [
  "#34D399",
  "#FB923C",
  "#60A5FA",
  "#C084FC",
  "#F87171",
  "#FBBF24",
  "#2DD4BF",
  "#A78BFA",
];

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function prettyDate(d: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (formatDate(d) === formatDate(today)) return "Today";
  if (formatDate(d) === formatDate(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getMealCalories(meal: Meal): number {
  return (meal.mealIngredients ?? []).reduce(
    (sum, mi) => sum + ((mi.ingredient.calories ?? 0) * mi.quantity),
    0,
  );
}

function getMealProtein(meal: Meal): number {
  return (meal.mealIngredients ?? []).reduce(
    (sum, mi) =>
      sum + ((mi.ingredient.proteinGrams ?? 0) * mi.quantity),
    0,
  );
}

/* ─── Ring Chart ─────────────────────────────────────────────────────── */
function RingChart({
  pct,
  color,
  size = 140,
  stroke = 10,
  isDark,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  isDark: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const clampedPct = Math.min(pct, 100);
  return (
    <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
        strokeWidth={stroke}
        className="transition-colors duration-500"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={
          inView ? { strokeDashoffset: circ * (1 - clampedPct / 100) } : {}
        }
        transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 5}
        textAnchor="middle"
        fontSize={size * 0.16}
        fill={color}
        fontWeight="600"
      >
        {Math.round(clampedPct)}%
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export default function MealTracker({ isDark = true }: { isDark?: boolean }) {
  const { userId } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [logs, setLogs] = useState<MealLogEntry[]>([]);
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [savedMeals, setSavedMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [loggingMealId, setLoggingMealId] = useState<number | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [mealSearchQuery, setMealSearchQuery] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const timelineRef = useRef(null);
  const timelineInView = useInView(timelineRef, { once: false, amount: 0.1 });

  // ─── Toast ──────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Data Fetching ──────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const dateStr = formatDate(selectedDate);
      const res = await api.get<MealLogEntry[]>(
        `/users/${userId}/meal-logs?date=${dateStr}`,
      );
      setLogs(res.data);
    } catch {
      showToast("Failed to load meal logs.", "error");
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);

  const fetchProgress = useCallback(async () => {
    if (!userId) return;
    try {
      const dateStr = formatDate(selectedDate);
      const res = await api.get<DailyProgress>(
        `/users/${userId}/progress?date=${dateStr}`,
      );
      setProgress(res.data);
    } catch {
      /* silently fail — user may not have set goals */
    }
  }, [userId, selectedDate]);

  const fetchSavedMeals = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get<Meal[]>(`/meals/user/${userId}`);
      setSavedMeals(res.data);
    } catch {
      /* silently fail */
    }
  }, [userId]);

  useEffect(() => {
    fetchLogs();
    fetchProgress();
  }, [fetchLogs, fetchProgress]);

  useEffect(() => {
    fetchSavedMeals();
  }, [fetchSavedMeals]);

  // ─── Actions ────────────────────────────────────────────────────────
  const logMeal = async (mealId: number) => {
    if (!userId) return;
    if (!selectedMealType) {
      showToast("Please select a meal type first.", "error");
      return;
    }
    setLoggingMealId(mealId);
    try {
      await api.post(`/users/${userId}/meal-logs`, {
        mealId: String(mealId),
        date: formatDate(selectedDate),
        mealType: selectedMealType,
      });
      showToast("Meal logged! 🎉", "success");
      setShowLogModal(false);
      setSelectedMealType(null);
      fetchLogs();
      fetchProgress();
    } catch {
      showToast("Failed to log meal.", "error");
    } finally {
      setLoggingMealId(null);
    }
  };

  const deleteLog = async (logId: number) => {
    setDeletingLogId(logId);
    try {
      await api.delete(`/meal-logs/${logId}`);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      showToast("Meal log removed.", "success");
      fetchProgress();
    } catch {
      showToast("Failed to remove log.", "error");
    } finally {
      setDeletingLogId(null);
    }
  };

  // ─── Date Navigation ───────────────────────────────────────────────
  const goDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  // ─── Computed ──────────────────────────────────────────────────────
  const totalCalories = logs.reduce(
    (sum, l) => sum + getMealCalories(l.meal),
    0,
  );
  const totalProtein = logs.reduce(
    (sum, l) => sum + getMealProtein(l.meal),
    0,
  );

  const caloriePct =
    progress && progress.targetCalories > 0
      ? Math.round(
          (progress.consumedCalories / progress.targetCalories) * 100,
        )
      : 0;

  const proteinPct =
    progress && progress.targetProtein > 0
      ? Math.round(
          (progress.consumedProtein / progress.targetProtein) * 100,
        )
      : 0;

  const maxCal = Math.max(...logs.map((l) => getMealCalories(l.meal)), 1);

  const filteredSavedMeals = savedMeals.filter((m) =>
    m.name.toLowerCase().includes(mealSearchQuery.toLowerCase()),
  );

  return (
    <div className="font-body pt-20 pb-10 relative overflow-hidden min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        .font-body    { font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.3); border-radius: 99px; }
      `}</style>

      {/* ── Background gradient orbs (emerald theme) ── */}
      <motion.div
        className={`absolute rounded-full blur-[120px] w-[500px] h-[500px] -top-40 -right-20 pointer-events-none ${isDark ? "bg-emerald-700" : "bg-emerald-200"}`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.25, 0.12] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`absolute rounded-full blur-[100px] w-[400px] h-[400px] bottom-20 -left-32 pointer-events-none ${isDark ? "bg-teal-800" : "bg-teal-100"}`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.22, 0.1] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      <motion.div
        className={`absolute w-[300px] h-[300px] rounded-full blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${isDark ? "bg-emerald-900/30" : "bg-emerald-50/60"}`}
        animate={{ scale: [1, 1.4, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Diagonal lines pattern */}
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

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-500/90 text-white"
                : "bg-red-500/90 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <X className="w-4 h-4" />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          PAGE HEADER
      ═══════════════════════════════════════ */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h1
                className={`font-display text-3xl font-bold tracking-tight ${isDark ? "text-stone-100" : "text-stone-900"}`}
              >
                Meal Tracker
              </h1>
            </div>
            <p
              className={`text-sm ml-[52px] ${isDark ? "text-stone-500" : "text-stone-400"}`}
            >
              Your daily meal log — every bite, tracked automatically
            </p>
          </div>

          {/* ── Date Picker ── */}
          <div
            className={`flex items-center gap-2 self-start sm:self-auto px-2 py-1.5 rounded-2xl border ${
              isDark
                ? "bg-white/[0.04] border-white/[0.06]"
                : "bg-white border-stone-200 shadow-sm"
            }`}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => goDay(-1)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/[0.06] text-stone-400" : "hover:bg-black/[0.06] text-stone-500"}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Calendar
                className="w-4 h-4 text-emerald-500"
                strokeWidth={2}
              />
              <span
                className={`text-sm font-semibold tabular-nums ${isDark ? "text-stone-200" : "text-stone-800"}`}
              >
                {prettyDate(selectedDate)}
              </span>
              <span
                className={`text-xs ${isDark ? "text-stone-600" : "text-stone-400"}`}
              >
                {selectedDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => goDay(1)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/[0.06] text-stone-400" : "hover:bg-black/[0.06] text-stone-500"}`}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════ */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* ── LEFT: Timeline ── */}
        <div className="space-y-6">
          {/* Log a Meal button */}
          <motion.button
            whileHover={{
              scale: 1.02,
              boxShadow: "0 0 18px rgba(52,211,153,0.22)",
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowLogModal(true);
              setMealSearchQuery("");
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Log a Meal
          </motion.button>

          {/* Timeline */}
          <div
            ref={timelineRef}
            className={`relative p-6 rounded-3xl border transition-colors duration-500 ${isDark ? "bg-[#131210] border-white/[0.07] shadow-2xl" : "bg-white border-stone-200/80 shadow-xl shadow-stone-200/60"}`}
          >
            <div
              className="absolute -inset-1 rounded-3xl blur-2xl opacity-20 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 80%, rgba(52,211,153,0.4), transparent 60%)",
              }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-emerald-500" />
                <span
                  className={`text-xs font-bold tracking-widest uppercase ${isDark ? "text-stone-400" : "text-stone-500"}`}
                >
                  Meal Timeline
                </span>
              </div>
              <span
                className={`text-xs tabular-nums ${isDark ? "text-stone-600" : "text-stone-400"}`}
              >
                {logs.length} meal{logs.length !== 1 && "s"} logged
              </span>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 relative">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p
                  className={`text-sm ${isDark ? "text-stone-600" : "text-stone-400"}`}
                >
                  Loading your meals...
                </p>
              </div>
            ) : logs.length === 0 ? (
              /* Empty State */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-3 relative"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="text-5xl mb-2"
                >
                  🍽️
                </motion.div>
                <p
                  className={`text-sm font-medium ${isDark ? "text-stone-500" : "text-stone-400"}`}
                >
                  No meals logged for {prettyDate(selectedDate).toLowerCase()}
                </p>
                <p
                  className={`text-xs max-w-xs text-center ${isDark ? "text-stone-600" : "text-stone-400"}`}
                >
                  Click "Log a Meal" to add meals from your saved collection to
                  today's tracker
                </p>
              </motion.div>
            ) : (
              /* Timeline Entries */
              <div className="relative flex flex-col gap-0">
                {/* Vertical timeline line */}
                <div
                  className={`absolute left-5 top-6 bottom-6 w-px transition-colors duration-500 ${isDark ? "bg-white/[0.07]" : "bg-black/[0.07]"}`}
                />

                {logs.map((log, i) => {
                  const cal = getMealCalories(log.meal);
                  const pro = getMealProtein(log.meal);
                  const color = MEAL_COLORS[i % MEAL_COLORS.length];
                  const ingredientCount =
                    log.meal.mealIngredients?.length ?? 0;
                  const mealTypeInfo = MEAL_TYPES.find(
                    (mt) => mt.key === log.mealType,
                  );

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -24 }}
                      animate={
                        timelineInView ? { opacity: 1, x: 0 } : {}
                      }
                      transition={{
                        delay: i * 0.12,
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="flex items-start gap-4 pb-6 relative group"
                    >
                      {/* Timeline dot */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={
                          timelineInView ? { scale: 1 } : {}
                        }
                        transition={{
                          delay: i * 0.12 + 0.1,
                          type: "spring",
                          stiffness: 300,
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 text-xl"
                        style={{
                          background: mealTypeInfo ? `${mealTypeInfo.color}18` : `${color}18`,
                          border: `1px solid ${mealTypeInfo ? `${mealTypeInfo.color}40` : `${color}40`}`,
                        }}
                      >
                        {mealTypeInfo ? mealTypeInfo.icon : "🍽️"}
                      </motion.div>

                      {/* Content */}
                      <div className="flex-1 pt-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-sm transition-colors duration-500 font-medium truncate ${isDark ? "text-stone-200" : "text-stone-800"}`}
                            >
                              {log.meal.name}
                            </span>
                            {mealTypeInfo && (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0"
                                style={{
                                  background: `${mealTypeInfo.color}15`,
                                  color: mealTypeInfo.color,
                                }}
                              >
                                {mealTypeInfo.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="text-xs px-2 py-0.5 rounded-lg font-medium"
                              style={{
                                background: `${color}18`,
                                color: color,
                              }}
                            >
                              {Math.round(cal)} cal
                            </span>
                            {/* Delete button */}
                            <motion.button
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => deleteLog(log.id)}
                              disabled={deletingLogId === log.id}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-red-500/10 text-red-400/70 hover:bg-red-500/20 hover:text-red-400" : "bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500"}`}
                            >
                              {deletingLogId === log.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </motion.button>
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="flex items-center gap-3 mt-0.5">
                          <span
                            className={`text-xs transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                          >
                            {ingredientCount} ingredient
                            {ingredientCount !== 1 && "s"}
                          </span>
                          <span
                            className={`text-xs ${isDark ? "text-stone-600" : "text-stone-400"}`}
                          >
                            •
                          </span>
                          <span className={`text-xs font-medium ${isDark ? "text-blue-400/70" : "text-blue-500"}`}>
                            {Math.round(pro)}g protein
                          </span>
                        </div>

                        {/* Ingredient chips */}
                        {(log.meal.mealIngredients ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(log.meal.mealIngredients ?? []).map((mi, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors ${
                                  isDark
                                    ? "bg-white/[0.04] border-white/[0.06] text-stone-400"
                                    : "bg-stone-50 border-stone-200 text-stone-500"
                                }`}
                              >
                                {mi.ingredient.iconUrl && (
                                  <img
                                    src={mi.ingredient.iconUrl}
                                    alt=""
                                    className="w-4 h-4 object-contain"
                                  />
                                )}
                                {mi.ingredient.name}
                                <span className={`${isDark ? "text-stone-600" : "text-stone-400"}`}>
                                  {mi.quantity}g
                                </span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Progress bar */}
                        <div
                          className={`mt-2 h-1 rounded-full overflow-hidden transition-colors duration-500 ${isDark ? "bg-white/[0.05]" : "bg-black/[0.05]"}`}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={
                              timelineInView
                                ? {
                                    width: `${(cal / maxCal) * 100}%`,
                                  }
                                : {}
                            }
                            transition={{
                              delay: i * 0.12 + 0.25,
                              duration: 0.8,
                              ease: "easeOut",
                            }}
                            style={{ background: color }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Daily total bar */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={
                    timelineInView ? { opacity: 1, y: 0 } : {}
                  }
                  transition={{ delay: logs.length * 0.12 + 0.2 }}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5"
                >
                  <span
                    className={`text-sm transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-600"}`}
                  >
                    {prettyDate(selectedDate)}'s total
                  </span>
                  <span className="text-sm text-emerald-500 font-medium tabular-nums">
                    {Math.round(totalCalories).toLocaleString()}
                    {progress && progress.targetCalories > 0
                      ? ` / ${progress.targetCalories.toLocaleString()}`
                      : ""}{" "}
                    kcal
                  </span>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="lg:sticky lg:top-[80px] lg:self-start space-y-6">
          {/* Daily Progress Rings */}
          {progress &&
            (progress.targetCalories > 0 ||
              progress.targetProtein > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`p-6 rounded-3xl border transition-colors duration-500 ${isDark ? "bg-[#131210] border-white/[0.07] shadow-xl" : "bg-white border-stone-200/80 shadow-xl shadow-stone-200/60"}`}
              >
                <p
                  className={`text-xs font-bold tracking-widest uppercase mb-5 ${isDark ? "text-stone-400" : "text-stone-500"}`}
                >
                  Daily Goals
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {progress.targetCalories > 0 && (
                    <div className="flex flex-col items-center gap-2">
                      <RingChart
                        pct={caloriePct}
                        color="#FB923C"
                        size={110}
                        stroke={9}
                        isDark={isDark}
                      />
                      <div className="text-center">
                        <p
                          className={`text-xs font-medium ${isDark ? "text-stone-200" : "text-stone-800"}`}
                        >
                          Calories
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 tabular-nums ${isDark ? "text-stone-500" : "text-stone-400"}`}
                        >
                          {progress.consumedCalories.toLocaleString()} /{" "}
                          {progress.targetCalories.toLocaleString()}
                        </p>
                      </div>
                      <AnimatePresence>
                        {progress.calorieGoalMet && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold"
                          >
                            <CheckCircle className="w-3 h-3" /> Goal met!
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  {progress.targetProtein > 0 && (
                    <div className="flex flex-col items-center gap-2">
                      <RingChart
                        pct={proteinPct}
                        color="#60A5FA"
                        size={110}
                        stroke={9}
                        isDark={isDark}
                      />
                      <div className="text-center">
                        <p
                          className={`text-xs font-medium ${isDark ? "text-stone-200" : "text-stone-800"}`}
                        >
                          Protein
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 tabular-nums ${isDark ? "text-stone-500" : "text-stone-400"}`}
                        >
                          {Math.round(progress.consumedProtein)}g /{" "}
                          {Math.round(progress.targetProtein)}g
                        </p>
                      </div>
                      <AnimatePresence>
                        {progress.proteinGoalMet && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold"
                          >
                            <CheckCircle className="w-3 h-3" /> Goal met!
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          {/* Nutrition Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              {
                icon: Flame,
                label: "Calories",
                val: Math.round(totalCalories).toLocaleString(),
                color: "#FB923C",
              },
              {
                icon: TrendingUp,
                label: "Protein",
                val: `${Math.round(totalProtein)}g`,
                color: "#60A5FA",
              },
              {
                icon: Zap,
                label: "Meals",
                val: logs.length,
                color: "#34D399",
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -2 }}
                className={`flex flex-col items-center gap-1 py-4 px-2 rounded-2xl border transition-colors duration-500 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-stone-200/80 shadow-sm shadow-stone-100"}`}
              >
                <stat.icon
                  className="w-4 h-4 mb-1"
                  style={{ color: stat.color }}
                />
                <motion.p
                  key={String(stat.val)}
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-base tabular-nums font-bold"
                  style={{ color: stat.color }}
                >
                  {stat.val}
                </motion.p>
                <p
                  className={`text-[10px] ${isDark ? "text-stone-500" : "text-stone-400"}`}
                >
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-3"
          >
            {[
              {
                icon: "🔥",
                label: "Remaining Calories",
                val:
                  progress && progress.targetCalories > 0
                    ? `${Math.max(0, progress.targetCalories - progress.consumedCalories).toLocaleString()} kcal`
                    : "No goal set",
                color: "#FB923C",
              },
              {
                icon: "💪",
                label: "Protein Consumed",
                val: `${Math.round(totalProtein)} g`,
                color: "#60A5FA",
              },
              {
                icon: "🥗",
                label: "Meals Logged",
                val: `${logs.length} ${prettyDate(selectedDate).toLowerCase()}`,
                color: "#34D399",
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                whileHover={{ x: 4, borderColor: `${s.color}40` }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-500 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-stone-200/80 shadow-sm shadow-stone-100"}`}
              >
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs truncate transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                  >
                    {s.label}
                  </p>
                  <p
                    className="text-sm font-medium tabular-nums"
                    style={{ color: s.color }}
                  >
                    {s.val}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          LOG MEAL MODAL
      ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showLogModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogModal(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg max-h-[80vh] overflow-hidden rounded-3xl border ${isDark ? "bg-[#131210] border-white/[0.07] shadow-2xl" : "bg-white border-stone-200/80 shadow-2xl shadow-stone-300/40"}`}
            >
              {/* Modal Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                    <h3
                      className={`font-display text-xl font-bold ${isDark ? "text-stone-100" : "text-stone-900"}`}
                    >
                      Log a Meal
                    </h3>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowLogModal(false)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/[0.06] text-stone-500" : "hover:bg-black/[0.06] text-stone-400"}`}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
                <p
                  className={`text-xs mb-3 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                >
                  Select a meal type, then pick a saved meal to log
                </p>

                {/* Meal Type Selector */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {MEAL_TYPES.map((mt) => (
                    <motion.button
                      key={mt.key}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedMealType(mt.key)}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                        selectedMealType === mt.key
                          ? "shadow-md"
                          : isDark
                            ? "border-white/[0.06] text-stone-500 bg-white/[0.02] hover:bg-white/[0.04]"
                            : "border-stone-200 text-stone-400 bg-stone-50 hover:bg-stone-100"
                      }`}
                      style={
                        selectedMealType === mt.key
                          ? {
                              borderColor: `${mt.color}50`,
                              background: `${mt.color}15`,
                              color: mt.color,
                              boxShadow: `0 4px 12px ${mt.color}20`,
                            }
                          : undefined
                      }
                    >
                      <span className="text-lg">{mt.icon}</span>
                      {mt.label}
                    </motion.button>
                  ))}
                </div>

                {/* Search */}
                <div
                  className={`relative rounded-xl border transition-colors ${isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-stone-50 border-stone-200/80"}`}
                >
                  <Search
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-stone-600" : "text-stone-400"}`}
                  />
                  <input
                    type="text"
                    placeholder="Search your meals..."
                    value={mealSearchQuery}
                    onChange={(e) => setMealSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-transparent text-sm font-medium outline-none rounded-xl ${isDark ? "text-stone-200 placeholder:text-stone-600" : "text-stone-800 placeholder:text-stone-400"}`}
                  />
                </div>
              </div>

              {/* Modal Body — Meal List */}
              <div className="px-4 pb-6 max-h-[50vh] overflow-y-auto space-y-2">
                {filteredSavedMeals.length === 0 ? (
                  <div
                    className={`text-center py-12 ${isDark ? "text-stone-600" : "text-stone-400"}`}
                  >
                    <p className="text-sm font-medium mb-1">
                      No saved meals found
                    </p>
                    <p className="text-xs opacity-70">
                      Create meals in the Meal Builder first
                    </p>
                  </div>
                ) : (
                  filteredSavedMeals.map((meal, i) => {
                    const cal = getMealCalories(meal);
                    const pro = getMealProtein(meal);
                    const isLogging = loggingMealId === meal.id;
                    const color =
                      MEAL_COLORS[i % MEAL_COLORS.length];

                    return (
                      <motion.button
                        key={meal.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: i * 0.03,
                          duration: 0.25,
                        }}
                        whileHover={{
                          scale: 1.01,
                          borderColor: `${color}50`,
                        }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLogging}
                        onClick={() => logMeal(meal.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all duration-200 ${isDark ? "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]" : "bg-stone-50/50 border-black/[0.06] hover:bg-stone-100/80"}`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                          style={{
                            background: `${color}15`,
                            border: `1px solid ${color}30`,
                          }}
                        >
                          🍲
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-semibold truncate ${isDark ? "text-stone-200" : "text-stone-800"}`}
                          >
                            {meal.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[11px] font-medium"
                              style={{ color }}
                            >
                              {Math.round(cal)} kcal
                            </span>
                            <span
                              className={`text-[11px] ${isDark ? "text-stone-600" : "text-stone-300"}`}
                            >
                              •
                            </span>
                            <span className="text-[11px] text-blue-400/70 font-medium">
                              {Math.round(pro)}g protein
                            </span>
                            <span
                              className={`text-[11px] ${isDark ? "text-stone-600" : "text-stone-300"}`}
                            >
                              •
                            </span>
                            <span
                              className={`text-[11px] ${isDark ? "text-stone-600" : "text-stone-400"}`}
                            >
                              {meal.mealIngredients?.length ?? 0}{" "}
                              items
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isLogging ? (
                            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                              style={{
                                background: `${color}15`,
                              }}
                            >
                              <Plus
                                className="w-4 h-4"
                                style={{ color }}
                              />
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

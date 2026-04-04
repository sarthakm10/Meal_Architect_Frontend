import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  TrendingUp,
  Target,
  Zap,
  Trophy,
  UtensilsCrossed,
  Loader2,
  CheckCircle,
  Calendar,
  Settings,
  X,
  Save,
} from "lucide-react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

/* ─── Types ────────────────────────────────────────────────────────────── */
interface DailyProgress {
  targetCalories: number;
  consumedCalories: number;
  targetProtein: number;
  consumedProtein: number;
  calorieGoalMet: boolean;
  proteinGoalMet: boolean;
}

interface Ingredient {
  id: number;
  name: string;
  category: string;
  calories?: number;
  proteinGrams?: number;
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

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const formatDate = (d: Date) => d.toISOString().split("T")[0];

const formatDisplay = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const isToday = (d: Date) => formatDate(d) === formatDate(new Date());

const MEAL_TYPE_META: Record<MealType, { icon: string; color: string }> = {
  BREAKFAST: { icon: "🌅", color: "#FBBF24" },
  LUNCH:     { icon: "☀️", color: "#FB923C" },
  SNACK:     { icon: "🍿", color: "#A78BFA" },
  DINNER:    { icon: "🌙", color: "#60A5FA" },
};

const FALLBACK_ICON = "https://em-content.zobj.net/source/apple/391/jar_1fad9.png";

const getMealCalories = (meal: Meal) =>
  (meal.mealIngredients ?? []).reduce(
    (sum, mi) => sum + ((mi.ingredient.calories ?? 0) * mi.quantity), 0,
  );

const getMealProtein = (meal: Meal) =>
  (meal.mealIngredients ?? []).reduce(
    (sum, mi) => sum + ((mi.ingredient.proteinGrams ?? 0) * mi.quantity), 0,
  );

/* ─── Ring Chart ───────────────────────────────────────────────────────── */
function RingChart({
  pct, color, size = 160, stroke = 12, isDark, label, consumed, target, unit,
}: {
  pct: number; color: string; size?: number; stroke?: number; isDark: boolean;
  label: string; consumed: number; target: number; unit: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(pct, 0), 100);

  return (
    <div ref={ref} className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={inView ? { strokeDashoffset: circ * (1 - clamped / 100) } : {}}
            transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={clamped}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-bold tabular-nums"
            style={{ color }}
          >
            {Math.round(clamped)}%
          </motion.span>
        </div>
      </div>
      <div className="text-center">
        <p className={`text-sm font-semibold ${isDark ? "text-stone-200" : "text-stone-800"}`}>
          {label}
        </p>
        <p className={`text-xs mt-0.5 tabular-nums ${isDark ? "text-stone-500" : "text-stone-400"}`}>
          {Math.round(consumed).toLocaleString()} / {Math.round(target).toLocaleString()} {unit}
        </p>
        <div className={`mt-3 h-1.5 w-32 rounded-full mx-auto overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={inView ? { width: `${clamped}%` } : {}}
            transition={{ duration: 1.4, delay: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────── */
export default function GoalTracking({ isDark = true }: { isDark?: boolean }) {
  const { userId } = useContext(AuthContext);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [logs, setLogs] = useState<MealLogEntry[]>([]);
  const [weekProgress, setWeekProgress] = useState<(DailyProgress | null)[]>([]);
  const [loading, setLoading] = useState(true);

  // Goal setting modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalCalories, setGoalCalories] = useState("");
  const [goalProtein, setGoalProtein] = useState("");
  const [savingGoals, setSavingGoals] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  /* ── Fetch daily progress ── */
  const fetchProgress = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const dateStr = formatDate(selectedDate);
      const res = await api.get<DailyProgress>(
        `/users/${userId}/progress?date=${dateStr}`,
      );
      setProgress(res.data);
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);

  /* ── Fetch meal logs ── */
  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    try {
      const dateStr = formatDate(selectedDate);
      const res = await api.get<MealLogEntry[]>(
        `/users/${userId}/meal-logs?date=${dateStr}`,
      );
      setLogs(res.data);
    } catch {
      setLogs([]);
    }
  }, [userId, selectedDate]);

  /* ── Fetch 7-day progress for weekly trend ── */
  const fetchWeekProgress = useCallback(async () => {
    if (!userId) return;
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    try {
      const results = await Promise.all(
        days.map(async (d) => {
          try {
            const res = await api.get<DailyProgress>(
              `/users/${userId}/progress?date=${formatDate(d)}`,
            );
            return res.data;
          } catch {
            return null;
          }
        }),
      );
      setWeekProgress(results);
    } catch {
      setWeekProgress([]);
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    fetchProgress();
    fetchLogs();
    fetchWeekProgress();
  }, [fetchProgress, fetchLogs, fetchWeekProgress]);

  /* ── Toast helper ── */
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Open modal pre-filled with current targets ── */
  const openGoalModal = () => {
    setGoalCalories(progress ? String(Math.round(progress.targetCalories)) : "2000");
    setGoalProtein(progress ? String(Math.round(progress.targetProtein)) : "150");
    setShowGoalModal(true);
  };

  /* ── Save goals ── */
  const saveGoals = async () => {
    if (!userId) return;
    const cal = parseInt(goalCalories, 10);
    const pro = parseInt(goalProtein, 10);
    if (!cal || cal <= 0 || !pro || pro <= 0) {
      showToast("Enter valid calorie and protein values.", "error");
      return;
    }
    setSavingGoals(true);
    try {
      await api.put(`/users/${userId}/goals`, {
        dailyCalorieGoal: cal,
        dailyProteinGoal: pro,
      });
      showToast("Goals saved!", "success");
      setShowGoalModal(false);
      fetchProgress();
      fetchWeekProgress();
    } catch {
      showToast("Failed to save goals.", "error");
    } finally {
      setSavingGoals(false);
    }
  };

  /* ── Date navigation ── */
  const goDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  /* ── Computed values ── */
  const calPct = progress && progress.targetCalories > 0
    ? (progress.consumedCalories / progress.targetCalories) * 100 : 0;
  const proPct = progress && progress.targetProtein > 0
    ? (progress.consumedProtein / progress.targetProtein) * 100 : 0;
  const remainingCal = progress ? Math.max(0, progress.targetCalories - progress.consumedCalories) : 0;

  /* ── Streak calculation from week data ── */
  const streak = (() => {
    let count = 0;
    for (let i = weekProgress.length - 1; i >= 0; i--) {
      const wp = weekProgress[i];
      if (wp && wp.calorieGoalMet && wp.proteinGoalMet) count++;
      else break;
    }
    return count;
  })();

  /* ── Week day labels ── */
  const weekDays = (() => {
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days;
  })();

  return (
    <div className="font-body pt-20 pb-16 relative overflow-hidden min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        .font-body    { font-family: 'Outfit', sans-serif; }
      `}</style>

      {/* ── Ambient gradient orbs ── */}
      <motion.div
        className={`absolute rounded-full blur-[130px] w-[500px] h-[500px] top-20 -right-32 pointer-events-none ${isDark ? "bg-blue-700" : "bg-blue-200"}`}
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className={`absolute rounded-full blur-[100px] w-[350px] h-[350px] bottom-40 left-[5%] pointer-events-none ${isDark ? "bg-indigo-800" : "bg-indigo-100"}`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.15, 0.06] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h1 className={`font-display text-3xl font-bold tracking-tight ${isDark ? "text-stone-100" : "text-stone-900"}`}>
                  Goal Tracking
                </h1>
              </div>
              <p className={`text-sm mt-1 ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                Track your daily calorie &amp; protein targets
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Edit Goals button */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={openGoalModal}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${isDark ? "bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/15" : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"}`}
              >
                <Settings className="w-3.5 h-3.5" /> {progress ? "Edit Goals" : "Set Goals"}
              </motion.button>

              {/* Date navigator */}
              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-2xl border ${isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-black/[0.07]"}`}>
              <button
                onClick={() => goDay(-1)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/[0.06] text-stone-400" : "hover:bg-black/[0.06] text-stone-500"}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 px-3">
                <Calendar className={`w-3.5 h-3.5 ${isDark ? "text-blue-400" : "text-blue-500"}`} />
                <span className={`text-sm font-semibold tabular-nums ${isDark ? "text-stone-200" : "text-stone-800"}`}>
                  {isToday(selectedDate) ? "Today" : formatDisplay(selectedDate)}
                </span>
              </div>
              <button
                onClick={() => goDay(1)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/[0.06] text-stone-400" : "hover:bg-black/[0.06] text-stone-500"}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            </div>
          </div>
        </motion.div>

        {/* ── Loading state ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className={`text-sm ${isDark ? "text-stone-500" : "text-stone-400"}`}>Loading progress...</p>
          </div>
        ) : !progress ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 gap-4"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"}`}>
              <Target className={`w-10 h-10 ${isDark ? "text-stone-700" : "text-stone-300"}`} />
            </div>
            <p className={`font-display text-xl font-bold ${isDark ? "text-stone-300" : "text-stone-700"}`}>
              No goals set yet
            </p>
            <p className={`text-sm max-w-xs text-center ${isDark ? "text-stone-500" : "text-stone-400"}`}>
              Set your daily calorie and protein targets to start tracking your progress.
            </p>
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 0 18px rgba(59,130,246,0.22)" }}
              whileTap={{ scale: 0.96 }}
              onClick={openGoalModal}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 mt-2"
            >
              <Target className="w-4 h-4" /> Set My Goals
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* ══════════════════════════════
                MAIN STATS — 3 Column Grid
            ══════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center mb-10">
              {/* Calorie Ring */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={`flex flex-col items-center gap-4 p-8 rounded-3xl border shadow-xl ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07]"}`}
              >
                <RingChart
                  pct={calPct}
                  color="#FB923C"
                  size={170}
                  stroke={13}
                  isDark={isDark}
                  label="Calories"
                  consumed={progress.consumedCalories}
                  target={progress.targetCalories}
                  unit="kcal"
                />
                {progress.calorieGoalMet && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">Goal met!</span>
                  </motion.div>
                )}
              </motion.div>

              {/* Center Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col gap-3"
              >
                {[
                  {
                    icon: <Flame className="w-5 h-5" />,
                    emoji: "🔥",
                    label: "Remaining Calories",
                    val: `${Math.round(remainingCal).toLocaleString()} kcal`,
                    color: "#FB923C",
                  },
                  {
                    icon: <TrendingUp className="w-5 h-5" />,
                    emoji: "💪",
                    label: "Protein Consumed",
                    val: `${Math.round(progress.consumedProtein)} g`,
                    color: "#60A5FA",
                  },
                  {
                    icon: <UtensilsCrossed className="w-5 h-5" />,
                    emoji: "🥗",
                    label: "Meals Logged",
                    val: `${logs.length} today`,
                    color: "#34D399",
                  },
                  {
                    icon: <Trophy className="w-5 h-5" />,
                    emoji: "⚡",
                    label: "Goal Streak",
                    val: `${streak} day${streak !== 1 ? "s" : ""}`,
                    color: "#C084FC",
                  },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.45 }}
                    whileHover={{ x: 4, borderColor: `${s.color}40` }}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 cursor-default ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07] shadow-sm"}`}
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                        {s.label}
                      </p>
                      <p className="text-sm font-semibold tabular-nums" style={{ color: s.color }}>
                        {s.val}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Protein Ring */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={`flex flex-col items-center gap-4 p-8 rounded-3xl border shadow-xl ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07]"}`}
              >
                <RingChart
                  pct={proPct}
                  color="#60A5FA"
                  size={170}
                  stroke={13}
                  isDark={isDark}
                  label="Protein"
                  consumed={progress.consumedProtein}
                  target={progress.targetProtein}
                  unit="g"
                />
                {progress.proteinGoalMet && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">Goal met!</span>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* ══════════════════════════════
                WEEKLY TREND
            ══════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className={`rounded-3xl border p-6 mb-10 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07]"} shadow-lg`}
            >
              <div className="flex items-center gap-2 mb-6">
                <Calendar className={`w-4 h-4 ${isDark ? "text-blue-400" : "text-blue-500"}`} />
                <h2 className={`font-display text-lg font-bold ${isDark ? "text-stone-100" : "text-stone-900"}`}>
                  Weekly Overview
                </h2>
              </div>

              <div className="grid grid-cols-7 gap-3">
                {weekDays.map((day, i) => {
                  const wp = weekProgress[i];
                  const calP = wp && wp.targetCalories > 0
                    ? Math.min((wp.consumedCalories / wp.targetCalories) * 100, 100) : 0;
                  const proP = wp && wp.targetProtein > 0
                    ? Math.min((wp.consumedProtein / wp.targetProtein) * 100, 100) : 0;
                  const bothMet = wp?.calorieGoalMet && wp?.proteinGoalMet;
                  const isSel = formatDate(day) === formatDate(selectedDate);
                  const dayLabel = day.toLocaleDateString("en-US", { weekday: "short" });

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(new Date(day))}
                      className={`flex flex-col items-center gap-2 py-3 rounded-2xl border transition-all duration-200 ${
                        isSel
                          ? isDark
                            ? "bg-blue-500/10 border-blue-500/30"
                            : "bg-blue-50 border-blue-300"
                          : isDark
                            ? "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                            : "bg-stone-50 border-black/[0.05] hover:bg-stone-100"
                      }`}
                    >
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                        isSel
                          ? isDark ? "text-blue-400" : "text-blue-600"
                          : isDark ? "text-stone-500" : "text-stone-400"
                      }`}>
                        {dayLabel}
                      </span>

                      {/* Mini bars */}
                      <div className="flex gap-1 items-end h-10">
                        <div className={`w-2.5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`} style={{ height: 40 }}>
                          <motion.div
                            className="w-full rounded-full bg-orange-500"
                            initial={{ height: 0 }}
                            animate={{ height: `${calP}%` }}
                            transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                            style={{ marginTop: "auto" }}
                          />
                        </div>
                        <div className={`w-2.5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`} style={{ height: 40 }}>
                          <motion.div
                            className="w-full rounded-full bg-blue-400"
                            initial={{ height: 0 }}
                            animate={{ height: `${proP}%` }}
                            transition={{ duration: 0.8, delay: 0.6 + i * 0.05 }}
                            style={{ marginTop: "auto" }}
                          />
                        </div>
                      </div>

                      {/* Goal met indicator */}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        bothMet
                          ? "bg-emerald-500/15 text-emerald-500"
                          : isDark
                            ? "bg-white/[0.04] text-stone-600"
                            : "bg-black/[0.04] text-stone-300"
                      }`}>
                        {bothMet ? <CheckCircle className="w-3 h-3" /> : <span>{day.getDate()}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className={`text-[10px] font-medium ${isDark ? "text-stone-500" : "text-stone-400"}`}>Calories</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className={`text-[10px] font-medium ${isDark ? "text-stone-500" : "text-stone-400"}`}>Protein</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                  <span className={`text-[10px] font-medium ${isDark ? "text-stone-500" : "text-stone-400"}`}>Both goals met</span>
                </div>
              </div>
            </motion.div>

            {/* ══════════════════════════════
                TODAY'S MEALS
            ══════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className={`rounded-3xl border p-6 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07]"} shadow-lg`}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className={`w-4 h-4 ${isDark ? "text-orange-400" : "text-orange-500"}`} />
                  <h2 className={`font-display text-lg font-bold ${isDark ? "text-stone-100" : "text-stone-900"}`}>
                    {isToday(selectedDate) ? "Today's" : formatDisplay(selectedDate) + "'s"} Meals
                  </h2>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${isDark ? "bg-white/[0.04] text-stone-400" : "bg-stone-100 text-stone-500"}`}>
                  {logs.length} meal{logs.length !== 1 ? "s" : ""}
                </span>
              </div>

              {logs.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? "text-stone-600" : "text-stone-400"}`}>
                  <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No meals logged</p>
                  <p className="text-xs mt-1 opacity-60">Log meals from the Tracker page</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {logs.map((log, i) => {
                    const cal = getMealCalories(log.meal);
                    const pro = getMealProtein(log.meal);
                    const meta = log.mealType ? MEAL_TYPE_META[log.mealType] : null;
                    const ingredients = log.meal.mealIngredients ?? [];
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 ${isDark ? "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]" : "bg-stone-50 border-black/[0.05] hover:bg-stone-100"}`}
                      >
                        {/* Meal type icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{
                            background: meta ? `${meta.color}15` : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                            border: `1px solid ${meta ? `${meta.color}30` : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                          }}
                        >
                          {meta ? meta.icon : "🍽️"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isDark ? "text-stone-200" : "text-stone-800"}`}>
                            {log.meal.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {/* Ingredient preview icons */}
                            <div className="flex -space-x-1.5">
                              {ingredients.slice(0, 3).map((mi) => (
                                <img
                                  key={mi.ingredient.id}
                                  src={mi.ingredient.iconUrl || FALLBACK_ICON}
                                  alt=""
                                  className={`w-4 h-4 rounded-full object-contain border ${isDark ? "border-[#131210]" : "border-white"}`}
                                />
                              ))}
                            </div>
                            {ingredients.length > 3 && (
                              <span className={`text-[9px] ${isDark ? "text-stone-600" : "text-stone-400"}`}>
                                +{ingredients.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-orange-500 tabular-nums">{Math.round(cal)} kcal</p>
                          <p className="text-[10px] font-medium text-blue-400 tabular-nums">{Math.round(pro)}g protein</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* ══════════════════════════════
          GOAL SETTING MODAL
      ══════════════════════════════ */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowGoalModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07]"}`}
            >
              {/* Close button */}
              <button
                onClick={() => setShowGoalModal(false)}
                className={`absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDark ? "text-stone-500 hover:bg-white/[0.06]" : "text-stone-400 hover:bg-black/[0.06]"}`}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`font-display text-xl font-bold ${isDark ? "text-stone-100" : "text-stone-900"}`}>
                    {progress ? "Edit Your Goals" : "Set Your Goals"}
                  </h2>
                  <p className={`text-xs ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                    Daily calorie &amp; protein targets
                  </p>
                </div>
              </div>

              {/* Calorie input */}
              <div className="mb-4">
                <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-orange-500" /> Daily Calorie Target
                  </span>
                </label>
                <div className={`relative rounded-2xl border transition-colors ${isDark ? "bg-white/[0.03] border-white/[0.07] focus-within:border-orange-500/40" : "bg-stone-50 border-black/[0.07] focus-within:border-orange-500/50"}`}>
                  <input
                    type="number"
                    value={goalCalories}
                    onChange={(e) => setGoalCalories(e.target.value)}
                    placeholder="e.g. 2000"
                    className={`w-full px-4 py-3.5 bg-transparent text-sm font-medium outline-none rounded-2xl ${isDark ? "text-stone-100 placeholder:text-stone-600" : "text-stone-900 placeholder:text-stone-400"}`}
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium ${isDark ? "text-stone-600" : "text-stone-400"}`}>
                    kcal
                  </span>
                </div>
              </div>

              {/* Protein input */}
              <div className="mb-6">
                <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Daily Protein Target
                  </span>
                </label>
                <div className={`relative rounded-2xl border transition-colors ${isDark ? "bg-white/[0.03] border-white/[0.07] focus-within:border-blue-500/40" : "bg-stone-50 border-black/[0.07] focus-within:border-blue-500/50"}`}>
                  <input
                    type="number"
                    value={goalProtein}
                    onChange={(e) => setGoalProtein(e.target.value)}
                    placeholder="e.g. 150"
                    className={`w-full px-4 py-3.5 bg-transparent text-sm font-medium outline-none rounded-2xl ${isDark ? "text-stone-100 placeholder:text-stone-600" : "text-stone-900 placeholder:text-stone-400"}`}
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium ${isDark ? "text-stone-600" : "text-stone-400"}`}>
                    grams
                  </span>
                </div>
              </div>

              {/* Quick presets */}
              <div className="mb-6">
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                  Quick presets
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "Cut", cal: "1800", pro: "160", color: "text-red-400" },
                    { label: "Maintain", cal: "2200", pro: "140", color: "text-emerald-400" },
                    { label: "Bulk", cal: "2800", pro: "180", color: "text-blue-400" },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => { setGoalCalories(p.cal); setGoalProtein(p.pro); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${isDark ? "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06]" : "bg-stone-50 border-black/[0.07] hover:bg-stone-100"} ${p.color}`}
                    >
                      {p.label} · {p.cal} kcal / {p.pro}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Save button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={savingGoals}
                onClick={saveGoals}
                className="w-full py-3.5 rounded-2xl bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-60"
              >
                {savingGoals ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Goals</>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-500/90 text-white"
                : "bg-red-500/90 text-white"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

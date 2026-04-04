import { useState, useEffect, useContext, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ShoppingCart,
  Check,
  Loader2,
  CheckCircle,
  X,
  Search,
  IndianRupee,
  Flame,
  TrendingUp,
  Package,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

/* ─── Types ────────────────────────────────────────────────────────────── */
interface Ingredient {
  id: number;
  name: string;
  category: "PROTEIN" | "VEGGIE" | "CARB" | "SPICE" | "LIQUID";
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

interface AggregatedItem {
  ingredient: Ingredient;
  totalQuantity: number;
  totalCost: number;
  totalCalories: number;
  totalProtein: number;
  fromMeals: string[];
}

type CategoryKey = "PROTEIN" | "VEGGIE" | "CARB" | "SPICE" | "LIQUID";

/* ─── Category Config ──────────────────────────────────────────────────── */
const CATEGORY_META: Record<
  CategoryKey,
  { label: string; color: string; emoji: string; iconUrl: string }
> = {
  PROTEIN: {
    label: "Protein",
    color: "#ef4444",
    emoji: "🥩",
    iconUrl:
      "https://em-content.zobj.net/source/apple/391/cut-of-meat_1f969.png",
  },
  VEGGIE: {
    label: "Vegetables",
    color: "#22c55e",
    emoji: "🥬",
    iconUrl:
      "https://em-content.zobj.net/source/apple/391/leafy-green_1f96c.png",
  },
  CARB: {
    label: "Carbs & Grains",
    color: "#eab308",
    emoji: "🌾",
    iconUrl:
      "https://em-content.zobj.net/source/apple/391/sheaf-of-rice_1f33e.png",
  },
  SPICE: {
    label: "Spices",
    color: "#dc2626",
    emoji: "🌶️",
    iconUrl:
      "https://em-content.zobj.net/source/apple/391/hot-pepper_1f336-fe0f.png",
  },
  LIQUID: {
    label: "Liquids",
    color: "#3b82f6",
    emoji: "🥛",
    iconUrl:
      "https://em-content.zobj.net/source/apple/391/glass-of-milk_1f95b.png",
  },
};

const CATEGORY_ORDER: CategoryKey[] = [
  "PROTEIN",
  "VEGGIE",
  "CARB",
  "SPICE",
  "LIQUID",
];

const FALLBACK_ICON =
  "https://em-content.zobj.net/source/apple/391/jar_1fad9.png";

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

const formatQuantity = (grams: number) => {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`;
  return `${Math.round(grams)} g`;
};

/* ─── Main Component ───────────────────────────────────────────────────── */
export default function GroceryList({ isDark = true }: { isDark?: boolean }) {
  const { userId } = useContext(AuthContext);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<
    Set<CategoryKey>
  >(new Set());
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  /* ── Fetch saved meals ── */
  const fetchMeals = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get<Meal[]>(`/meals/user/${userId}`);
      setMeals(res.data);
    } catch {
      showToast("Failed to load meals.", "error");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  /* ── Toast helper ── */
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Aggregate ingredients from all saved meals ── */
  const aggregatedItems = useMemo(() => {
    const map = new Map<number, AggregatedItem>();

    for (const meal of meals) {
      for (const mi of meal.mealIngredients ?? []) {
        const ing = mi.ingredient;
        const existing = map.get(ing.id);
        // cost is per 1g, quantity is in grams
        const itemCost = (ing.cost ?? 0) * mi.quantity;
        const itemCalories = (ing.calories ?? 0) * mi.quantity;
        const itemProtein = (ing.proteinGrams ?? 0) * mi.quantity;

        if (existing) {
          existing.totalQuantity += mi.quantity;
          existing.totalCost += itemCost;
          existing.totalCalories += itemCalories;
          existing.totalProtein += itemProtein;
          if (!existing.fromMeals.includes(meal.name)) {
            existing.fromMeals.push(meal.name);
          }
        } else {
          map.set(ing.id, {
            ingredient: ing,
            totalQuantity: mi.quantity,
            totalCost: itemCost,
            totalCalories: itemCalories,
            totalProtein: itemProtein,
            fromMeals: [meal.name],
          });
        }
      }
    }

    return Array.from(map.values());
  }, [meals]);

  /* ── Group by category ── */
  const groupedItems = useMemo(() => {
    const groups: Record<CategoryKey, AggregatedItem[]> = {
      PROTEIN: [],
      VEGGIE: [],
      CARB: [],
      SPICE: [],
      LIQUID: [],
    };

    for (const item of aggregatedItems) {
      const cat = item.ingredient.category as CategoryKey;
      if (groups[cat]) {
        groups[cat].push(item);
      }
    }

    // Sort each category by cost descending
    for (const key of CATEGORY_ORDER) {
      groups[key].sort((a, b) => b.totalCost - a.totalCost);
    }

    return groups;
  }, [aggregatedItems]);

  /* ── Filter by search ── */
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedItems;
    const q = searchQuery.toLowerCase();
    const result: Record<CategoryKey, AggregatedItem[]> = {
      PROTEIN: [],
      VEGGIE: [],
      CARB: [],
      SPICE: [],
      LIQUID: [],
    };

    for (const key of CATEGORY_ORDER) {
      result[key] = groupedItems[key].filter((item) =>
        item.ingredient.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [groupedItems, searchQuery]);

  /* ── Summary stats ── */
  const totalItems = aggregatedItems.length;
  const checkedCount = checkedItems.size;
  const totalCost = aggregatedItems.reduce(
    (sum, item) => sum + item.totalCost,
    0
  );
  const checkedCost = aggregatedItems
    .filter((item) => checkedItems.has(item.ingredient.id))
    .reduce((sum, item) => sum + item.totalCost, 0);
  const totalCalories = aggregatedItems.reduce(
    (sum, item) => sum + item.totalCalories,
    0
  );
  const totalProtein = aggregatedItems.reduce(
    (sum, item) => sum + item.totalProtein,
    0
  );
  const progressPct =
    totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  /* ── Actions ── */
  const toggleItem = (id: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (cat: CategoryKey) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const checkAll = () => {
    setCheckedItems(new Set(aggregatedItems.map((item) => item.ingredient.id)));
    showToast("All items checked!", "success");
  };

  const uncheckAll = () => {
    setCheckedItems(new Set());
  };

  return (
    <div className="font-body pt-20 pb-16 relative overflow-hidden min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        .font-body    { font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(192,132,252,0.3); border-radius: 99px; }
      `}</style>

      {/* ── Ambient gradient orbs (purple theme) ── */}
      <motion.div
        className={`absolute rounded-full blur-[130px] w-[500px] h-[500px] top-20 -right-32 pointer-events-none ${isDark ? "bg-purple-700" : "bg-purple-200"}`}
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.18, 0.08] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
      <motion.div
        className={`absolute rounded-full blur-[100px] w-[350px] h-[350px] bottom-40 left-[5%] pointer-events-none ${isDark ? "bg-fuchsia-800" : "bg-fuchsia-100"}`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.15, 0.06] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />
      <motion.div
        className={`absolute w-[300px] h-[300px] rounded-full blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${isDark ? "bg-violet-900/30" : "bg-violet-50/60"}`}
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
                ? "bg-purple-500/90 text-white"
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

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* ── Page Header ── */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <h1
                  className={`font-display text-3xl font-bold tracking-tight ${isDark ? "text-stone-100" : "text-stone-900"}`}
                >
                  Grocery List
                </h1>
              </div>
              <p
                className={`text-sm mt-1 ${isDark ? "text-stone-500" : "text-stone-400"}`}
              >
                Auto-generated from all your saved meals
              </p>
            </div>

            <div className="flex items-center gap-3">
              {totalItems > 0 && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={
                      checkedCount === totalItems ? uncheckAll : checkAll
                    }
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${isDark ? "bg-purple-500/10 border-purple-500/25 text-purple-400 hover:bg-purple-500/15" : "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100"}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {checkedCount === totalItems
                      ? "Uncheck All"
                      : "Check All"}
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Loading state ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p
              className={`text-sm ${isDark ? "text-stone-500" : "text-stone-400"}`}
            >
              Loading your grocery list...
            </p>
          </div>
        ) : totalItems === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 gap-4"
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"}`}
            >
              <ShoppingCart
                className={`w-10 h-10 ${isDark ? "text-stone-700" : "text-stone-300"}`}
              />
            </div>
            <p
              className={`font-display text-xl font-bold ${isDark ? "text-stone-300" : "text-stone-700"}`}
            >
              No saved meals yet
            </p>
            <p
              className={`text-sm max-w-xs text-center ${isDark ? "text-stone-500" : "text-stone-400"}`}
            >
              Create and save meals in the Meal Builder to auto-generate your
              grocery list.
            </p>
          </motion.div>
        ) : (
          <>
            {/* ══════════════════════════════
                SUMMARY CARDS
            ══════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                {
                  icon: Package,
                  emoji: "🛒",
                  label: "Total Items",
                  val: `${totalItems}`,
                  sub: `${checkedCount} checked`,
                  color: "#C084FC",
                },
                {
                  icon: IndianRupee,
                  emoji: "💰",
                  label: "Est. Total Cost",
                  val: formatCurrency(totalCost),
                  sub: `${formatCurrency(checkedCost)} checked`,
                  color: "#34D399",
                },
                {
                  icon: Flame,
                  emoji: "🔥",
                  label: "Total Calories",
                  val: `${Math.round(totalCalories).toLocaleString()}`,
                  sub: "across all meals",
                  color: "#FB923C",
                },
                {
                  icon: TrendingUp,
                  emoji: "💪",
                  label: "Total Protein",
                  val: `${Math.round(totalProtein)} g`,
                  sub: "across all meals",
                  color: "#60A5FA",
                },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                  whileHover={{ y: -2 }}
                  className={`p-5 rounded-2xl border transition-all duration-200 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07] shadow-sm"}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{s.emoji}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-stone-500" : "text-stone-400"}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p
                    className="text-xl font-bold tabular-nums"
                    style={{ color: s.color }}
                  >
                    {s.val}
                  </p>
                  <p
                    className={`text-xs mt-1 ${isDark ? "text-stone-600" : "text-stone-400"}`}
                  >
                    {s.sub}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* ── Progress bar ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`rounded-2xl border p-4 mb-8 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07] shadow-sm"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-semibold ${isDark ? "text-stone-400" : "text-stone-500"}`}
                >
                  Shopping Progress
                </span>
                <span className="text-xs font-bold text-purple-500 tabular-nums">
                  {checkedCount} / {totalItems} items · {progressPct}%
                </span>
              </div>
              <div
                className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}
              >
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              {progressPct === 100 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 mt-3 text-emerald-500"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-semibold">
                    All items checked off! You're ready to shop! 🎉
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* ── Search ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className={`relative rounded-2xl border mb-8 transition-colors ${isDark ? "bg-white/[0.03] border-white/[0.07] focus-within:border-purple-500/40" : "bg-white border-black/[0.07] focus-within:border-purple-500/50"}`}
            >
              <Search
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-stone-600" : "text-stone-400"}`}
              />
              <input
                type="text"
                placeholder="Search grocery items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-11 pr-4 py-3.5 bg-transparent text-sm font-medium outline-none rounded-2xl ${isDark ? "text-stone-100 placeholder:text-stone-600" : "text-stone-900 placeholder:text-stone-400"}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-stone-500 hover:text-purple-500 hover:bg-purple-500/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>

            {/* ══════════════════════════════
                GROCERY ITEMS BY CATEGORY
            ══════════════════════════════ */}
            <div className="space-y-6">
              {CATEGORY_ORDER.map((catKey, catIdx) => {
                const items = filteredGroups[catKey];
                if (items.length === 0) return null;

                const meta = CATEGORY_META[catKey];
                const isCollapsed = collapsedCategories.has(catKey);
                const catCheckedCount = items.filter((item) =>
                  checkedItems.has(item.ingredient.id)
                ).length;
                const catTotalCost = items.reduce(
                  (sum, item) => sum + item.totalCost,
                  0
                );

                return (
                  <motion.div
                    key={catKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.5 + catIdx * 0.1,
                      duration: 0.5,
                    }}
                    className={`rounded-3xl border overflow-hidden ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07]"} shadow-lg`}
                  >
                    {/* Category header */}
                    <button
                      onClick={() => toggleCategory(catKey)}
                      className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.02]"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{
                            background: `${meta.color}15`,
                            border: `1px solid ${meta.color}30`,
                          }}
                        >
                          <img
                            src={meta.iconUrl}
                            alt=""
                            className="w-5 h-5 object-contain"
                          />
                        </div>
                        <div className="text-left">
                          <p
                            className="text-sm font-bold"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </p>
                          <p
                            className={`text-[11px] ${isDark ? "text-stone-500" : "text-stone-400"}`}
                          >
                            {items.length} item{items.length !== 1 ? "s" : ""}{" "}
                            · {catCheckedCount} checked ·{" "}
                            {formatCurrency(catTotalCost)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Mini category progress */}
                        <div
                          className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: meta.color }}
                            animate={{
                              width: `${items.length > 0 ? (catCheckedCount / items.length) * 100 : 0}%`,
                            }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        {isCollapsed ? (
                          <ChevronDown
                            className={`w-4 h-4 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                          />
                        ) : (
                          <ChevronUp
                            className={`w-4 h-4 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                          />
                        )}
                      </div>
                    </button>

                    {/* Items list */}
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div
                            className={`mx-6 mb-1 h-px ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}
                          />
                          <div className="px-4 pb-4 pt-2 space-y-1.5">
                            {items.map((item, itemIdx) => {
                              const isChecked = checkedItems.has(
                                item.ingredient.id
                              );

                              return (
                                <motion.button
                                  key={item.ingredient.id}
                                  initial={{ opacity: 0, x: -12 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{
                                    delay: itemIdx * 0.03,
                                    duration: 0.25,
                                  }}
                                  whileHover={{
                                    scale: 1.01,
                                    borderColor: `${meta.color}40`,
                                  }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() =>
                                    toggleItem(item.ingredient.id)
                                  }
                                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                                    isChecked
                                      ? isDark
                                        ? "bg-purple-500/[0.05] border-purple-500/20"
                                        : "bg-purple-50/50 border-purple-200/50"
                                      : isDark
                                        ? "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                                        : "bg-stone-50/50 border-black/[0.06] hover:bg-stone-100/80"
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <motion.div
                                    animate={{
                                      background: isChecked
                                        ? meta.color
                                        : "transparent",
                                      borderColor: isChecked
                                        ? meta.color
                                        : `${meta.color}50`,
                                    }}
                                    className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{
                                      border: `1.5px solid ${isChecked ? meta.color : meta.color + "50"}`,
                                    }}
                                  >
                                    <AnimatePresence>
                                      {isChecked && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          exit={{ scale: 0 }}
                                          transition={{
                                            type: "spring",
                                            stiffness: 500,
                                          }}
                                        >
                                          <Check className="w-3 h-3 text-white" />
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </motion.div>

                                  {/* Icon */}
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <img
                                      src={
                                        item.ingredient.iconUrl || FALLBACK_ICON
                                      }
                                      alt=""
                                      className="w-6 h-6 object-contain"
                                    />
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`text-sm font-semibold truncate transition-all duration-200 ${
                                        isChecked
                                          ? isDark
                                            ? "text-stone-500 line-through"
                                            : "text-stone-400 line-through"
                                          : isDark
                                            ? "text-stone-200"
                                            : "text-stone-800"
                                      }`}
                                    >
                                      {item.ingredient.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span
                                        className={`text-[11px] font-medium ${isDark ? "text-stone-500" : "text-stone-400"}`}
                                      >
                                        {formatQuantity(item.totalQuantity)}
                                      </span>
                                      <span
                                        className={`text-[11px] ${isDark ? "text-stone-700" : "text-stone-300"}`}
                                      >
                                        •
                                      </span>
                                      <span className="text-[11px] font-medium text-purple-400/80">
                                        from{" "}
                                        {item.fromMeals.length === 1
                                          ? item.fromMeals[0]
                                          : `${item.fromMeals.length} meals`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Price & nutrition */}
                                  <div className="text-right flex-shrink-0">
                                    <p
                                      className={`text-xs font-bold tabular-nums ${isChecked ? "text-emerald-600" : "text-emerald-500"}`}
                                    >
                                      {formatCurrency(item.totalCost)}
                                    </p>
                                    <p
                                      className={`text-[10px] tabular-nums ${isDark ? "text-stone-600" : "text-stone-400"}`}
                                    >
                                      {Math.round(item.totalCalories)} kcal ·{" "}
                                      {Math.round(item.totalProtein)}g P
                                    </p>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Cost breakdown footer ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className={`mt-8 rounded-3xl border p-6 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-black/[0.07]"} shadow-lg`}
            >
              <div className="flex items-center gap-2 mb-5">
                <IndianRupee
                  className={`w-4 h-4 ${isDark ? "text-purple-400" : "text-purple-500"}`}
                />
                <h2
                  className={`font-display text-lg font-bold ${isDark ? "text-stone-100" : "text-stone-900"}`}
                >
                  Cost Breakdown by Category
                </h2>
              </div>

              <div className="space-y-3">
                {CATEGORY_ORDER.map((catKey) => {
                  const items = groupedItems[catKey];
                  if (items.length === 0) return null;
                  const meta = CATEGORY_META[catKey];
                  const catCost = items.reduce(
                    (sum, item) => sum + item.totalCost,
                    0
                  );
                  const pct =
                    totalCost > 0
                      ? Math.round((catCost / totalCost) * 100)
                      : 0;

                  return (
                    <div key={catKey}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <img
                            src={meta.iconUrl}
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                          <span
                            className={`text-xs font-medium ${isDark ? "text-stone-400" : "text-stone-500"}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color: meta.color }}
                          >
                            {formatCurrency(catCost)}
                          </span>
                          <span
                            className={`text-[10px] tabular-nums ${isDark ? "text-stone-600" : "text-stone-400"}`}
                          >
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                      <div
                        className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: meta.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{
                            duration: 0.8,
                            delay: 0.1,
                            ease: "easeOut",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grand total */}
              <div
                className={`mt-6 pt-4 border-t flex items-center justify-between ${isDark ? "border-white/[0.07]" : "border-black/[0.07]"}`}
              >
                <span
                  className={`text-sm font-semibold ${isDark ? "text-stone-300" : "text-stone-700"}`}
                >
                  Estimated Grand Total
                </span>
                <span className="text-lg font-bold text-purple-500 tabular-nums">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

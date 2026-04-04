import { useState, useEffect, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Flame,
  Copy,
  CheckCircle,
  Loader2,
  Bookmark,
  UtensilsCrossed,
  X,
  Sparkles,
  Zap,
  TrendingUp,
  Users,
} from "lucide-react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ingredient {
  id: number;
  name: string;
  category: "PROTEIN" | "VEGGIE" | "CARB" | "SPICE" | "LIQUID";
  calories?: number;
  proteinGrams?: number;
  cost?: number;
  iconUrl?: string;
}

interface SelectedIngredient {
  ingredient: Ingredient;
  quantity: number;
}

interface MealIngredient {
  ingredient: Ingredient;
  quantity: number;
}

interface SavedMeal {
  id: number;
  name: string;
  mealIngredients: MealIngredient[];
}

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: null, label: "All", icon: "https://em-content.zobj.net/source/apple/391/sparkles_2728.png", color: "#f97316" },
  { key: "PROTEIN", label: "Protein", icon: "https://em-content.zobj.net/source/apple/391/cut-of-meat_1f969.png", color: "#ef4444" },
  { key: "CARB", label: "Carbs", icon: "https://em-content.zobj.net/source/apple/391/sheaf-of-rice_1f33e.png", color: "#eab308" },
  { key: "VEGGIE", label: "Veggies", icon: "https://em-content.zobj.net/source/apple/391/leafy-green_1f96c.png", color: "#22c55e" },
  { key: "SPICE", label: "Spices", icon: "https://em-content.zobj.net/source/apple/391/hot-pepper_1f336-fe0f.png", color: "#dc2626" },
  { key: "LIQUID", label: "Liquids", icon: "https://em-content.zobj.net/source/apple/391/glass-of-milk_1f95b.png", color: "#3b82f6" },
] as const;

const CATEGORY_BG: Record<string, { gradient: string; border: string; accent: string }> = {
  PROTEIN: { gradient: "from-red-500/15 to-red-900/5", border: "border-red-500/20", accent: "#ef4444" },
  CARB: { gradient: "from-amber-500/15 to-amber-900/5", border: "border-amber-500/20", accent: "#eab308" },
  VEGGIE: { gradient: "from-emerald-500/15 to-emerald-900/5", border: "border-emerald-500/20", accent: "#22c55e" },
  SPICE: { gradient: "from-rose-500/15 to-rose-900/5", border: "border-rose-500/20", accent: "#dc2626" },
  LIQUID: { gradient: "from-blue-500/15 to-blue-900/5", border: "border-blue-500/20", accent: "#3b82f6" },
};

const FALLBACK_ICON = "https://em-content.zobj.net/source/apple/391/jar_1fad9.png";

// ─── Component ────────────────────────────────────────────────────────────────
export default function MealCreator({ isDark = true }: { isDark?: boolean }) {
  const { userId } = useContext(AuthContext);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [selected, setSelected] = useState<SelectedIngredient[]>([]);
  const [mealName, setMealName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "saved">("create");
  const [searchFocused, setSearchFocused] = useState(false);
  const [communityMeals, setCommunityMeals] = useState<SavedMeal[]>([]);
  const [communityMealIndex, setCommunityMealIndex] = useState(0);
  const [savingCommunityId, setSavingCommunityId] = useState<number | null>(null);

  // ─── Fetch ingredients ─────────────────────────────────────────────────────
  const fetchIngredients = useCallback(async () => {
    setLoadingIngredients(true);
    try {
      const url = activeCategory
        ? `/ingredients/search?category=${activeCategory}`
        : `/ingredients`;
      const res = await api.get<Ingredient[]>(url);
      setIngredients(res.data);
    } catch {
      showToast("Failed to load ingredients.", "error");
    } finally {
      setLoadingIngredients(false);
    }
  }, [activeCategory]);

  const fetchSavedMeals = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get<SavedMeal[]>(`/meals/user/${userId}`);
      setSavedMeals(res.data);
    } catch {
      /* silently fail */
    }
  }, [userId]);

  useEffect(() => {
    fetchIngredients();
  }, [userId, fetchIngredients, fetchSavedMeals]);

  // ─── Fetch community meals ──────────────────────────────────────────────────
  const fetchCommunityMeals = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/meals/community/${userId}`);
      setCommunityMeals(res.data);
    } catch {
      // silently fail
    }
  }, [userId]);

  useEffect(() => {
    fetchCommunityMeals();
  }, [fetchCommunityMeals]);

  useEffect(() => {
    fetchSavedMeals();
  }, [fetchSavedMeals]);

  // ─── Community meals auto-scroll ───────────────────────────────────────────
  useEffect(() => {
    if (communityMeals.length <= 2) return;
    const interval = setInterval(() => {
      setCommunityMealIndex((prev) => (prev + 1) % communityMeals.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [communityMeals.length]);

  // ─── Toast ─────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Ingredient Actions ───────────────────────────────────────────────────
  const addIngredient = (ing: Ingredient) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.ingredient.id === ing.id);
      if (exists)
        return prev.map((s) =>
          s.ingredient.id === ing.id ? { ...s, quantity: s.quantity + 100 } : s,
        );
      return [...prev, { ingredient: ing, quantity: 100 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setSelected((prev) =>
      prev.map((s) =>
        s.ingredient.id === id
          ? { ...s, quantity: Math.max(10, s.quantity + delta) }
          : s,
      ),
    );
  };

  const removeIngredient = (id: number) => {
    setSelected((prev) => prev.filter((s) => s.ingredient.id !== id));
  };

  // ─── Save Meal ─────────────────────────────────────────────────────────────
  const saveMeal = async () => {
    if (!mealName.trim())
      return showToast("Give your meal a name first!", "error");
    if (selected.length === 0)
      return showToast("Add at least one ingredient.", "error");
    setSaving(true);
    try {
      await api.post("/meals", {
        userId: Number(userId),
        name: mealName.trim(),
        ingredients: selected.map((s) => ({
          ingredientId: s.ingredient.id,
          quantity: s.quantity,
        })),
      });
      showToast(`"${mealName}" saved successfully!`, "success");
      setSelected([]);
      setMealName("");
      fetchSavedMeals();
    } catch {
      showToast("Failed to save meal. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Meal ───────────────────────────────────────────────────────────
  const deleteMeal = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/meals/${id}`);
      setSavedMeals((prev) => prev.filter((m) => m.id !== id));
      showToast("Meal removed.", "success");
    } catch {
      showToast("Couldn't delete meal.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Duplicate Meal ────────────────────────────────────────────────────────
  const duplicateMeal = async (id: number) => {
    setDuplicatingId(id);
    try {
      await api.post(`/meals/${id}/duplicate`);
      fetchSavedMeals();
      showToast("Meal duplicated!", "success");
    } catch {
      showToast("Couldn't duplicate meal.", "error");
    } finally {
      setDuplicatingId(null);
    }
  };

  // ─── Save community meal to user's saved meals ────────────────────────────
  const saveCommunityMeal = async (meal: SavedMeal) => {
    if (!userId) return;
    setSavingCommunityId(meal.id);
    try {
      await api.post("/meals", {
        userId: Number(userId),
        name: meal.name,
        ingredients: (meal.mealIngredients ?? []).map((mi) => ({
          ingredientId: mi.ingredient.id,
          quantity: mi.quantity,
        })),
      });
      showToast(`"${meal.name}" added to your saved meals!`, "success");
      fetchSavedMeals();
    } catch {
      showToast("Failed to save community meal.", "error");
    } finally {
      setSavingCommunityId(null);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const filteredIngredients = (() => {
    const matched = ingredients.filter((i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    // When viewing "All", interleave categories for visual variety
    if (activeCategory !== null) return matched;
    const buckets: Record<string, Ingredient[]> = {};
    const catOrder = ["PROTEIN", "CARB", "VEGGIE", "SPICE", "LIQUID"];
    catOrder.forEach((c) => (buckets[c] = []));
    matched.forEach((ing) => {
      if (buckets[ing.category]) buckets[ing.category].push(ing);
    });
    const result: Ingredient[] = [];
    let added = true;
    let idx = 0;
    while (added) {
      added = false;
      for (const cat of catOrder) {
        if (idx < buckets[cat].length) {
          result.push(buckets[cat][idx]);
          added = true;
        }
      }
      idx++;
    }
    return result;
  })();

  const totalCalories = selected.reduce(
    (sum, s) => sum + ((s.ingredient.calories ?? 0) * s.quantity),
    0,
  );

  const totalProtein = selected.reduce(
    (sum, s) => sum + ((s.ingredient.proteinGrams ?? 0) * s.quantity),
    0,
  );

  const getIcon = (ing: Ingredient) => ing.iconUrl || FALLBACK_ICON;

  const getMealCalories = (meal: SavedMeal) =>
    (meal.mealIngredients ?? []).reduce(
      (sum, mi) => sum + ((mi.ingredient.calories ?? 0) * mi.quantity),
      0,
    );

  const getMealProtein = (meal: SavedMeal) =>
    (meal.mealIngredients ?? []).reduce(
      (sum, mi) =>
        sum + ((mi.ingredient.proteinGrams ?? 0) * mi.quantity),
      0,
    );

  return (
    <div className="font-body pt-20 pb-10 relative overflow-hidden min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        .font-body    { font-family: 'Outfit', sans-serif; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.3); border-radius: 99px; }

        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          70%  { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        .pulse-save { animation: pulse-ring 2s infinite; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-btn {
          background: linear-gradient(90deg, #f97316 0%, #fbbf24 50%, #f97316 100%);
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
        .float-icon { animation: float 3s ease-in-out infinite; }

        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .orbit-ring { animation: orbit-spin 30s linear infinite; }
      `}</style>

      {/* ── Animated background (Login.tsx style) ── */}
      <motion.div
        className={`absolute rounded-full blur-[80px] opacity-30 w-[500px] h-[500px] -top-40 -right-20 ${isDark ? "bg-orange-600" : "bg-orange-300"}`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`absolute rounded-full blur-[80px] opacity-30 w-[400px] h-[400px] -bottom-32 -left-20 ${isDark ? "bg-amber-700" : "bg-amber-200"}`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className={`absolute w-[300px] h-[300px] rounded-full blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isDark ? "bg-red-900/30" : "bg-rose-100/60"}`}
        animate={{ scale: [1, 1.4, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

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
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 backdrop-blur-md ${toast.type === "success"
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

      {/* ── Page Header ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
              <h1
                className={`font-display text-3xl font-bold tracking-tight ${isDark ? "text-stone-100" : "text-stone-900"}`}
              >
                Meal Builder
              </h1>
            </div>
            <p
              className={`text-sm ml-[52px] ${isDark ? "text-stone-500" : "text-stone-400"}`}
            >
              Pick ingredients, set quantities, save your perfect meal
            </p>
          </div>

          {/* Tabs */}
          <div
            className={`flex rounded-2xl p-1.5 self-start sm:self-auto border ${isDark
              ? "bg-white/[0.04] border-white/[0.06]"
              : "bg-black/[0.03] border-black/[0.06]"
              }`}
          >
            {[
              { key: "create", label: "Create", icon: Sparkles },
              {
                key: "saved",
                label: `Saved${savedMeals.length > 0 ? ` (${savedMeals.length})` : ""}`,
                icon: Bookmark,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "create" | "saved")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.key
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                  : isDark
                    ? "text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]"
                    : "text-stone-500 hover:text-stone-700 hover:bg-black/[0.04]"
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── CREATE TAB ── */}
      <AnimatePresence mode="wait">
        {activeTab === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 lg:gap-20"
          >
            {/* ── LEFT: Ingredient Browser ── */}
            <div className="space-y-5">
              {/* Search bar */}
              <motion.div
                animate={{
                  borderColor: searchFocused
                    ? isDark
                      ? "rgba(249,115,22,0.4)"
                      : "rgba(249,115,22,0.5)"
                    : isDark
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(0,0,0,0.07)",
                  boxShadow: searchFocused
                    ? "0 0 0 3px rgba(249,115,22,0.1)"
                    : "0 0 0 0px rgba(249,115,22,0)",
                }}
                className={`relative rounded-2xl border transition-colors ${isDark ? "bg-white/[0.03]" : "bg-white shadow-sm border-stone-200/80"
                  }`}
              >
                <Search
                  className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchFocused
                    ? "text-orange-500"
                    : isDark
                      ? "text-stone-500"
                      : "text-stone-400"
                    }`}
                />
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className={`w-full pl-11 pr-4 py-4 bg-transparent text-sm font-medium outline-none rounded-2xl ${isDark
                    ? "text-stone-200 placeholder:text-stone-600"
                    : "text-stone-800 placeholder:text-stone-400"
                    }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-stone-500 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>

              {/* Category filters */}
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <motion.button
                    key={String(cat.key)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory(cat.key as string | null)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${activeCategory === cat.key
                      ? "border-orange-500 text-orange-500 bg-orange-500/10 shadow-sm shadow-orange-500/10"
                      : isDark
                        ? "border-white/[0.07] text-stone-400 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                        : "border-black/[0.07] text-stone-500 bg-white hover:border-black/15 hover:bg-stone-50"
                      }`}
                  >
                    <img
                      src={cat.icon}
                      alt=""
                      className="w-4 h-4 object-contain"
                    />
                    {cat.label}
                  </motion.button>
                ))}
              </div>

              {/* Ingredients grid */}
              {loadingIngredients ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  <p
                    className={`text-sm ${isDark ? "text-stone-600" : "text-stone-400"}`}
                  >
                    Loading ingredients...
                  </p>
                </div>
              ) : filteredIngredients.length === 0 ? (
                <div
                  className={`text-center py-16 ${isDark ? "text-stone-600" : "text-stone-400"}`}
                >
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold mb-1">No ingredients found</p>
                  <p className="text-xs opacity-70">
                    Try a different search or category
                  </p>
                </div>
              ) : (
                <div className={`max-h-[65vh] overflow-y-auto rounded-2xl pr-1`}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {filteredIngredients.map((ing, i) => {
                      const isAdded = selected.some(
                        (s) => s.ingredient.id === ing.id,
                      );
                      const catStyle = CATEGORY_BG[ing.category] || {
                        gradient: "from-stone-500/15 to-stone-900/5",
                        border: "border-stone-500/20",
                        accent: "#78716c",
                      };
                      return (
                        <motion.div
                          key={ing.id}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: Math.min(i, 20) * 0.015, duration: 0.3 }}
                          whileHover={{ y: -4, scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => addIngredient(ing)}
                          className={`relative cursor-pointer rounded-xl border bg-gradient-to-br px-3 py-2.5 transition-all duration-200 group overflow-hidden ${catStyle.gradient} ${catStyle.border} ${isAdded
                            ? "ring-2 ring-orange-500 ring-offset-1 " +
                            (isDark
                              ? "ring-offset-[#0C0B09]"
                              : "ring-offset-[#FAFAF9]")
                            : "hover:shadow-lg hover:shadow-black/10"
                            }`}
                        >
                          {/* Added badge */}
                          <AnimatePresence>
                            {isAdded && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-md shadow-orange-500/40"
                              >
                                <CheckCircle className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Icon from backend */}
                          <div className="mb-2 w-9 h-9 flex items-center justify-center">
                            <img
                              src={getIcon(ing)}
                              alt={ing.name}
                              className="w-8 h-8 object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-200"
                            />
                          </div>

                          <p
                            className={`font-semibold text-xs leading-tight mb-1 ${isDark ? "text-stone-200" : "text-stone-800"}`}
                          >
                            {ing.name}
                          </p>

                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                            {ing.calories != null && (
                              <p
                                className={`text-[10px] font-medium ${isDark ? "text-stone-500" : "text-stone-400"}`}
                              >
                                {ing.calories} kcal
                              </p>
                            )}
                            {ing.proteinGrams != null && ing.proteinGrams > 0 && (
                              <p className="text-[10px] font-medium text-orange-500/70">
                                {ing.proteinGrams}g protein
                              </p>
                            )}
                          </div>

                          {/* Hover overlay */}
                          <div className="absolute inset-0 rounded-xl bg-orange-500/0 group-hover:bg-orange-500/[0.07] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 scale-0 group-hover:scale-100 transition-transform duration-200">
                              <Plus className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Meal Builder Panel ── */}
            <div className="lg:sticky lg:top-[80px] lg:self-start relative flex flex-col gap-6">
              <div
                className="absolute -inset-2 rounded-3xl blur-2xl opacity-40 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 80%, rgba(251,146,60,0.2), transparent 60%)",
                }}
              />
              <div
                className={`relative rounded-3xl border overflow-hidden ${isDark
                  ? "bg-[#131210] border-white/[0.07] shadow-2xl shadow-black/40"
                  : "bg-white border-stone-200/80 shadow-2xl shadow-stone-300/30"
                  }`}
              >
                {/* Card header with gradient */}
                <div className="relative overflow-hidden px-6 pt-6 pb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                        <Flame
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                        />
                      </div>
                      <span
                        className={`text-xs font-bold tracking-widest uppercase ${isDark ? "text-stone-400" : "text-stone-500"}`}
                      >
                        Your Bowl
                      </span>
                      {selected.length > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto bg-orange-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm shadow-orange-500/30"
                        >
                          {selected.length} item{selected.length !== 1 && "s"}
                        </motion.span>
                      )}
                    </div>

                    {/* Meal name input */}
                    <input
                      type="text"
                      placeholder="Name your creation..."
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                      className={`w-full font-display text-2xl font-bold bg-transparent outline-none placeholder:font-display placeholder:font-bold transition-colors ${isDark
                        ? "text-stone-100 placeholder:text-stone-700"
                        : "text-stone-900 placeholder:text-stone-300"
                        }`}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div
                  className={`h-px mx-6 ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}
                />

                {/* ─── Orbital ingredient visual ─── */}
                <div className="relative flex items-center justify-center py-5 px-4">
                  <div className="relative" style={{ width: 176, height: 176 }}>
                    {/* Rotating dashed orbit ring */}
                    <div
                      className="absolute inset-0 orbit-ring rounded-full"
                      style={{
                        border: `1.5px dashed ${isDark ? "rgba(251,146,60,0.18)" : "rgba(251,146,60,0.15)"}`,
                      }}
                    />

                    {/* Second inner ring */}
                    <div
                      className="absolute rounded-full"
                      style={{
                        inset: 28,
                        border: `1px solid ${isDark ? "rgba(251,146,60,0.06)" : "rgba(251,146,60,0.05)"}`,
                      }}
                    />

                    {/* Inner ambient glow */}
                    <div
                      className="absolute rounded-full transition-all duration-700"
                      style={{
                        inset: 20,
                        background: selected.length > 0
                          ? "radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 70%)"
                          : "radial-gradient(circle, rgba(251,146,60,0.04) 0%, transparent 70%)",
                      }}
                    />

                    {/* SVG connecting lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 176 176">
                      <AnimatePresence>
                        {selected.slice(0, 8).map((s, i) => {
                          const total = Math.min(selected.length, 8);
                          const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
                          const x = 88 + 64 * Math.cos(angle);
                          const y = 88 + 64 * Math.sin(angle);
                          const catColor = (CATEGORY_BG[s.ingredient.category] || { accent: "#78716c" }).accent;
                          return (
                            <motion.line
                              key={s.ingredient.id}
                              x1="88" y1="88" x2={x} y2={y}
                              stroke={catColor}
                              strokeWidth="0.75"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.15 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.4 }}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </svg>

                    {/* Center content */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      {selected.length === 0 ? (
                        <motion.div
                          animate={{ scale: [1, 1.08, 1] }}
                          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                          className="flex flex-col items-center"
                        >
                          <Sparkles className={`w-7 h-7 ${isDark ? "text-orange-500/25" : "text-orange-500/20"}`} />
                          <p className={`text-[10px] mt-1.5 font-medium ${isDark ? "text-stone-600" : "text-stone-400"}`}>
                            Add ingredients
                          </p>
                        </motion.div>
                      ) : (
                        <div className="text-center">
                          <motion.p
                            key={Math.round(totalCalories)}
                            initial={{ y: -4, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-xl font-bold text-orange-500 tabular-nums leading-none"
                          >
                            {Math.round(totalCalories)}
                          </motion.p>
                          <p className={`text-[9px] mt-0.5 uppercase tracking-wider font-medium ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                            kcal
                            </p>
                        </div>
                      )}
                    </div>

                    {/* Orbiting ingredient icons */}
                    <AnimatePresence>
                      {selected.slice(0, 8).map((s, i) => {
                        const total = Math.min(selected.length, 8);
                        const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
                        const radius = 64;
                        const cx = 88 + radius * Math.cos(angle);
                        const cy = 88 + radius * Math.sin(angle);
                        const catColor = (CATEGORY_BG[s.ingredient.category] || { accent: "#78716c" }).accent;
                        return (
                          <motion.div
                            key={s.ingredient.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.04 }}
                            className="absolute"
                            style={{ left: cx - 17, top: cy - 17, width: 34, height: 34 }}
                          >
                            {/* Category glow */}
                            <div
                              className="absolute inset-0 rounded-full blur-md"
                              style={{ background: catColor, opacity: 0.3 }}
                            />
                            {/* Icon */}
                            <motion.div
                              animate={{ y: [0, -3, 0] }}
                              transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.35, ease: "easeInOut" }}
                              className={`relative w-full h-full rounded-full flex items-center justify-center border shadow-sm ${isDark ? "bg-[#1a1816] border-white/10" : "bg-white border-black/10"}`}
                              title={s.ingredient.name}
                            >
                              <img src={getIcon(s.ingredient)} alt={s.ingredient.name} className="w-5 h-5 object-contain" />
                            </motion.div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Overflow indicator */}
                    {selected.length > 8 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border z-10 ${isDark ? "bg-[#1a1816] border-white/10 text-stone-400" : "bg-white border-black/10 text-stone-500"}`}
                      >
                        +{selected.length - 8}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Selected ingredients list */}
                {selected.length > 0 && (
                  <div className="px-4 pb-3 max-h-[30vh] overflow-y-auto space-y-1.5">
                    <AnimatePresence>
                      {selected.map((s) => (
                        <motion.div
                          key={s.ingredient.id}
                          initial={{ opacity: 0, x: 20, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: "auto" }}
                          exit={{ opacity: 0, x: -20, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border ${isDark
                            ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                            : "bg-stone-50/80 border-black/[0.05] hover:bg-stone-100/80"
                            } transition-colors`}
                        >
                          <img
                            src={getIcon(s.ingredient)}
                            alt={s.ingredient.name}
                            className="w-6 h-6 object-contain flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-semibold truncate ${isDark ? "text-stone-200" : "text-stone-800"}`}
                            >
                              {s.ingredient.name}
                            </p>
                            <div className="flex gap-2">
                              {s.ingredient.calories != null && (
                                <p className={`text-[10px] ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                                  {Math.round(s.ingredient.calories * s.quantity)} kcal
                                </p>
                              )}
                              {s.ingredient.proteinGrams != null && s.ingredient.proteinGrams > 0 && (
                                <p className="text-[10px] text-orange-500/60">
                                  {Math.round(s.ingredient.proteinGrams * s.quantity)}g P
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quantity controls */}
                          <div
                            className={`flex items-center gap-0.5 rounded-lg px-1 py-0.5 ${isDark ? "bg-white/[0.05]" : "bg-black/[0.05]"}`}
                          >
                            <button
                              onClick={() => updateQuantity(s.ingredient.id, -10)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-orange-500 hover:bg-orange-500/10 transition-colors"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span
                              className={`text-[11px] font-bold w-9 text-center tabular-nums ${isDark ? "text-stone-300" : "text-stone-700"}`}
                            >
                              {s.quantity}g
                            </span>
                            <button
                              onClick={() => updateQuantity(s.ingredient.id, 10)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-orange-500 hover:bg-orange-500/10 transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeIngredient(s.ingredient.id)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-red-500/15 hover:text-red-500 ${isDark ? "text-stone-600" : "text-stone-400"}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Nutrition summary */}
                <AnimatePresence>
                  {selected.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 mb-4"
                    >
                      <div
                        className={`grid grid-cols-2 gap-2 ${isDark ? "" : ""
                          }`}
                      >
                        <div
                          className={`px-4 py-3 rounded-xl flex items-center gap-2.5 ${isDark
                            ? "bg-orange-500/10 border border-orange-500/20"
                            : "bg-orange-50 border border-orange-200"
                            }`}
                        >
                          <Zap className="w-4 h-4 text-orange-500" />
                          <div>
                            <p
                              className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-orange-300/70" : "text-orange-600/70"}`}
                            >
                              Calories
                            </p>
                            <p className="text-orange-500 font-bold text-sm tabular-nums">
                              {Math.round(totalCalories)}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`px-4 py-3 rounded-xl flex items-center gap-2.5 ${isDark
                            ? "bg-blue-500/10 border border-blue-500/20"
                            : "bg-blue-50 border border-blue-200"
                            }`}
                        >
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <div>
                            <p
                              className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-blue-300/70" : "text-blue-600/70"}`}
                            >
                              Protein
                            </p>
                            <p className="text-blue-500 font-bold text-sm tabular-nums">
                              {Math.round(totalProtein)}g
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Save button */}
                <div className="px-4 pb-5">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={
                      saving || selected.length === 0 || !mealName.trim()
                    }
                    onClick={saveMeal}
                    className={`w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all ${selected.length > 0 && mealName.trim()
                      ? "shimmer-btn pulse-save shadow-lg shadow-orange-500/25"
                      : isDark
                        ? "bg-white/[0.06] text-stone-600 cursor-not-allowed"
                        : "bg-black/[0.06] text-stone-400 cursor-not-allowed"
                      }`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> Save Meal
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* ── COMMUNITY BOWLS — Single card carousel with dots ── */}
              {communityMeals.length > 0 && (() => {
                const activeMeal = communityMeals[communityMealIndex % communityMeals.length];
                const mealIngredients = activeMeal.mealIngredients ?? [];
                const cal = getMealCalories(activeMeal);
                const pro = getMealProtein(activeMeal);
                return (
                <div className="flex flex-col mt-2">
                  <div className="flex items-center gap-2 mb-3 px-1.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shadow-md shadow-violet-500/20">
                      <Users className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3
                      className={`font-display text-lg font-bold ${isDark ? "text-stone-100" : "text-stone-900"}`}
                    >
                      Community Bowls
                    </h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 ml-auto rounded-md ${isDark ? "bg-violet-500/10 text-violet-400" : "bg-violet-50 text-violet-500"}`}>
                      by other chefs
                    </span>
                  </div>

                  {/* Single card */}
                  <div className="relative">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={activeMeal.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className={`relative rounded-2xl border overflow-hidden ${isDark
                          ? "bg-[#131210] border-white/[0.07]"
                          : "bg-white border-black/[0.07]"
                        } shadow-sm`}
                      >
                        {/* Gradient header */}
                        <div
                          className="h-12 relative"
                          style={{
                            background: isDark
                              ? "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.06) 100%)"
                              : "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.08) 100%)",
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center gap-1.5 px-4">
                            {mealIngredients.slice(0, 5).map((mi) => (
                              <div
                                key={mi.ingredient.id}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border ${isDark ? "bg-black/30 border-white/10" : "bg-white/60 border-black/10"}`}
                                title={mi.ingredient.name}
                              >
                                <img src={getIcon(mi.ingredient)} alt={mi.ingredient.name} className="w-5 h-5 object-contain" />
                              </div>
                            ))}
                            {mealIngredients.length > 5 && (
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border text-[10px] font-bold ${isDark ? "bg-black/30 border-white/10 text-stone-400" : "bg-white/60 border-black/10 text-stone-500"}`}>
                                +{mealIngredients.length - 5}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="px-3 pb-3 pt-2">
                          <h4 className={`font-display text-sm font-bold truncate mb-1.5 ${isDark ? "text-stone-100" : "text-stone-900"}`}>
                            {activeMeal.name}
                          </h4>

                          {/* Ingredient chips */}
                          <div className="flex flex-wrap gap-1 mb-2.5">
                            {mealIngredients.slice(0, 4).map((mi, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-md border ${isDark
                                  ? "bg-white/[0.03] border-white/[0.06] text-stone-500"
                                  : "bg-stone-50 border-stone-200 text-stone-500"
                                }`}
                              >
                                {mi.ingredient.name}
                              </span>
                            ))}
                            {mealIngredients.length > 4 && (
                              <span className={`text-[9px] px-1 py-0.5 ${isDark ? "text-stone-600" : "text-stone-400"}`}>
                                +{mealIngredients.length - 4} more
                              </span>
                            )}
                          </div>

                          {/* Stats */}
                          <div className={`flex items-center gap-3 px-2.5 py-1.5 rounded-xl border ${isDark ? "bg-white/[0.02] border-white/[0.05]" : "bg-stone-50 border-black/[0.04]"}`}>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-orange-500" />
                              <span className="text-xs font-bold text-orange-500 tabular-nums">{Math.round(cal)}</span>
                              <span className={`text-[9px] ${isDark ? "text-stone-600" : "text-stone-400"}`}>kcal</span>
                            </div>
                            <div className={`w-px h-3 ${isDark ? "bg-white/[0.07]" : "bg-black/[0.07]"}`} />
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 text-blue-500" />
                              <span className="text-xs font-bold text-blue-500 tabular-nums">{Math.round(pro)}g</span>
                              <span className={`text-[9px] ${isDark ? "text-stone-600" : "text-stone-400"}`}>protein</span>
                            </div>
                          </div>

                          {/* Save to my meals button */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={savingCommunityId === activeMeal.id}
                            onClick={() => saveCommunityMeal(activeMeal)}
                            className={`w-full mt-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${isDark
                              ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20"
                              : "bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200"
                            } ${savingCommunityId === activeMeal.id ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {savingCommunityId === activeMeal.id ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
                            ) : (
                              <><Bookmark className="w-3 h-3" /> Save to My Meals</>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Dot indicators */}
                  {communityMeals.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {communityMeals.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCommunityMealIndex(idx)}
                          className={`rounded-full transition-all duration-300 ${
                            idx === communityMealIndex % communityMeals.length
                              ? "w-5 h-2 bg-violet-500"
                              : isDark
                                ? "w-2 h-2 bg-white/15 hover:bg-white/30"
                                : "w-2 h-2 bg-black/15 hover:bg-black/30"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                );
              })()}
            </div>

          </motion.div>
        )}

        {/* ── SAVED TAB ── */}
        {activeTab === "saved" && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 max-w-7xl mx-auto px-6"
          >
            {savedMeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center mb-6 ${isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"
                    }`}
                >
                  <div
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(251,146,60,0.15) 0%, transparent 70%)",
                    }}
                  />
                  <div className="float-icon relative">
                    <Bookmark
                      className={`w-12 h-12 ${isDark ? "text-stone-700" : "text-stone-300"}`}
                    />
                  </div>
                </div>
                <p
                  className={`font-display text-2xl font-bold mb-2 ${isDark ? "text-stone-300" : "text-stone-700"}`}
                >
                  No saved meals yet
                </p>
                <p
                  className={`text-sm max-w-xs mx-auto text-center mb-8 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                >
                  Head over to the Create tab and build your first meal!
                </p>
                <motion.button
                  whileHover={{
                    scale: 1.04,
                    boxShadow: "0 0 18px rgba(251,146,60,0.22)",
                  }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveTab("create")}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-orange-500 text-white text-sm font-semibold shadow-lg shadow-orange-500/25"
                >
                  <Plus className="w-4 h-4" /> Create a Meal
                </motion.button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedMeals.map((meal, i) => {
                  const cal = getMealCalories(meal);
                  const pro = getMealProtein(meal);
                  const mealIngredients = meal.mealIngredients ?? [];
                  return (
                    <motion.div
                      key={meal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: i * 0.06,
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileHover={{ y: -6 }}
                      className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 ${isDark
                        ? "bg-[#131210] border-white/[0.07] hover:border-orange-500/30"
                        : "bg-white border-stone-200/80 hover:border-orange-500/30 shadow-lg shadow-stone-200/40"
                        } hover:shadow-2xl ${isDark ? "hover:shadow-orange-500/5" : "hover:shadow-orange-500/10"}`}
                    >
                      {/* Card glow on hover */}
                      <div
                        className="absolute -inset-1 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(ellipse at 50% 80%, rgba(251,146,60,0.08), transparent 60%)",
                        }}
                      />

                      {/* Ingredient showcase header */}
                      <div className="relative h-24 overflow-hidden">
                        <div
                          className="absolute inset-0"
                          style={{
                            background: isDark
                              ? "linear-gradient(135deg, rgba(251,146,60,0.12) 0%, rgba(245,158,11,0.06) 50%, rgba(96,165,250,0.05) 100%)"
                              : "linear-gradient(135deg, rgba(251,146,60,0.15) 0%, rgba(245,158,11,0.08) 50%, rgba(96,165,250,0.06) 100%)",
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center gap-3 px-4">
                          {mealIngredients.slice(0, 5).map((mi, idx) => (
                            <motion.div
                              key={mi.ingredient.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06 + idx * 0.05 }}
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm border ${isDark
                                ? "bg-black/30 border-white/10"
                                : "bg-white/60 border-black/10"
                                }`}
                              title={`${mi.ingredient.name} ${mi.quantity}g`}
                            >
                              <img
                                src={getIcon(mi.ingredient)}
                                alt={mi.ingredient.name}
                                className="w-7 h-7 object-contain"
                              />
                            </motion.div>
                          ))}
                          {mealIngredients.length > 5 && (
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm border text-xs font-bold ${isDark
                                ? "bg-black/30 border-white/10 text-stone-400"
                                : "bg-white/60 border-black/10 text-stone-500"
                                }`}
                            >
                              +{mealIngredients.length - 5}
                            </div>
                          )}
                        </div>
                        {/* Fade to card body */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-8"
                          style={{
                            background: isDark
                              ? "linear-gradient(to top, #131210, transparent)"
                              : "linear-gradient(to top, white, transparent)",
                          }}
                        />
                      </div>

                      <div className="relative px-5 pb-5 pt-1">
                        {/* Title + actions */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-display text-xl font-bold leading-tight truncate ${isDark ? "text-stone-100" : "text-stone-900"}`}
                            >
                              {meal.name}
                            </h3>
                            <p
                              className={`text-xs mt-1 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                            >
                              {mealIngredients.length} ingredient
                              {mealIngredients.length !== 1 && "s"}
                            </p>
                          </div>
                          <div className="flex gap-1.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => duplicateMeal(meal.id)}
                              disabled={duplicatingId === meal.id}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isDark
                                ? "bg-white/[0.06] text-stone-400 hover:text-orange-400 hover:bg-orange-500/10"
                                : "bg-stone-100 text-stone-400 hover:text-orange-500 hover:bg-orange-50"
                                }`}
                              title="Duplicate"
                            >
                              {duplicatingId === meal.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => deleteMeal(meal.id)}
                              disabled={deletingId === meal.id}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isDark
                                ? "bg-white/[0.06] text-stone-400 hover:text-red-400 hover:bg-red-500/10"
                                : "bg-stone-100 text-stone-400 hover:text-red-500 hover:bg-red-50"
                                }`}
                              title="Delete"
                            >
                              {deletingId === meal.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </motion.button>
                          </div>
                        </div>

                        {/* Ingredient chips */}
                        {mealIngredients.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {mealIngredients.map((mi, idx) => (
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

                        {/* Nutrition stats */}
                        <div
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isDark
                            ? "bg-white/[0.03] border-white/[0.05]"
                            : "bg-stone-50 border-black/[0.04]"
                            }`}
                        >
                          {cal > 0 && (
                            <div className="flex items-center gap-2 flex-1">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark
                                  ? "bg-orange-500/15"
                                  : "bg-orange-100"
                                  }`}
                              >
                                <Zap className="w-4 h-4 text-orange-500" />
                              </div>
                              <div>
                                <p className="text-orange-500 font-bold text-sm tabular-nums leading-none">
                                  {Math.round(cal)}
                                </p>
                                <p
                                  className={`text-[10px] ${isDark ? "text-stone-500" : "text-stone-400"}`}
                                >
                                  kcal
                                </p>
                              </div>
                            </div>
                          )}
                          {cal > 0 && pro > 0 && (
                            <div
                              className={`w-px h-8 ${isDark ? "bg-white/[0.07]" : "bg-black/[0.07]"}`}
                            />
                          )}
                          {pro > 0 && (
                            <div className="flex items-center gap-2 flex-1">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark
                                  ? "bg-blue-500/15"
                                  : "bg-blue-100"
                                  }`}
                              >
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-blue-500 font-bold text-sm tabular-nums leading-none">
                                  {Math.round(pro)}g
                                </p>
                                <p
                                  className={`text-[10px] ${isDark ? "text-stone-500" : "text-stone-400"}`}
                                >
                                  protein
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

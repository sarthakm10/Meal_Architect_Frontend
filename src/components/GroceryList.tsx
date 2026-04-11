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
  ExternalLink,
  BarChart3,
  Tag,
  AlertCircle,
} from "lucide-react";
import api from "../api/axios";
import {
  fetchPriceComparison,
  PLATFORM_META,
  type PlatformResult,
  type PlatformName,
} from "../api/groceryPriceApi";
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

/* ─── Price comparison state per item ─────────────────────────────────── */
interface PriceComparisonState {
  loading: boolean;
  error: string | null;
  results: PlatformResult[];
}

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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Price Comparison Panel — shown below a grocery item when expanded     */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function PriceComparisonPanel({
  state,
  isDark,
}: {
  state: PriceComparisonState;
  isDark: boolean;
}) {
  if (state.loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`rounded-2xl p-4 animate-pulse ${isDark ? "bg-white/[0.03]" : "bg-stone-100/80"}`}
          >
            <div className={`h-3 rounded-full w-20 mb-3 ${isDark ? "bg-white/[0.06]" : "bg-stone-200"}`} />
            <div className={`h-10 rounded-xl w-full mb-3 ${isDark ? "bg-white/[0.04]" : "bg-stone-200/60"}`} />
            <div className={`h-3 rounded-full w-16 mb-2 ${isDark ? "bg-white/[0.06]" : "bg-stone-200"}`} />
            <div className={`h-5 rounded-full w-12 ${isDark ? "bg-white/[0.08]" : "bg-stone-200"}`} />
          </div>
        ))}
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center gap-3 p-5">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <p className={`text-sm font-semibold ${isDark ? "text-stone-300" : "text-stone-700"}`}>
            Could not fetch prices
          </p>
          <p className={`text-xs mt-0.5 ${isDark ? "text-stone-500" : "text-stone-400"}`}>
            {state.error}
          </p>
        </div>
      </div>
    );
  }

  // Filter out error entries and only show real results
  const validResults = state.results.filter(
    (r) => !r.error && r.price > 0 && r.in_stock
  );

  if (validResults.length === 0) {
    return (
      <div className="flex items-center gap-3 p-5">
        <Search className={`w-5 h-5 flex-shrink-0 ${isDark ? "text-stone-600" : "text-stone-400"}`} />
        <p className={`text-sm ${isDark ? "text-stone-500" : "text-stone-400"}`}>
          No results found across platforms. Try a different search term.
        </p>
      </div>
    );
  }

  // Group by platform and pick the cheapest from each
  const byPlatform = new Map<PlatformName, PlatformResult[]>();
  for (const r of validResults) {
    const list = byPlatform.get(r.platform) || [];
    list.push(r);
    byPlatform.set(r.platform, list);
  }

  // For each platform, show up to 3 cheapest items
  const platformEntries = Array.from(byPlatform.entries()).map(
    ([platform, items]) => ({
      platform,
      items: items.sort((a, b) => a.price - b.price).slice(0, 3),
      bestPrice: Math.min(...items.map((i) => i.price)),
    })
  );

  // Global cheapest price
  const globalBest = Math.min(...platformEntries.map((p) => p.bestPrice));

  // Sort platforms by best price
  platformEntries.sort((a, b) => a.bestPrice - b.bestPrice);

  return (
    <div className="p-4 space-y-3">
      {/* Platform cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {platformEntries.map(({ platform, items, bestPrice }) => {
          const meta = PLATFORM_META[platform];
          const isBest = bestPrice === globalBest;

          return (
            <motion.div
              key={platform}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative rounded-2xl border overflow-hidden transition-all ${isBest
                  ? isDark
                    ? "border-emerald-500/40 bg-emerald-500/[0.04] shadow-lg shadow-emerald-500/10"
                    : "border-emerald-400/60 bg-emerald-50/50 shadow-lg shadow-emerald-100"
                  : isDark
                    ? "border-white/[0.06] bg-white/[0.02]"
                    : "border-stone-200/80 bg-stone-50/50"
                }`}
            >
              {/* Best price badge */}
              {isBest && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" />
                  Best Price
                </div>
              )}

              {/* Platform header */}
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{
                  borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                }}
              >
                <span className="text-base">{meta.logo}</span>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </span>
              </div>

              {/* Items */}
              <div className="p-3 space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${isDark ? "hover:bg-white/[0.03]" : "hover:bg-stone-100/50"}`}
                  >
                    {/* Product image */}
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[11px] font-medium leading-tight truncate ${isDark ? "text-stone-300" : "text-stone-700"}`}
                        title={item.item_name}
                      >
                        {item.item_name}
                      </p>
                      {item.quantity && (
                        <p className={`text-[10px] mt-0.5 ${isDark ? "text-stone-600" : "text-stone-400"}`}>
                          {item.quantity}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{
                            color:
                              item.price === globalBest
                                ? "#10b981"
                                : isDark
                                  ? "#e7e5e4"
                                  : "#292524",
                          }}
                        >
                          ₹{item.price}
                        </span>
                        {item.mrp > item.price && (
                          <span
                            className={`text-[10px] line-through tabular-nums ${isDark ? "text-stone-600" : "text-stone-400"}`}
                          >
                            ₹{item.mrp}
                          </span>
                        )}
                        {item.mrp > item.price && (
                          <span className="text-[9px] font-bold text-emerald-500">
                            {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% off
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Buy link */}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/[0.06] text-stone-500 hover:text-purple-400" : "hover:bg-stone-200/60 text-stone-400 hover:text-purple-500"}`}
                        title="Open on website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary row */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs ${isDark ? "bg-white/[0.02] text-stone-500" : "bg-stone-100/60 text-stone-400"}`}
      >
        <span>
          {validResults.length} product{validResults.length !== 1 ? "s" : ""} found
          across {platformEntries.length} platform{platformEntries.length !== 1 ? "s" : ""}
        </span>
        <span className="font-semibold text-emerald-500">
          Best: ₹{globalBest}
        </span>
      </div>
    </div>
  );
}

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

  // Price comparison state
  const [expandedPriceItem, setExpandedPriceItem] = useState<number | null>(null);
  const [priceStates, setPriceStates] = useState<
    Map<number, PriceComparisonState>
  >(new Map());
  const priceCache = useRef<Map<string, PlatformResult[]>>(new Map());

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
  /* ── Smart search term extraction ──
   * Converts DB ingredient names to the best search query for grocery platforms.
   * Handles all formats: parenthetical Indian names, adjective variants, etc.
   */
  const getSearchTerm = (dbName: string): string => {
    const parenMatch = dbName.match(/^(.+?)\s*\((.+?)\)\s*$/);
    if (!parenMatch) return dbName.trim();

    const [, main, alt] = parenMatch;

    // Indian/local names — use them for Indian grocery platforms
    const localNameMap: Record<string, string> = {
      "Masoor Dal": "Masoor Dal", "Kabuli Chana": "Kabuli Chana",
      "Rajma": "Rajma", "Toor Dal": "Toor Dal", "Urad Dal": "Urad Dal",
      "Sabudana": "Sabudana", "Bajra": "Bajra", "Jowar": "Jowar",
      "Ragi": "Ragi", "Maize": "Corn",
      "Lauki": "Lauki", "Karela": "Karela", "Turai": "Turai",
      "Brinjal": "Brinjal", "Bhindi": "Bhindi",
      "Moringa": "Drumstick", "Arbi": "Arbi", "Suran": "Suran",
      "Methi": "Methi Leaves", "Sarson": "Sarson",
      "Shalgam": "Shalgam",
      "Bell Pepper": "Capsicum",
      "Sapota": "Chikoo", "Custard Apple": "Sitaphal",
      "Jeera": "Jeera", "Saunf": "Saunf", "Rai": "Mustard Seeds",
      "Methi Dana": "Methi Dana", "Elaichi": "Elaichi",
      "Laung": "Laung", "Dalchini": "Dalchini",
      "Tej Patta": "Tej Patta", "Jaiphal": "Jaiphal",
      "Carom Seeds": "Ajwain", "Til": "Til",
      "Khus Khus": "Khus Khus", "Amchur": "Amchur", "Kesar": "Kesar",
      "Fox Nuts": "Makhana", "Chaas": "Chaas",
      "Clarified Butter": "Ghee",
      "Rice Flakes": "Poha",
    };

    if (localNameMap[alt]) return localNameMap[alt];

    // Adjective + qualifier variants → rearrange
    // "Bread (Brown)" → "Brown Bread", "Peas (Green)" → "Green Peas"
    // "Coffee (Black)" → "Black Coffee", "Fig (Fresh)" → "Fresh Fig"
    // "Mushroom (Button)" → "Button Mushroom"
    const adjectives = [
      "Brown", "White", "Green", "Black", "Lean", "Fresh",
      "Whole Wheat", "Refined", "Wheat", "Button",
    ];
    if (adjectives.some((a) => alt.trim().toLowerCase() === a.toLowerCase())) {
      return `${alt.trim()} ${main.trim()}`;
    }

    // "Milk (Cow)" → "Milk", "Mutton (Lean)" handled above
    // "Olives (Black/Green)" → "Olives"
    // "Dark Chocolate (70%)" → "Dark Chocolate"
    if (alt.includes("%") || alt.includes("/") || alt.toLowerCase() === "cow") {
      return main.trim();
    }

    // Fish variants: "Fish (Rohu)" → "Rohu Fish", "Fish (Pomfret)" → "Pomfret"
    if (main.trim().toLowerCase() === "fish") {
      return alt.trim();
    }

    // Default: use main name
    return main.trim();
  };

  /* ── Price comparison toggle ── */
  const togglePriceComparison = async (ingredientId: number, ingredientName: string) => {
    // If already expanded, collapse
    if (expandedPriceItem === ingredientId) {
      setExpandedPriceItem(null);
      return;
    }

    setExpandedPriceItem(ingredientId);

    // Get the optimal search term
    const searchTerm = getSearchTerm(ingredientName);

    // Build a filter tailored to this specific ingredient
    const filterResults = (raw: PlatformResult[]) => {
      const searchLower = searchTerm.toLowerCase();
      const searchWords = searchLower.split(/\s+/).filter((w) => w.length > 1);

      // Master blocklist of processed food product types
      const ALL_BLOCKED = [
        "milkshake", "milk shake", "shake",
        "juice", "nachos", "wafer", "croissant",
        "cookie", "cookies", "biscuit", "biscuits",
        "cake", "cupcake", "pancake",
        "ice cream", "icecream", "gelato", "sorbet",
        "yogurt", "yoghurt",
        "flavour", "flavored", "flavoured", "flavouring",
        "jam", "marmalade", "jelly", "ketchup", "chutney", "pickle",
        "chips", "candy", "chocolate", "choco",
        "syrup", "cereal", "muesli", "granola",
        "drink", "beverage", "squash", "soda", "cola", "mojito", "lemonade",
        "muffin", "pastry", "pie", "tart", "pudding", "dessert",
        "guacamole", "popsicle", "lollipop", "gummy",
        "smoothie", "mocktail", "cocktail",
        "soap", "shampoo", "lotion", "cleanser", "perfume", "detergent",
        "supplement", "capsule", "tablet", "vitamin",
        "toffee", "fudge", "creme", "praline", "nougat",
        "popcorn", "protein bar", "energy bar", "granola bar",
        "milky bar", "milkybar",
        "lassi", "beer", "wine", "nutrifit",
        "curd", "butter", "cream", "spread",
        "sauce", "mayonnaise", "dip",
        "powder", "extract", "oil",
      ];

      // KEY FIX: Remove blocklist words that are part of the ingredient itself!
      // Check BOTH the search term AND the original DB ingredient name
      // e.g. "Apple Juice" → remove "juice" from blocklist
      // e.g. "Curd (Yogurt)" → remove "curd" AND "yogurt"
      // e.g. "Strawberry" → nothing removed → full blocklist applies
      const origLower = ingredientName.toLowerCase();

      // Some ingredients are inherently associated with blocked words
      // e.g. "Milk" → should allow "cream" (Full Cream Milk)
      // e.g. "Ghee" → should allow "butter" (it IS clarified butter)
      const INGREDIENT_UNBLOCK: Record<string, string[]> = {
        milk: ["cream"],
        ghee: ["butter"],
        paneer: ["cream"],
        "cottage cheese": ["cream"],
        tea: ["extract"],
        coffee: ["extract", "powder"],
        "turmeric powder": ["powder"],
        "red chilli powder": ["powder"],
        "black pepper powder": ["powder"],
        "coriander powder": ["powder"],
        "cocoa powder": ["powder"],
        "baking powder": ["powder"],
        "vanilla extract": ["extract"],
        salt: ["powder"],
      };
      const extraUnblock = INGREDIENT_UNBLOCK[searchLower] || [];

      const blocklist = ALL_BLOCKED.filter(
        (kw) =>
          !searchLower.includes(kw) &&
          !origLower.includes(kw) &&
          !extraUnblock.includes(kw)
      );

      return raw.filter((r) => {
        if (r.error) return true;
        const name = (r.item_name || "").toLowerCase();

        // All significant words of the search term must appear in the product name
        const allMatch = searchWords.every((word) => name.includes(word));
        if (!allMatch) return false;

        // Search term should appear within the first part of the product name
        // (not buried in a description)
        const firstWordPos = Math.min(
          ...searchWords.map((w) => {
            const p = name.indexOf(w);
            return p >= 0 ? p : 999;
          })
        );
        if (firstWordPos > 40) return false;

        // Apply the dynamic blocklist
        if (blocklist.some((kw) => name.includes(kw))) return false;

        return true;
      });
    };

    // If we already have raw results cached, just re-filter
    if (priceCache.current.has(searchTerm)) {
      const filtered = filterResults(priceCache.current.get(searchTerm)!);
      setPriceStates((prev) => {
        const next = new Map(prev);
        next.set(ingredientId, {
          loading: false,
          error: null,
          results: filtered,
        });
        return next;
      });
      return;
    }

    // Set loading state
    setPriceStates((prev) => {
      const next = new Map(prev);
      next.set(ingredientId, { loading: true, error: null, results: [] });
      return next;
    });

    try {
      const rawResults = await fetchPriceComparison(searchTerm);

      // Cache the RAW results (unfiltered)
      priceCache.current.set(searchTerm, rawResults);
      const results = filterResults(rawResults);

      setPriceStates((prev) => {
        const next = new Map(prev);
        next.set(ingredientId, { loading: false, error: null, results });
        return next;
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message.includes("Network Error")
            ? "Grocery Price API is not running. Start the Python server on port 8000."
            : err.message
          : "Failed to fetch prices";
      setPriceStates((prev) => {
        const next = new Map(prev);
        next.set(ingredientId, { loading: false, error: errorMsg, results: [] });
        return next;
      });
    }
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
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 backdrop-blur-md ${toast.type === "success"
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
                  className={`p-5 rounded-2xl border transition-all duration-200 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-stone-200/80 shadow-sm shadow-stone-100"}`}
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
              className={`rounded-2xl border p-4 mb-8 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-stone-200/80 shadow-sm shadow-stone-100"}`}
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
              className={`relative rounded-2xl border mb-8 transition-colors ${isDark ? "bg-white/[0.03] border-white/[0.07] focus-within:border-purple-500/40" : "bg-white border-stone-200/80 shadow-sm focus-within:border-purple-500/50"}`}
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
                    className={`rounded-3xl border overflow-hidden ${isDark ? "bg-[#131210] border-white/[0.07] shadow-lg" : "bg-white border-stone-200/80 shadow-lg shadow-stone-200/50"}`}
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
                              const isPriceExpanded =
                                expandedPriceItem === item.ingredient.id;
                              const priceState = priceStates.get(
                                item.ingredient.id
                              );

                              return (
                                <div key={item.ingredient.id}>
                                  <div className="flex items-center gap-2">
                                    {/* Main item row */}
                                    <motion.button
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
                                      className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${isChecked
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
                                          className={`text-sm font-semibold truncate transition-all duration-200 ${isChecked
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

                                    {/* Compare Prices button */}
                                    <motion.button
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{
                                        delay: itemIdx * 0.03 + 0.1,
                                        duration: 0.2,
                                      }}
                                      whileHover={{ scale: 1.08 }}
                                      whileTap={{ scale: 0.92 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePriceComparison(
                                          item.ingredient.id,
                                          item.ingredient.name
                                        );
                                      }}
                                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${isPriceExpanded
                                          ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                                          : isDark
                                            ? "bg-white/[0.02] border-white/[0.06] text-stone-400 hover:bg-purple-500/10 hover:border-purple-500/25 hover:text-purple-400"
                                            : "bg-stone-50/50 border-black/[0.06] text-stone-500 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600"
                                        }`}
                                      title="Compare prices across platforms"
                                    >
                                      <BarChart3 className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">
                                        {isPriceExpanded ? "Close" : "Compare"}
                                      </span>
                                    </motion.button>
                                  </div>

                                  {/* ── Price Comparison Panel ── */}
                                  <AnimatePresence>
                                    {isPriceExpanded && (
                                      <motion.div
                                        initial={{
                                          height: 0,
                                          opacity: 0,
                                          marginTop: 0,
                                        }}
                                        animate={{
                                          height: "auto",
                                          opacity: 1,
                                          marginTop: 6,
                                        }}
                                        exit={{
                                          height: 0,
                                          opacity: 0,
                                          marginTop: 0,
                                        }}
                                        transition={{
                                          duration: 0.35,
                                          ease: "easeInOut",
                                        }}
                                        className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0d0c0a] border-purple-500/15" : "bg-purple-50/30 border-purple-200/40"}`}
                                      >
                                        {/* Panel header */}
                                        <div
                                          className={`px-4 py-2.5 flex items-center gap-2 ${isDark ? "bg-purple-500/[0.04]" : "bg-purple-100/30"}`}
                                        >
                                          <Tag
                                            className="w-3.5 h-3.5 text-purple-400"
                                          />
                                          <span
                                            className={`text-xs font-semibold ${isDark ? "text-purple-400" : "text-purple-600"}`}
                                          >
                                            Live Price Comparison
                                          </span>
                                          <span
                                            className={`text-[10px] ml-auto ${isDark ? "text-stone-600" : "text-stone-400"}`}
                                          >
                                            Searching "{getSearchTerm(item.ingredient.name)}"
                                          </span>
                                        </div>

                                        <PriceComparisonPanel
                                          state={
                                            priceState || {
                                              loading: true,
                                              error: null,
                                              results: [],
                                            }
                                          }
                                          isDark={isDark}
                                        />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
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
              className={`mt-8 rounded-3xl border p-6 ${isDark ? "bg-[#131210] border-white/[0.07] shadow-lg" : "bg-white border-stone-200/80 shadow-lg shadow-stone-200/50"}`}
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
                className={`mt-6 pt-4 border-t flex items-center justify-between ${isDark ? "border-white/[0.07]" : "border-stone-200"}`}
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

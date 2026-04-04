import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  ChefHat,
  ArrowRight,
  LogIn,
  UserPlus,
  Check,
  Plus,
  Flame,
  Dumbbell,
} from "lucide-react";

/* ─────────────────────────────────────────
   MARQUEE
───────────────────────────────────────── */
const row1 = [
  "🥑 Avocado",
  "✦ Calorie Tracking",
  "🍗 Chicken Breast",
  "✦ Goal Setting",
  "🥬 Spinach",
  "✦ Meal Planning",
  "🍅 Tomatoes",
  "✦ Grocery Lists",
  "🥕 Carrots",
  "✦ Protein Goals",
  "🍳 Eggs",
  "✦ Live Nutrition",
  "🫐 Blueberries",
  "✦ Smart Builder",
  "🥦 Broccoli",
  "✦ Daily Tracker",
];
const row2 = [
  "✦ Meal History",
  "🍚 Brown Rice",
  "✦ Auto Shopping List",
  "🫑 Bell Pepper",
  "✦ Instant Feedback",
  "🥩 Beef Steak",
  "✦ Calorie Goal",
  "🍋 Lemon",
  "✦ Protein Target",
  "🧅 Onion",
  "✦ Visual Cooking",
  "🫒 Olive Oil",
  "✦ Nutrition Charts",
  "🥜 Peanuts",
  "✦ Stack & Build",
  "🧀 Cheese",
];

function MarqueeTrack({
  items,
  reverse = false,
  isDark,
}: {
  items: string[];
  reverse?: boolean;
  isDark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    if (ref.current) setTrackW(ref.current.scrollWidth / 2);
  }, []);

  return (
    <div className="overflow-hidden">
      <motion.div
        key={trackW}
        ref={ref}
        className="flex gap-8 w-max py-3"
        animate={trackW > 0 ? { x: reverse ? [-trackW, 0] : [0, -trackW] } : {}}
        transition={{
          duration: 28,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="text-sm whitespace-nowrap px-1 transition-colors duration-500"
            style={{
              color: item.startsWith("✦")
                ? "#FB923C"
                : isDark
                  ? "#9E9A91"
                  : "#78716C",
            }}
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────
   ANIMATED BOWL HERO VISUAL
───────────────────────────────────────── */
const INGREDIENTS = [
  { e: "🍗", name: "Chicken", cal: 165, color: "#FB923C" },
  { e: "🥑", name: "Avocado", cal: 120, color: "#34D399" },
  { e: "🥬", name: "Spinach", cal: 23, color: "#34D399" },
  { e: "🍚", name: "Rice", cal: 216, color: "#60A5FA" },
  { e: "🍅", name: "Tomato", cal: 27, color: "#F87171" },
];

function BowlVisual({ isDark }: { isDark: boolean }) {
  const [added, setAdded] = useState<number[]>([]);
  const [flying, setFlying] = useState<number | null>(null);
  const totalCal = added.reduce((s, i) => s + INGREDIENTS[i].cal, 0);

  useEffect(() => {
    let idx = 0;
    const go = () => {
      const nextIdx = idx % INGREDIENTS.length;
      setFlying(nextIdx);
      setTimeout(() => {
        setAdded((prev) =>
          prev.includes(nextIdx)
            ? prev.filter((x) => x !== nextIdx)
            : [...prev, nextIdx],
        );
        setFlying(null);
        idx++;
        setTimeout(go, 1400);
      }, 500);
    };
    const t = setTimeout(go, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col gap-3">
      <div
        className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-colors duration-500 ${isDark ? "bg-white/[0.04] border-white/[0.07]" : "bg-black/[0.04] border-black/[0.07]"}`}
      >
        <span
          className={`text-xs tracking-widest ${isDark ? "text-stone-500" : "text-stone-400"}`}
        >
          MEAL BUILDER
        </span>
        <motion.span
          key={totalCal}
          initial={{ scale: 1.3, color: "#FB923C" }}
          animate={{ scale: 1, color: isDark ? "#9E9A91" : "#78716C" }}
          className="text-xs tabular-nums font-medium"
        >
          {totalCal} kcal
        </motion.span>
      </div>

      <div className="flex gap-3 flex-1">
        <div className="flex-1 flex flex-col gap-2">
          {INGREDIENTS.map((ing, i) => (
            <motion.div
              key={i}
              animate={{
                x: flying === i ? 16 : 0,
                opacity: flying === i ? 0.3 : 1,
                scale: flying === i ? 0.93 : 1,
                backgroundColor: added.includes(i)
                  ? `${ing.color}15`
                  : isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.03)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{
                borderColor: added.includes(i)
                  ? `${ing.color}40`
                  : isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
              }}
            >
              <motion.span
                animate={{ rotate: flying === i ? 25 : 0 }}
                className="text-lg"
              >
                {ing.e}
              </motion.span>
              <span
                className={`text-xs flex-1 transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-600"}`}
              >
                {ing.name}
              </span>
              <AnimatePresence>
                {added.includes(i) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm"
                    style={{ background: ing.color }}
                  >
                    <Check className="w-2 h-2 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div className="w-28 flex flex-col items-center justify-center gap-3">
          <motion.div
            animate={{ scale: added.length > 0 ? [1, 1.06, 1] : 1 }}
            transition={{ duration: 0.4 }}
            className="w-24 h-24 rounded-full flex items-center justify-center relative"
            style={{
              background: "rgba(251,146,60,0.08)",
              border: "2px dashed rgba(251,146,60,0.25)",
            }}
          >
            <span className="text-4xl">🍲</span>
            <AnimatePresence>
              {added.map((i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, y: -20, opacity: 0 }}
                  animate={{ scale: 0.6, y: 0, opacity: 1 }}
                  className="absolute text-2xl drop-shadow-md"
                  style={{
                    top: `${20 + ((i * 14) % 40)}%`,
                    left: `${15 + ((i * 17) % 55)}%`,
                  }}
                >
                  {INGREDIENTS[i].e}
                </motion.span>
              ))}
            </AnimatePresence>
          </motion.div>
          <span
            className={`text-xs text-center transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
          >
            Your bowl
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Calories", val: totalCal, color: "#FB923C" },
          {
            label: "Protein",
            val: `${Math.round(totalCal * 0.08)}g`,
            color: "#60A5FA",
          },
          { label: "Items", val: added.length, color: "#34D399" },
        ].map((s) => (
          <div
            key={s.label}
            className={`text-center py-2 rounded-xl border transition-colors duration-500 ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-black/[0.03] border-black/[0.06]"}`}
          >
            <motion.p
              key={String(s.val)}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-sm tabular-nums font-medium"
              style={{ color: s.color }}
            >
              {s.val}
            </motion.p>
            <p
              className={`text-[10px] mt-0.5 transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TRACKER VISUAL
───────────────────────────────────────── */
function TrackerVisual({ isDark }: { isDark: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const meals = [
    {
      e: "🥤",
      name: "Morning Smoothie",
      time: "7:30 AM",
      cal: 180,
      color: "#34D399",
    },
    {
      e: "🥗",
      name: "Protein Bowl",
      time: "12:00 PM",
      cal: 524,
      color: "#FB923C",
    },
    {
      e: "🍗",
      name: "Chicken & Rice",
      time: "3:00 PM",
      cal: 420,
      color: "#60A5FA",
    },
    { e: "🥜", name: "Snack Mix", time: "5:30 PM", cal: 210, color: "#C084FC" },
  ];
  return (
    <div ref={ref} className="relative flex flex-col gap-0">
      <div
        className={`absolute left-5 top-6 bottom-6 w-px transition-colors duration-500 ${isDark ? "bg-white/[0.07]" : "bg-black/[0.07]"}`}
      />
      {meals.map((m, i) => (
        <motion.div
          key={m.name}
          initial={{ opacity: 0, x: -24 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{
            delay: i * 0.18,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="flex items-start gap-4 pb-6 relative"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{
              delay: i * 0.18 + 0.1,
              type: "spring",
              stiffness: 300,
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 text-xl bg-white dark:bg-[#131210]"
            style={{
              background: `${m.color}18`,
              border: `1px solid ${m.color}40`,
            }}
          >
            {m.e}
          </motion.div>
          <div className="flex-1 pt-1">
            <div className="flex items-center justify-between">
              <span
                className={`text-sm transition-colors duration-500 font-medium ${isDark ? "text-stone-200" : "text-stone-800"}`}
              >
                {m.name}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-lg font-medium"
                style={{ background: `${m.color}18`, color: m.color }}
              >
                {m.cal} cal
              </span>
            </div>
            <span
              className={`text-xs transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
            >
              {m.time}
            </span>
            <div
              className={`mt-2 h-1 rounded-full overflow-hidden transition-colors duration-500 ${isDark ? "bg-white/[0.05]" : "bg-black/[0.05]"}`}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={inView ? { width: `${(m.cal / 600) * 100}%` } : {}}
                transition={{
                  delay: i * 0.18 + 0.25,
                  duration: 0.8,
                  ease: "easeOut",
                }}
                style={{ background: m.color }}
              />
            </div>
          </div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.85 }}
        className="flex items-center justify-between px-4 py-3 rounded-2xl border border-orange-400/20 bg-orange-400/5"
      >
        <span
          className={`text-sm transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-600"}`}
        >
          Today's total
        </span>
        <span className="text-sm text-orange-500 font-medium tabular-nums">
          1,334 / 2,000 kcal
        </span>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────
   GOAL RINGS VISUAL
───────────────────────────────────────── */
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
        animate={inView ? { strokeDashoffset: circ * (1 - pct / 100) } : {}}
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
        {pct}%
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────
   GROCERY VISUAL
───────────────────────────────────────── */
function GroceryVisual({ isDark }: { isDark: boolean }) {
  const [checked, setChecked] = useState<string[]>([
    "Chicken breast",
    "Spinach",
  ]);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const sections = [
    {
      label: "PRODUCE",
      color: "#34D399",
      items: ["Spinach", "Cherry tomatoes", "Avocado", "Lemon"],
    },
    {
      label: "PROTEIN",
      color: "#FB923C",
      items: ["Chicken breast", "Greek yoghurt", "Eggs"],
    },
    { label: "GRAINS", color: "#60A5FA", items: ["Brown rice", "Oats"] },
  ];

  const toggle = (item: string) =>
    setChecked((p) =>
      p.includes(item) ? p.filter((x) => x !== item) : [...p, item],
    );

  return (
    <div ref={ref} className="flex flex-col gap-4">
      {sections.map((s, si) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            delay: si * 0.15,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <p
            className="text-xs tracking-widest mb-2 font-medium"
            style={{ color: s.color }}
          >
            {s.label}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {s.items.map((item, ii) => {
              const isChecked = checked.includes(item);
              return (
                <motion.button
                  key={item}
                  onClick={() => toggle(item)}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: si * 0.15 + ii * 0.06 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors duration-500"
                  style={{
                    background: isChecked
                      ? `${s.color}12`
                      : isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.03)",
                    border: `1px solid ${isChecked ? s.color + "40" : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                  }}
                >
                  <motion.div
                    animate={{
                      background: isChecked ? s.color : "transparent",
                    }}
                    className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      border: `1.5px solid ${isChecked ? s.color : s.color + "50"}`,
                    }}
                  >
                    <AnimatePresence>
                      {isChecked && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 500 }}
                        >
                          <Check className="w-2.5 h-2.5 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span
                    className="text-xs truncate transition-colors duration-500"
                    style={{
                      color: isChecked
                        ? isDark
                          ? "#6B6860"
                          : "#A8A29E"
                        : isDark
                          ? "#9E9A91"
                          : "#57534E",
                      textDecoration: isChecked ? "line-through" : "none",
                    }}
                  >
                    {item}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ))}
      <div
        className={`flex items-center justify-between text-xs pt-1 transition-colors duration-500 ${isDark ? "text-[#6B6860]" : "text-stone-400"}`}
      >
        <span>{checked.length} of 9 items</span>
        <span className="text-emerald-500 font-medium">
          {Math.round((checked.length / 9) * 100)}% done
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN HOMEPAGE
───────────────────────────────────────── */
export default function HomePage({ isDark }: { isDark: boolean }) {
  const navigate = useNavigate();
  const goalsRef = useRef(null);
  const goalsInView = useInView(goalsRef, { once: true });
  const { scrollY } = useScroll();
  const heroVisualY = useTransform(scrollY, [0, 500], [0, 60]);

  return (
    <div className="pt-16 relative overflow-hidden">
      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-36 pb-24">
        {/* Hero gradient orb */}
        <motion.div
          className={`absolute rounded-full blur-[120px] w-[600px] h-[600px] -top-40 -right-20 pointer-events-none ${isDark ? "bg-orange-600" : "bg-orange-300"}`}
          animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.3, 0.18] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className={`absolute rounded-full blur-[100px] w-[400px] h-[400px] top-1/3 -left-32 pointer-events-none ${isDark ? "bg-amber-700" : "bg-amber-200"}`}
          animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.25, 0.12] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs tracking-widest text-orange-500 bg-orange-400/[0.08] border border-orange-400/20 mb-8 font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />{" "}
              VISUAL MEAL ARCHITECT
            </motion.div>

            <div className="overflow-hidden mb-6">
              {["Plan meals.", "Track goals.", "Build better habits."].map(
                (line, i) => (
                  <motion.h1
                    key={line}
                    initial={{ y: 70, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.75,
                      delay: 0.18 + i * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="block leading-none tracking-tight transition-colors duration-500"
                    style={{
                      fontSize: "clamp(2.4rem, 4.5vw, 3.8rem)",
                      color:
                        i === 2 ? "#FB923C" : isDark ? "#F5F0E8" : "#1C1917",
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {line}
                  </motion.h1>
                ),
              )}
            </div>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.52 }}
              className={`leading-relaxed max-w-md mb-10 transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-500"}`}
            >
              A click-and-stack meal builder with automatic logging, live
              calorie &amp; protein tracking, and an auto-generated grocery
              list.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.62 }}
              className="flex flex-wrap gap-3"
            >
              <motion.button
                onClick={() => navigate("/register")}
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 0 18px rgba(251,146,60,0.22)",
                }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-orange-500 text-white font-medium text-sm overflow-hidden relative"
              >
                Get started free <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={() => navigate("/login")}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-2 px-7 py-3.5 rounded-2xl border text-sm transition-colors duration-500 ${isDark ? "bg-white/[0.04] border-white/[0.07] text-stone-300 hover:text-stone-100" : "bg-black/[0.04] border-black/[0.07] text-stone-600 hover:text-stone-900"}`}
              >
                <LogIn className="w-4 h-4" /> Log in
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap gap-5 mt-10"
            >
              {[
                {
                  icon: Flame,
                  val: "2,000 kcal",
                  label: "daily goal",
                  color: "#FB923C",
                },
                {
                  icon: Dumbbell,
                  val: "50+ foods",
                  label: "in library",
                  color: "#60A5FA",
                },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  <span
                    className={`text-sm font-medium transition-colors duration-500 ${isDark ? "text-stone-300" : "text-stone-700"}`}
                  >
                    {s.val}
                  </span>
                  <span
                    className={`text-sm transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ y: heroVisualY }}
            className="relative"
          >
            <div
              className={`relative p-5 rounded-3xl border transition-colors duration-500 ${isDark ? "bg-[#131210] border-white/[0.07] shadow-2xl" : "bg-white border-stone-200/80 shadow-xl shadow-stone-200/50"}`}
            >
              <div
                className="absolute -inset-1 rounded-3xl blur-2xl opacity-30"
                style={{
                  background:
                    "radial-gradient(ellipse at 60% 80%, rgba(251,146,60,0.3), transparent 60%)",
                }}
              />
              <BowlVisual isDark={isDark} />
            </div>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`absolute -bottom-5 -left-5 px-4 py-2.5 rounded-2xl border text-xs shadow-xl transition-colors duration-500 ${isDark ? "bg-[#131210] border-white/[0.08] text-stone-400" : "bg-white border-black/[0.08] text-stone-600"}`}
            >
              🔥{" "}
              <span className="text-orange-500 font-medium">Live tracking</span>{" "}
              as you build
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════
          MARQUEE STRIP
      ══════════════════════════════ */}
      <div
        className={`relative z-10 py-4 border-y overflow-hidden transition-colors duration-500 ${isDark ? "bg-[#0f0e0c] border-white/[0.05]" : "bg-[#F5F5F4] border-black/[0.05]"}`}
      >
        <MarqueeTrack items={row1} isDark={isDark} />
        <MarqueeTrack items={row2} reverse isDark={isDark} />
      </div>

      {/* ══════════════════════════════
          SECTION 01 — MEAL TRACKER
      ══════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-32">
        {/* Meal Tracker gradient orb */}
        <motion.div
          className={`absolute rounded-full blur-[120px] w-[500px] h-[500px] top-0 -left-40 pointer-events-none ${isDark ? "bg-emerald-700" : "bg-emerald-200"}`}
          animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.25, 0.12] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={`relative p-6 rounded-3xl border transition-colors duration-500 ${isDark ? "bg-[#131210] border-white/[0.07] shadow-2xl" : "bg-white border-stone-200/80 shadow-xl shadow-stone-200/50"}`}
          >
            <div
              className="absolute -inset-1 rounded-3xl blur-2xl opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 80%, rgba(52,211,153,0.4), transparent 60%)",
              }}
            />
            <TrackerVisual isDark={isDark} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className={`text-[8rem] leading-none font-bold select-none block -mb-4 transition-colors duration-500 ${isDark ? "text-stone-800/40" : "text-stone-200"}`}
            >
              01
            </span>
            <p className="text-xs text-emerald-500 font-medium tracking-widest mb-4">
              MEAL TRACKER
            </p>
            <h2
              className={`mb-5 leading-tight tracking-tight font-semibold transition-colors duration-500 ${isDark ? "text-stone-100" : "text-stone-900"}`}
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}
            >
              Every meal,
              <br />
              logged automatically
            </h2>
            <p
              className={`leading-relaxed mb-8 transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-500"}`}
            >
              Every bowl you build is saved to your personal daily log. See a
              full timeline of what you ate, when you ate it, and the complete
              calorie + macro breakdown — no manual entry ever.
            </p>
            <ul className="space-y-3">
              {[
                "Full daily meal timeline",
                "Per-meal nutrition breakdown",
                "Calorie running total",
                "Historical logs by date",
              ].map((f) => (
                <li
                  key={f}
                  className={`flex items-center gap-3 text-sm transition-colors duration-500 ${isDark ? "text-stone-300" : "text-stone-600"}`}
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-emerald-500" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════
          SECTION 02 — GOAL TRACKING
      ══════════════════════════════ */}
      <section
        ref={goalsRef}
        className="relative z-10 py-32 overflow-hidden transition-colors duration-700"
        style={{
          background: isDark
            ? "linear-gradient(180deg, transparent 0%, #0f0e0c 50%, transparent 100%)"
            : "linear-gradient(180deg, transparent 0%, #F5F5F4 50%, transparent 100%)",
        }}
      >
        {/* Goal Tracking gradient orb */}
        <motion.div
          className={`absolute rounded-full blur-[130px] w-[550px] h-[550px] top-1/4 -right-32 pointer-events-none ${isDark ? "bg-blue-700" : "bg-blue-200"}`}
          animate={{ scale: [1, 1.18, 1], opacity: [0.1, 0.22, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className={`absolute rounded-full blur-[100px] w-[350px] h-[350px] bottom-0 left-[10%] pointer-events-none ${isDark ? "bg-indigo-800" : "bg-indigo-100"}`}
          animate={{ scale: [1, 1.25, 1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        <div className="max-w-7xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="mb-20"
          >
            <span
              className={`text-[8rem] leading-none font-bold select-none block -mb-4 transition-colors duration-500 ${isDark ? "text-stone-800/40" : "text-stone-200"}`}
            >
              02
            </span>
            <p className="text-xs text-blue-500 font-medium tracking-widest mb-3">
              GOAL TRACKING
            </p>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <h2
                className={`leading-tight tracking-tight font-semibold transition-colors duration-500 ${isDark ? "text-stone-100" : "text-stone-900"}`}
                style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}
              >
                Hit your daily
                <br />
                calorie &amp; protein targets
              </h2>
              <p
                className={`max-w-sm leading-relaxed transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-500"}`}
              >
                Set goals once. MealCraft tracks every gram and calorie as you
                build meals — live progress rings always in view.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={goalsInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className={`flex flex-col items-center gap-4 p-8 rounded-3xl border transition-colors duration-500 ${isDark ? "bg-[#131210] border-white/[0.07] shadow-xl" : "bg-white border-stone-200/80 shadow-lg shadow-stone-200/50"}`}
            >
              <RingChart
                pct={70}
                color="#FB923C"
                size={160}
                stroke={12}
                isDark={isDark}
              />
              <div className="text-center">
                <p
                  className={`text-sm font-medium transition-colors duration-500 ${isDark ? "text-stone-200" : "text-stone-800"}`}
                >
                  Calories
                </p>
                <p
                  className={`text-xs mt-0.5 transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                >
                  1,414 / 2,000 kcal
                </p>
                <div
                  className={`mt-3 h-1.5 w-32 rounded-full mx-auto overflow-hidden transition-colors duration-500 ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}
                >
                  <motion.div
                    className="h-full rounded-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={goalsInView ? { width: "70%" } : {}}
                    transition={{ duration: 1.4, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={goalsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex flex-col gap-4"
            >
              {[
                {
                  icon: "🔥",
                  label: "Remaining Calories",
                  val: "586 kcal",
                  color: "#FB923C",
                },
                {
                  icon: "💪",
                  label: "Protein Consumed",
                  val: "88 g",
                  color: "#60A5FA",
                },
                {
                  icon: "🥗",
                  label: "Meals Logged",
                  val: "3 today",
                  color: "#34D399",
                },
                {
                  icon: "⚡",
                  label: "Goal Streak",
                  val: "5 days",
                  color: "#C084FC",
                },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={goalsInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  whileHover={{ x: 4, borderColor: `${s.color}40` }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-500 ${isDark ? "bg-[#131210] border-white/[0.07]" : "bg-white border-stone-200/80 shadow-sm"}`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs truncate transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                    >
                      {s.label}
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: s.color }}
                    >
                      {s.val}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={goalsInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.7, delay: 0.3 }}
              className={`flex flex-col items-center gap-4 p-8 rounded-3xl border transition-colors duration-500 ${isDark ? "bg-[#131210] border-white/[0.07] shadow-xl" : "bg-white border-stone-200/80 shadow-lg shadow-stone-200/50"}`}
            >
              <RingChart
                pct={55}
                color="#60A5FA"
                size={160}
                stroke={12}
                isDark={isDark}
              />
              <div className="text-center">
                <p
                  className={`text-sm font-medium transition-colors duration-500 ${isDark ? "text-stone-200" : "text-stone-800"}`}
                >
                  Protein
                </p>
                <p
                  className={`text-xs mt-0.5 transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
                >
                  88 / 160 g
                </p>
                <div
                  className={`mt-3 h-1.5 w-32 rounded-full mx-auto overflow-hidden transition-colors duration-500 ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}
                >
                  <motion.div
                    className="h-full rounded-full bg-blue-400"
                    initial={{ width: 0 }}
                    animate={goalsInView ? { width: "55%" } : {}}
                    transition={{ duration: 1.4, delay: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          SECTION 03 — GROCERY LIST
      ══════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-32">
        {/* Grocery List gradient orb */}
        <motion.div
          className={`absolute rounded-full blur-[120px] w-[500px] h-[500px] top-[10%] right-[-15%] pointer-events-none ${isDark ? "bg-purple-700" : "bg-purple-200"}`}
          animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.25, 0.12] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div
          className={`absolute rounded-full blur-[100px] w-[350px] h-[350px] bottom-[10%] left-[-10%] pointer-events-none ${isDark ? "bg-fuchsia-800" : "bg-fuchsia-100"}`}
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-28"
          >
            <span
              className={`text-[8rem] leading-none font-bold select-none block -mb-4 transition-colors duration-500 ${isDark ? "text-stone-800/40" : "text-stone-200"}`}
            >
              03
            </span>
            <p className="text-xs text-purple-500 font-medium tracking-widest mb-4">
              GROCERY LIST
            </p>
            <h2
              className={`mb-5 leading-tight tracking-tight font-semibold transition-colors duration-500 ${isDark ? "text-stone-100" : "text-stone-900"}`}
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}
            >
              Your shopping list,
              <br />
              auto-generated
            </h2>
            <p
              className={`leading-relaxed mb-8 transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-500"}`}
            >
              MealCraft reads every ingredient across all your planned meals and
              builds a clean, categorised shopping list — ready to check off at
              the store.
            </p>
            <motion.button
              whileHover={{
                scale: 1.03,
                boxShadow: "0 0 14px rgba(192,132,252,0.18)",
              }}
              whileTap={{ scale: 0.96 }}
              className={`flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-medium border transition-colors duration-500 ${isDark ? "text-purple-300 bg-purple-400/[0.08] border-purple-400/20 hover:bg-purple-400/[0.14]" : "text-purple-700 bg-purple-500/[0.08] border-purple-500/20 hover:bg-purple-500/[0.14]"}`}
            >
              <Plus className="w-4 h-4" /> Generate my list
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className={`relative p-6 rounded-3xl border transition-colors duration-500 ${isDark ? "bg-[#131210] border-white/[0.07] shadow-2xl" : "bg-white border-stone-200/80 shadow-xl shadow-stone-200/50"}`}
          >
            <div
              className="absolute -inset-1 rounded-3xl blur-2xl opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at 80% 20%, rgba(192,132,252,0.4), transparent 60%)",
              }}
            />
            <GroceryVisual isDark={isDark} />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════
          CTA — FULL BLEED EDITORIAL
      ══════════════════════════════ */}
      <section
        className={`relative z-10 overflow-hidden border-t transition-colors duration-500 ${isDark ? "bg-[#0f0e0c] border-white/[0.05]" : "bg-[#F5F5F4] border-black/[0.05]"}`}
      >
        {[
          { e: "🥑", x: "72%", y: "12%", dur: 6, delay: 0 },
          { e: "🍗", x: "85%", y: "55%", dur: 7, delay: 1.2 },
          { e: "🥬", x: "62%", y: "78%", dur: 5.5, delay: 0.5 },
          { e: "🍚", x: "90%", y: "30%", dur: 8, delay: 2 },
          { e: "🍅", x: "78%", y: "88%", dur: 6.5, delay: 0.8 },
          { e: "🫐", x: "55%", y: "20%", dur: 7.5, delay: 1.5 },
        ].map((item, i) => (
          <motion.span
            key={i}
            className="absolute text-5xl select-none pointer-events-none"
            style={{ left: item.x, top: item.y, opacity: 0.7 }}
            animate={{ y: [0, -18, 0], rotate: [0, 8, -5, 0] }}
            transition={{
              duration: item.dur,
              delay: item.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {item.e}
          </motion.span>
        ))}

        <div className="relative z-10 max-w-7xl mx-auto px-8 py-28">
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="text-xs font-medium tracking-widest text-orange-500 mb-6"
            >
              GET STARTED — IT'S FREE
            </motion.p>
            <div className="overflow-hidden mb-6">
              {["Start building", "your best meals."].map((line, i) => (
                <motion.h2
                  key={line}
                  initial={{ y: 60, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="block leading-none tracking-tight transition-colors duration-500"
                  style={{
                    fontSize: "clamp(3rem, 6vw, 5.5rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.04em",
                    color: i === 1 ? "#FB923C" : isDark ? "#F5F0E8" : "#1C1917",
                  }}
                >
                  {line}
                </motion.h2>
              ))}
            </div>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className={`leading-relaxed max-w-lg mb-10 text-lg transition-colors duration-500 ${isDark ? "text-stone-400" : "text-stone-500"}`}
            >
              Sign up in seconds. Build meals, log them, track goals, and shop
              smarter — all from one place.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="flex flex-wrap gap-4 items-center"
            >
              <motion.button
                onClick={() => navigate("/register")}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 0 20px rgba(251,146,60,0.28)",
                }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-orange-500 text-white font-medium text-sm"
              >
                <UserPlus className="w-4 h-4" /> Create your free account{" "}
                <ArrowRight className="w-4 h-4 ml-1" />
              </motion.button>
              <motion.button
                onClick={() => navigate("/login")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-sm border transition-colors duration-500 font-medium ${isDark ? "text-stone-400 border-white/[0.07] hover:text-stone-200" : "text-stone-600 border-black/[0.07] hover:text-stone-900 bg-black/[0.02]"}`}
              >
                <LogIn className="w-4 h-4" /> Already have an account
              </motion.button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-3 mt-10"
            >
              <div className="flex -space-x-2">
                {["🧑‍🍳", "👩‍🍳", "🧑‍🍳"].map((e, i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm transition-colors duration-500 ${isDark ? "bg-stone-800 border-stone-700" : "bg-white border-stone-200"}`}
                  >
                    {e}
                  </div>
                ))}
              </div>
              <span
                className={`text-sm transition-colors duration-500 ${isDark ? "text-stone-500" : "text-stone-400"}`}
              >
                Join people already building better meals
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FOOTER
      ══════════════════════════════ */}
      <footer
        className={`relative z-10 border-t max-w-7xl mx-auto px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-500 ${isDark ? "border-white/[0.05]" : "border-black/[0.05]"}`}
      >
        <div className="flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-orange-500" />
          <span
            className={`font-semibold tracking-tight transition-colors duration-500 ${isDark ? "text-stone-200" : "text-stone-800"}`}
          >
            MealCraft
          </span>
          <span
            className={`text-sm transition-colors duration-500 ${isDark ? "text-stone-600" : "text-stone-400"}`}
          >
            — Visual Meal Architect
          </span>
        </div>
        <div
          className={`flex items-center gap-6 text-sm transition-colors duration-500 ${isDark ? "text-stone-600" : "text-stone-500"}`}
        >
          {["Privacy", "Terms", "Contact"].map((link) => (
            <motion.a
              key={link}
              href="#"
              whileHover={{ color: isDark ? "#F5F0E8" : "#1C1917" }}
              className="relative transition-colors"
            >
              {link}
              <motion.span
                className="absolute -bottom-0.5 left-0 right-0 h-px bg-orange-400 origin-left"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.2 }}
              />
            </motion.a>
          ))}
        </div>
      </footer>
    </div>
  );
}

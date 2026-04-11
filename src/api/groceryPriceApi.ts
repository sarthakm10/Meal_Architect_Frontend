import axios from "axios";

/* ─── Grocery Price API Client ─────────────────────────────────────────── */
const groceryApi = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 30000, // 30s — scraping can be slow
});

/* ─── Types ────────────────────────────────────────────────────────────── */
export interface PlatformResult {
  platform: "bigbasket" | "amazon_fresh" | "blinkit" | "zepto";
  item_name: string;
  brand: string | null;
  quantity: string | null;
  price: number;
  mrp: number;
  image_url: string | null;
  in_stock: boolean;
  url?: string | null;
  rating?: string | null;
  category?: string | null;
  error?: string;
}

export type PlatformName = PlatformResult["platform"];

/* ─── Platform metadata ─────────────────────────────────────────────────── */
export const PLATFORM_META: Record<
  PlatformName,
  { label: string; color: string; bgColor: string; logo: string }
> = {
  bigbasket: {
    label: "BigBasket",
    color: "#84c225",
    bgColor: "#84c22515",
    logo: "🟢",
  },
  amazon_fresh: {
    label: "Amazon Fresh",
    color: "#ff9900",
    bgColor: "#ff990015",
    logo: "🟠",
  },
  blinkit: {
    label: "Blinkit",
    color: "#f5c700",
    bgColor: "#f5c70015",
    logo: "🟡",
  },
  zepto: {
    label: "Zepto",
    color: "#8b5cf6",
    bgColor: "#8b5cf615",
    logo: "🟣",
  },
};

/* ─── API call ──────────────────────────────────────────────────────────── */
export async function fetchPriceComparison(
  query: string
): Promise<PlatformResult[]> {
  const res = await groceryApi.get<PlatformResult[]>("/all", {
    params: { q: query },
  });
  return res.data;
}

export default groceryApi;

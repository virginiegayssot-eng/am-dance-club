"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/stripe";
import type { MerchProduct } from "@/lib/supabase";

export default function MerchPage() {
  const router = useRouter();
  const supabase = createClient();
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);

    const { data } = await supabase
      .from("merch_products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    setProducts(data ?? []);
    setLoading(false);
  }

  async function buyProduct(product: MerchProduct) {
    if (!isLoggedIn) { router.push("/auth/login"); return; }

    setBuyError("");
    const size = selectedSizes[product.id];
    if (product.sizes && product.sizes.length > 0 && !size) {
      setBuyError("Please select a size first.");
      return;
    }

    setBuying(product.id);
    const res = await fetch("/api/stripe/merch-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, size: size || undefined }),
    });
    const { url, error } = await res.json();
    if (error) { setBuyError(error); setBuying(null); return; }
    window.location.href = url;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-2">Shop</p>
          <h1 className="section-title mb-3">Merch</h1>
          <p className="font-body text-gray-500">
            Rep BYLA Dance. Every purchase goes straight to supporting the studio.
          </p>
        </div>

        {buyError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 font-body text-sm text-red-700">
            {buyError}
          </div>
        )}

        {loading ? (
          <p className="font-body text-gray-400">Loading…</p>
        ) : products.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-body text-gray-400">Nothing in stock right now — check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="card overflow-hidden flex flex-col">
                {product.image_url && (
                  <div className="aspect-square bg-[#ffffff]">
                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-heading text-lg mb-1">{product.title}</h3>
                  <p className="font-heading text-2xl text-[#000000] mb-2">{formatPrice(product.price_cents)}</p>
                  {product.description && (
                    <p className="font-body text-sm text-gray-500 mb-4 leading-relaxed">{product.description}</p>
                  )}

                  {product.sizes && product.sizes.length > 0 && (
                    <select
                      className="input mb-4"
                      value={selectedSizes[product.id] ?? ""}
                      onChange={e => setSelectedSizes(s => ({ ...s, [product.id]: e.target.value }))}
                    >
                      <option value="" disabled>Select a size…</option>
                      {product.sizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => buyProduct(product)}
                    disabled={buying === product.id}
                    className="btn-primary mt-auto w-full justify-center"
                  >
                    {buying === product.id ? "Loading…" : "Buy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoggedIn && products.length > 0 && (
          <p className="text-center font-body text-sm text-gray-500 mt-10">
            Log in or create an account to purchase.
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}

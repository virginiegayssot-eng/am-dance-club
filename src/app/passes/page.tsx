"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import type { Pass } from "@/lib/supabase";
import Link from "next/link";
import { Check } from "lucide-react";

type PassOption = {
  id: string;
  name: string;
  price: string;
  classes: string;
  validity: string;
  description: string;
  highlight?: boolean;
  newOnly?: boolean;
};

const PASS_OPTIONS: PassOption[] = [
  {
    id: "casual",
    name: "Casual Class",
    price: "$24",
    classes: "1 class",
    validity: "One-time",
    description: "Drop in whenever you like. Pay per class.",
  },
  {
    id: "double",
    name: "Double Pass",
    price: "$38",
    classes: "2 spots",
    validity: "One class",
    description: "Bring a friend to the same class. Two spots for the price of one deal.",
  },
  {
    id: "intro",
    name: "Intro Pass",
    price: "$39",
    classes: "3 classes",
    validity: "3 months",
    description: "Perfect for new dancers. Try 3 classes at a special rate.",
    newOnly: true,
  },
  {
    id: "five",
    name: "5-Class Pass",
    price: "$100",
    classes: "5 classes",
    validity: "6 months",
    description: "$20 per class. Use across any Friday sessions.",
    highlight: true,
  },
  {
    id: "ten",
    name: "10-Class Pass",
    price: "$200",
    classes: "10 classes",
    validity: "1 year",
    description: "$20 per class. Best value.",
  },
];

export default function PassesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNewStudent, setIsNewStudent] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountInfo, setDiscountInfo] = useState<{ type: string; value: number } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setIsLoggedIn(true);

    const { data: myPasses } = await supabase
      .from("passes")
      .select("*, pass_types(*)")
      .eq("student_id", user.id)
      .gt("classes_remaining", 0)
      .order("created_at", { ascending: false });

    const { data: regs } = await supabase
      .from("registrations")
      .select("id")
      .eq("student_id", user.id)
      .eq("status", "confirmed")
      .limit(1);

    setPasses(myPasses ?? []);
    setIsNewStudent(!regs || regs.length === 0);
    setLoading(false);
  }

  async function applyDiscount() {
    if (!discountInput.trim()) return;
    setValidatingCode(true);
    setDiscountError("");
    setDiscountInfo(null);

    const res = await fetch("/api/discount/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: discountInput }),
    });
    const data = await res.json();

    if (!res.ok) {
      setDiscountError(data.error ?? "Invalid code");
      setDiscountCode("");
    } else {
      setDiscountCode(discountInput.toUpperCase().trim());
      setDiscountInfo({ type: data.discount_type, value: data.discount_value });
    }
    setValidatingCode(false);
  }

  async function buyPass(passId: string) {
    if (!isLoggedIn) { router.push("/auth/login"); return; }

    setBuying(passId);
    const res = await fetch("/api/stripe/pass-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passTypeId: passId, discountCode: discountCode || undefined }),
    });
    const { url, error } = await res.json();
    if (error) { alert(error); setBuying(null); return; }
    window.location.href = url;
  }

  const validPasses = passes.filter(p =>
    p.classes_remaining > 0 && (!p.expires_at || new Date(p.expires_at) > new Date())
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">

        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Pricing</p>
          <h1 className="section-title mb-3">Class Passes</h1>
          <p className="font-body text-gray-500">
            Buy a pass and use it to book any upcoming Friday class.
          </p>
        </div>

        {/* Active passes banner */}
        {validPasses.length > 0 && (
          <div className="bg-[#a3bdfe]/20 border border-[#a3bdfe] rounded-2xl p-5 mb-10">
            <h3 className="font-heading text-sm mb-3">Your Active Passes</h3>
            <div className="flex flex-wrap gap-3">
              {validPasses.map((p) => (
                <div key={p.id} className="bg-white rounded-xl px-4 py-3 border border-[#a3bdfe]/50">
                  <p className="font-heading text-sm">{p.pass_types?.name}</p>
                  <p className="font-body text-xs text-gray-500 mt-0.5">
                    {p.classes_remaining} class{p.classes_remaining !== 1 ? "es" : ""} remaining
                    {p.expires_at && (
                      <> · Expires {new Date(p.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</>
                    )}
                  </p>
                </div>
              ))}
            </div>
            <p className="font-body text-xs text-gray-500 mt-3">
              Head to the <Link href="/classes" className="text-[#2041d8] underline">Classes page</Link> to use your pass to book a class.
            </p>
          </div>
        )}

        {/* Discount code */}
        {isLoggedIn && (
          <div className="mb-8">
            <p className="font-body text-sm text-gray-500 mb-2">Have a discount code?</p>
            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                className="input uppercase flex-1"
                placeholder="Enter code"
                value={discountInput}
                onChange={e => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(""); setDiscountInfo(null); setDiscountCode(""); }}
                onKeyDown={e => e.key === "Enter" && applyDiscount()}
              />
              <button
                onClick={applyDiscount}
                disabled={validatingCode || !discountInput.trim()}
                className="btn-secondary py-2 px-4 text-sm shrink-0"
              >
                {validatingCode ? "…" : "Apply"}
              </button>
            </div>
            {discountError && <p className="font-body text-sm text-red-500 mt-2">{discountError}</p>}
            {discountInfo && (
              <p className="font-body text-sm text-green-600 mt-2">
                Code applied: {discountInfo.type === "percentage" ? `${discountInfo.value}% off` : `$${(discountInfo.value / 100).toFixed(0)} off`} every pass!
              </p>
            )}
          </div>
        )}

        {/* Pass options grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {PASS_OPTIONS.map((opt) => {
            const isDisabled = opt.newOnly && !isNewStudent;

            return (
              <div
                key={opt.id}
                className={`card overflow-visible flex flex-col relative ${opt.highlight ? "ring-2 ring-[#2041d8]" : ""} ${isDisabled ? "opacity-50" : ""}`}
              >
                {opt.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#2041d8] text-white text-xs font-heading px-3 py-1 rounded-full uppercase tracking-wide">
                      Popular
                    </span>
                  </div>
                )}
                {opt.newOnly && (
                  <div className="absolute -top-3 left-4">
                    <span className="bg-[#2041d8] text-white text-xs font-heading px-3 py-1 rounded-full uppercase tracking-wide">
                      New members
                    </span>
                  </div>
                )}

                <div className={`p-6 rounded-t-2xl ${opt.highlight ? "bg-gradient-to-br from-[#2041d8] to-[#a3bdfe] text-white" : "bg-gradient-to-br from-[#e4c3cc]/30 to-[#a3bdfe]/20"}`}>
                  <h3 className={`font-heading text-lg mb-1 ${opt.highlight ? "text-white" : ""}`}>{opt.name}</h3>
                  <p className={`font-heading text-4xl ${opt.highlight ? "text-white" : "text-[#2041d8]"}`}>{opt.price}</p>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 font-body text-sm">
                      <Check className="w-4 h-4 text-[#2041d8] shrink-0" strokeWidth={2} />
                      <span>{opt.classes}</span>
                    </div>
                    <div className="flex items-center gap-2 font-body text-sm">
                      <Check className="w-4 h-4 text-[#2041d8] shrink-0" strokeWidth={2} />
                      <span>Valid: {opt.validity}</span>
                    </div>
                    <p className="font-body text-xs text-gray-500 mt-2 leading-relaxed">{opt.description}</p>
                  </div>

                  <button
                    onClick={() => buyPass(opt.id)}
                    disabled={!!buying || isDisabled}
                    className={`mt-auto w-full justify-center ${opt.highlight ? "btn-primary" : "btn-secondary"} ${isDisabled ? "cursor-not-allowed" : ""}`}
                  >
                    {isDisabled
                      ? "New members only"
                      : buying === opt.id
                      ? "Loading…"
                      : `Buy ${opt.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!isLoggedIn && (
          <p className="text-center font-body text-sm text-gray-500 mt-10">
            <Link href="/auth/login" className="text-[#2041d8] underline">Log in</Link> or{" "}
            <Link href="/auth/signup" className="text-[#2041d8] underline">create an account</Link> to purchase a pass.
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Review } from "@/lib/supabase";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18A13.98 13.98 0 0 1 10.94 24c0-1.45.25-2.86.7-4.18v-5.7H4.34A21.98 21.98 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

export default function ReviewsCarousel() {
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("reviews").select("*").eq("status", "approved").order("created_at", { ascending: true });
      setReviews(data ?? []);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (reviews.length < 2) return;
    const t = setInterval(() => setIndex(i => (i + 1) % reviews.length), 6000);
    return () => clearInterval(t);
  }, [reviews.length]);

  if (!loaded || reviews.length === 0) return null;

  const review = reviews[index];

  return (
    <section className="bg-[#000000] text-white py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-[#e2d0fb] mb-2 text-center">What people say</p>
        <h2 className="font-heading text-3xl md:text-4xl mb-10 text-center">Loved by our dancers</h2>

        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-2xl p-8 text-center text-black">
            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={`w-5 h-5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} strokeWidth={1.75} />
              ))}
            </div>
            <p className="font-body text-base text-black/80 leading-relaxed mb-6">&ldquo;{review.review_text}&rdquo;</p>
            <p className="font-heading text-sm">{review.author_name}</p>
            <p className="font-body text-xs text-gray-400 mt-1 flex items-center justify-center gap-1.5">
              <GoogleIcon /> Google Review
            </p>
          </div>

          {reviews.length > 1 && (
            <div className="flex items-center justify-center gap-6 mt-6">
              <button onClick={() => setIndex(i => (i - 1 + reviews.length) % reviews.length)} aria-label="Previous review" className="text-white/60 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                {reviews.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to review ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-[#e2d0fb]" : "bg-white/20"}`}
                  />
                ))}
              </div>
              <button onClick={() => setIndex(i => (i + 1) % reviews.length)} aria-label="Next review" className="text-white/60 hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Review } from "@/lib/supabase";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

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

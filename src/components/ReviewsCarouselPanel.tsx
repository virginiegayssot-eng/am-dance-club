"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Review } from "@/lib/supabase";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

// Manages the homepage review/testimonial carousel (approve, add, delete).
// Distinct from ReviewRequestPanel, which sends "please leave a review"
// request emails to members — this panel manages what's already been
// submitted and shown live on the homepage.
// Self-contained like ReviewRequestPanel/MerchPanel/DiscountsPanel: fetches
// its own reviews and owns all of its state.
export default function ReviewsCarouselPanel() {
  const supabase = createClient();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ author_name: "", rating: "5", review_text: "" });
  const [reviewFormLoading, setReviewFormLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);

  useEffect(() => { loadReviews(); }, []);

  async function loadReviews() {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: true });
    setReviews((data as Review[]) ?? []);
    setLoading(false);
  }

  async function createReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewFormLoading(true);
    const { error } = await supabase.from("reviews").insert({
      author_name: reviewForm.author_name.trim(),
      rating: parseInt(reviewForm.rating),
      review_text: reviewForm.review_text.trim(),
      status: "approved",
    });
    if (error) { alert(error.message); setReviewFormLoading(false); return; }
    setShowReviewForm(false);
    setReviewForm({ author_name: "", rating: "5", review_text: "" });
    loadReviews();
    setReviewFormLoading(false);
  }

  function deleteReview(id: string) {
    setConfirmDialog({
      message: "Delete this review? It will no longer show in the homepage carousel.",
      action: async () => {
        await supabase.from("reviews").delete().eq("id", id);
        setReviews(prev => prev.filter(r => r.id !== id));
      },
    });
  }

  async function approveReview(id: string) {
    await supabase.from("reviews").update({ status: "approved" }).eq("id", id);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
  }

  if (loading) return <p className="font-body text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="font-body text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? "s" : ""} · approved ones shown in a carousel on the homepage</p>
        <button onClick={() => setShowReviewForm(true)} className="btn-primary py-2 px-4 text-sm">
          + New Review
        </button>
      </div>

      {reviews.filter(r => r.status === "pending").length > 0 && (
        <div className="mb-6">
          <p className="font-body text-xs uppercase tracking-widest text-amber-600 mb-2">Awaiting approval</p>
          <div className="card divide-y divide-gray-50 overflow-hidden border-amber-200">
            {reviews.filter(r => r.status === "pending").map(r => (
              <div key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-amber-50/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-heading">{r.author_name}</span>
                    <span className="text-amber-400 text-xs tracking-tight">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  </div>
                  <p className="text-sm text-gray-600 font-body">{r.review_text}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => approveReview(r.id)} className="font-body text-xs text-green-600 hover:underline">
                    Approve
                  </button>
                  <button onClick={() => deleteReview(r.id)} className="font-body text-xs text-red-400 hover:text-red-600">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.filter(r => r.status === "approved").length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-body text-gray-400 mb-4">No approved reviews yet — add one, or approve a member's submission above.</p>
          <button onClick={() => setShowReviewForm(true)} className="btn-primary">Add Review</button>
        </div>
      ) : (
        <div>
          {reviews.some(r => r.status === "pending") && (
            <p className="font-body text-xs uppercase tracking-widest text-gray-400 mb-2">Live on homepage</p>
          )}
          <div className="card divide-y divide-gray-50 overflow-hidden">
            {reviews.filter(r => r.status === "approved").map(r => (
              <div key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-heading">{r.author_name}</span>
                    <span className="text-amber-400 text-xs tracking-tight">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  </div>
                  <p className="text-sm text-gray-600 font-body">{r.review_text}</p>
                </div>
                <button onClick={() => deleteReview(r.id)} className="font-body text-xs text-red-400 hover:text-red-600 shrink-0">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showReviewForm && (
        <Modal title="New Review" onClose={() => setShowReviewForm(false)}>
          <form onSubmit={createReview} className="space-y-4">
            <div>
              <label className="label">Reviewer name</label>
              <input
                className="input"
                placeholder="e.g. Sofia R."
                value={reviewForm.author_name}
                onChange={e => setReviewForm(f => ({ ...f, author_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Rating</label>
              <select
                className="input"
                value={reviewForm.rating}
                onChange={e => setReviewForm(f => ({ ...f, rating: e.target.value }))}
              >
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★☆ (4)</option>
                <option value="3">★★★☆☆ (3)</option>
                <option value="2">★★☆☆☆ (2)</option>
                <option value="1">★☆☆☆☆ (1)</option>
              </select>
            </div>
            <div>
              <label className="label">Review text</label>
              <textarea
                className="input min-h-[100px]"
                placeholder="Paste or type the review here…"
                value={reviewForm.review_text}
                onChange={e => setReviewForm(f => ({ ...f, review_text: e.target.value }))}
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowReviewForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center" disabled={reviewFormLoading}>
                {reviewFormLoading ? "Adding…" : "Add Review"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={() => { const action = confirmDialog.action; setConfirmDialog(null); action(); }}
        />
      )}
    </div>
  );
}

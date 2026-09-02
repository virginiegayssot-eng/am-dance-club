"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

const PASS_TYPE_LABELS = { casual: "Casual Class only", five: "5-Class Pack only", ten: "10-Class Pack only" };

// Self-contained, matching the pattern used by ReviewRequestPanel: fetches
// its own discount codes and owns all of its state so it can live on the
// Marketing page without threading state through instructor/page.tsx.
export default function DiscountsPanel() {
  const supabase = createClient();

  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountForm, setDiscountForm] = useState({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "", applicable_pass_type: "" });
  const [discountFormLoading, setDiscountFormLoading] = useState(false);
  const [discountFormError, setDiscountFormError] = useState("");
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [editDiscountExpiresAt, setEditDiscountExpiresAt] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);

  useEffect(() => { loadDiscountCodes(); }, []);

  async function loadDiscountCodes() {
    const { data } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
    setDiscountCodes(data ?? []);
    setLoading(false);
  }

  async function createDiscountCode(e: React.FormEvent) {
    e.preventDefault();
    setDiscountFormLoading(true);
    const { error } = await supabase.from("discount_codes").insert({
      code: discountForm.code.toUpperCase().trim(),
      discount_type: discountForm.discount_type,
      discount_value: discountForm.discount_type === "percentage"
        ? parseInt(discountForm.discount_value)
        : Math.round(parseFloat(discountForm.discount_value) * 100),
      max_uses: discountForm.max_uses ? parseInt(discountForm.max_uses) : null,
      expires_at: discountForm.expires_at || null,
      applicable_pass_type: discountForm.applicable_pass_type || null,
      active: true,
    });
    if (error) { setDiscountFormError(error.message); setDiscountFormLoading(false); return; }
    setShowDiscountForm(false);
    setDiscountForm({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "", applicable_pass_type: "" });
    loadDiscountCodes();
    setDiscountFormLoading(false);
  }

  async function saveDiscountExpiry(id: string) {
    const expires_at = editDiscountExpiresAt ? new Date(editDiscountExpiresAt).toISOString() : null;
    await supabase.from("discount_codes").update({ expires_at }).eq("id", id);
    setDiscountCodes(prev => prev.map(d => d.id === id ? { ...d, expires_at } : d));
    setEditingDiscountId(null);
  }

  async function toggleDiscountActive(id: string, active: boolean) {
    await supabase.from("discount_codes").update({ active: !active }).eq("id", id);
    setDiscountCodes(prev => prev.map(d => d.id === id ? { ...d, active: !active } : d));
  }

  function deleteDiscountCode(id: string) {
    setConfirmDialog({
      message: "Delete this discount code?",
      action: async () => {
        await supabase.from("discount_codes").delete().eq("id", id);
        setDiscountCodes(prev => prev.filter(d => d.id !== id));
      },
    });
  }

  if (loading) return <p className="font-body text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="font-body text-sm text-gray-500">{discountCodes.length} code{discountCodes.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setShowDiscountForm(true)} className="btn-primary py-2 px-4 text-sm">
          + New Code
        </button>
      </div>
      {discountCodes.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-body text-gray-400 mb-4">No discount codes yet.</p>
          <button onClick={() => setShowDiscountForm(true)} className="btn-primary">Create Code</button>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50 overflow-hidden">
          {discountCodes.map(d => (
            <div key={d.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading tracking-wider">{d.code}</span>
                  <span className={d.active ? "badge-confirmed" : "badge bg-gray-100 text-gray-500"}>
                    {d.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-body mt-1">
                  {d.discount_type === "percentage" ? `${d.discount_value}% off` : `$${(d.discount_value / 100).toFixed(0)} off`}
                  {" · "}{d.uses_count} use{d.uses_count !== 1 ? "s" : ""}{d.max_uses ? `/${d.max_uses}` : ""}
                  {" · "}{PASS_TYPE_LABELS[d.applicable_pass_type as keyof typeof PASS_TYPE_LABELS] ?? "All passes"}
                  {" · "}
                  {editingDiscountId === d.id ? (
                    <input
                      type="date"
                      className="input py-1 px-2 text-xs w-36 inline-block align-middle"
                      value={editDiscountExpiresAt}
                      onChange={e => setEditDiscountExpiresAt(e.target.value)}
                    />
                  ) : (
                    d.expires_at ? `Expires ${new Date(d.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : "Never expires"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {editingDiscountId === d.id ? (
                  <>
                    <button onClick={() => saveDiscountExpiry(d.id)} className="font-body text-xs text-green-600 hover:underline">Save</button>
                    <button onClick={() => setEditingDiscountId(null)} className="font-body text-xs text-gray-400 hover:underline">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => { setEditingDiscountId(d.id); setEditDiscountExpiresAt(d.expires_at ? d.expires_at.split("T")[0] : ""); }} className="font-body text-xs text-gray-500 hover:underline">Edit</button>
                )}
                <button onClick={() => toggleDiscountActive(d.id, d.active)} className="font-body text-xs text-[#000000] hover:underline">
                  {d.active ? "Disable" : "Enable"}
                </button>
                <button onClick={() => deleteDiscountCode(d.id)} className="font-body text-xs text-red-400 hover:text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDiscountForm && (
        <Modal title="New Discount Code" onClose={() => setShowDiscountForm(false)}>
          <form onSubmit={createDiscountCode} className="space-y-4">
            <div>
              <label className="label">Code</label>
              <input
                className="input uppercase"
                placeholder="e.g. WELCOME20"
                value={discountForm.code}
                onChange={e => setDiscountForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div>
              <label className="label">Discount Type</label>
              <select
                className="input"
                value={discountForm.discount_type}
                onChange={e => setDiscountForm(f => ({ ...f, discount_type: e.target.value }))}
              >
                <option value="percentage">Percentage (e.g. 20% off)</option>
                <option value="fixed">Fixed amount (e.g. $10 off)</option>
              </select>
            </div>
            <div>
              <label className="label">
                {discountForm.discount_type === "percentage" ? "Percentage off (0–100)" : "Amount off (AUD)"}
              </label>
              <input
                className="input"
                type="number"
                min="1"
                max={discountForm.discount_type === "percentage" ? "100" : undefined}
                step={discountForm.discount_type === "percentage" ? "1" : "0.01"}
                placeholder={discountForm.discount_type === "percentage" ? "20" : "10.00"}
                value={discountForm.discount_value}
                onChange={e => setDiscountForm(f => ({ ...f, discount_value: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Max uses (optional)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={discountForm.max_uses}
                  onChange={e => setDiscountForm(f => ({ ...f, max_uses: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Expires (optional)</label>
                <input
                  className="input"
                  type="date"
                  value={discountForm.expires_at}
                  onChange={e => setDiscountForm(f => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Applies to</label>
              <select
                className="input"
                value={discountForm.applicable_pass_type}
                onChange={e => setDiscountForm(f => ({ ...f, applicable_pass_type: e.target.value }))}
              >
                <option value="">All passes</option>
                <option value="casual">Casual Class (drop-in) only</option>
                <option value="five">5-Class Pack only</option>
                <option value="ten">10-Class Pack only</option>
              </select>
            </div>
            {discountFormError && <p className="font-body text-sm text-red-500">{discountFormError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowDiscountForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center" disabled={discountFormLoading}>
                {discountFormLoading ? "Creating…" : "Create Code"}
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

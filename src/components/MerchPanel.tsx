"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/stripe";
import type { MerchProduct } from "@/lib/supabase";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

// Self-contained, matching the pattern used by ReviewRequestPanel: fetches
// its own products and owns all of its state so it can live on the
// Marketing page without threading state through instructor/page.tsx.
// BYLA still uses a plain image URL field here (not the photo-library
// upload main/demo have) — that's a separate, not-yet-ported feature,
// see "Merch image upload" in CLAUDE.md.
export default function MerchPanel() {
  const supabase = createClient();

  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({ title: "", description: "", price_cents: "", image_url: "", sizes: "" });
  const [productFormLoading, setProductFormLoading] = useState(false);
  const [productFormError, setProductFormError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    const { data } = await supabase.from("merch_products").select("*").order("created_at", { ascending: false });
    setProducts((data as MerchProduct[]) ?? []);
    setLoading(false);
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setProductFormLoading(true);

    const sizes = productForm.sizes.trim()
      ? productForm.sizes.split(",").map(s => s.trim()).filter(Boolean)
      : null;

    const { error } = await supabase.from("merch_products").insert({
      title: productForm.title,
      description: productForm.description || null,
      price_cents: Math.round(parseFloat(productForm.price_cents) * 100),
      image_url: productForm.image_url || null,
      sizes,
    });
    if (error) { setProductFormError(error.message); setProductFormLoading(false); return; }

    setShowProductForm(false);
    setProductForm({ title: "", description: "", price_cents: "", image_url: "", sizes: "" });
    loadProducts();
    setProductFormLoading(false);
  }

  async function toggleProductActive(product: MerchProduct) {
    await supabase.from("merch_products").update({ active: !product.active }).eq("id", product.id);
    loadProducts();
  }

  function deleteProduct(id: string) {
    setConfirmDialog({
      message: "Delete this product? This cannot be undone.",
      action: async () => {
        await supabase.from("merch_products").delete().eq("id", id);
        loadProducts();
      },
    });
  }

  if (loading) return <p className="font-body text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="font-body text-sm text-gray-500">{products.length} product{products.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setShowProductForm(true)} className="btn-primary py-2 px-4 text-sm">+ Add Product</button>
      </div>
      {products.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-body text-gray-400 mb-4">No products yet. Add your first one!</p>
          <button onClick={() => setShowProductForm(true)} className="btn-primary">Add Product</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div key={p.id} className={`card overflow-hidden flex flex-col ${!p.active ? "opacity-50" : ""}`}>
              {p.image_url && (
                <div className="aspect-square bg-[#ffffff]">
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={p.active ? "badge-confirmed" : "badge bg-gray-100 text-gray-500"}>
                    {p.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <h3 className="font-heading text-base">{p.title}</h3>
                <p className="font-heading text-lg text-[#000000] mt-1">{formatPrice(p.price_cents)}</p>
                {p.sizes && p.sizes.length > 0 && (
                  <p className="font-body text-xs text-gray-400 mt-1">Sizes: {p.sizes.join(", ")}</p>
                )}
                <div className="flex gap-3 mt-auto pt-4">
                  <button onClick={() => toggleProductActive(p)} className="font-body text-xs text-[#000000] hover:underline">
                    {p.active ? "Hide" : "Unhide"}
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="font-body text-xs text-red-400 hover:text-red-600 underline">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showProductForm && (
        <Modal title="Add Product" onClose={() => setShowProductForm(false)}>
          <form onSubmit={addProduct} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                placeholder="e.g. Club Hoodie"
                value={productForm.title}
                onChange={e => setProductForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Fabric, fit, anything members should know"
                value={productForm.description}
                onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Price (AUD)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={productForm.price_cents}
                onChange={e => setProductForm(f => ({ ...f, price_cents: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Image URL (optional)</label>
              <input
                className="input"
                placeholder="https://..."
                value={productForm.image_url}
                onChange={e => setProductForm(f => ({ ...f, image_url: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Sizes (optional, comma-separated)</label>
              <input
                className="input"
                placeholder="e.g. S, M, L, XL"
                value={productForm.sizes}
                onChange={e => setProductForm(f => ({ ...f, sizes: e.target.value }))}
              />
            </div>
            {productFormError && <p className="font-body text-sm text-red-500">{productFormError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowProductForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center" disabled={productFormLoading}>
                {productFormLoading ? "Adding…" : "Add Product"}
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

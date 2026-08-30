"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/stripe";
import type { MerchProduct } from "@/lib/supabase";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Image as ImageIcon, X } from "lucide-react";

// Self-contained, matching the pattern used by ReviewRequestPanel: fetches
// its own products and owns all of its state so it can live on the
// Marketing page without threading state through instructor/page.tsx.
export default function MerchPanel() {
  const supabase = createClient();

  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({ title: "", description: "", price_cents: "", sizes: "" });
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productImageError, setProductImageError] = useState("");
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const [productFormLoading, setProductFormLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    const { data } = await supabase.from("merch_products").select("*").order("created_at", { ascending: false });
    setProducts((data as MerchProduct[]) ?? []);
    setLoading(false);
  }

  function readImageAsBase64(file: File, onError: (msg: string) => void, onLoad: (base64: string) => void) {
    if (file.size > 5 * 1024 * 1024) { onError("Image must be under 5MB."); return; }
    onError("");
    const reader = new FileReader();
    reader.onload = () => onLoad(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadMerchImage(base64: string): Promise<string | null> {
    const res = await fetch("/api/instructor/upload-merch-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64 }),
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result.url;
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setProductFormLoading(true);
    setProductImageError("");

    let imageUrl: string | null = null;
    if (productImage) {
      try {
        imageUrl = await uploadMerchImage(productImage);
      } catch (err: any) {
        setProductImageError(err.message ?? "Image upload failed");
        setProductFormLoading(false);
        return;
      }
    }

    const sizes = productForm.sizes.trim()
      ? productForm.sizes.split(",").map(s => s.trim()).filter(Boolean)
      : null;

    await supabase.from("merch_products").insert({
      title: productForm.title,
      description: productForm.description || null,
      price_cents: Math.round(parseFloat(productForm.price_cents) * 100),
      image_url: imageUrl,
      sizes,
    });

    setShowProductForm(false);
    setProductForm({ title: "", description: "", price_cents: "", sizes: "" });
    setProductImage(null);
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
                <div className="aspect-square bg-[#fff8f3]">
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
                <p className="font-heading text-lg text-[#2041d8] mt-1">{formatPrice(p.price_cents)}</p>
                {p.sizes && p.sizes.length > 0 && (
                  <p className="font-body text-xs text-gray-400 mt-1">Sizes: {p.sizes.join(", ")}</p>
                )}
                <div className="flex gap-3 mt-auto pt-4">
                  <button onClick={() => toggleProductActive(p)} className="font-body text-xs text-[#2041d8] hover:underline">
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
        <Modal title="Add Product" onClose={() => { setShowProductForm(false); setProductImage(null); setProductImageError(""); }}>
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
              <label className="label">Image (optional)</label>
              <input
                ref={productImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) readImageAsBase64(file, setProductImageError, setProductImage);
                }}
              />
              {productImage ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImage} alt="" className="h-24 w-24 object-cover rounded-xl" />
                  <button type="button" onClick={() => setProductImage(null)} className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5">
                    <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => productImageInputRef.current?.click()} className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" strokeWidth={1.75} /> Add image
                </button>
              )}
              {productImageError && <p className="font-body text-xs text-red-500 mt-1">{productImageError}</p>}
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
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowProductForm(false); setProductImage(null); setProductImageError(""); }} className="btn-secondary flex-1 justify-center">Cancel</button>
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

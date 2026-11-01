"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { isValidPhone } from "@/lib/phone";

export default function PhoneNumberPrompt({ profileId, onSaved }: { profileId: string; onSaved: (phone: string) => void }) {
  const supabase = createClient();
  const [phoneInput, setPhoneInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!isValidPhone(phoneInput)) {
      setError("Please enter a valid phone number.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: dbError } = await supabase.from("profiles").update({ phone: phoneInput }).eq("id", profileId);
    setSaving(false);
    if (dbError) {
      setError("Couldn't save that — please try again.");
      return;
    }
    onSaved(phoneInput);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="font-heading text-lg mb-3">Add your phone number</h2>
        <p className="font-body text-sm text-gray-600 leading-relaxed mb-4">
          We don&apos;t have a phone number on file for you. We need it to reach you directly if a class needs to be cancelled last-minute — so you&apos;re not left showing up to a locked door for nothing. Please add it to continue.
        </p>
        <input
          type="tel"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder="+61 4xx xxx xxx"
          className="input w-full mb-4"
        />
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl mb-4">{error}</div>
        )}
        <button onClick={save} className="btn-primary w-full justify-center" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

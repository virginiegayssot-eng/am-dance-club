"use client";

export default function ConfirmDialog({
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <p className="font-body text-sm text-gray-700 leading-relaxed mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 justify-center inline-flex items-center bg-red-500 hover:bg-red-600 text-white font-heading text-sm tracking-wide px-6 py-3 rounded-full transition-all duration-200 active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

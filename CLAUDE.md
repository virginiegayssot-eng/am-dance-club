# Conventions

## Wide content on mobile

Never wrap a `<table>` (or any content that can exceed the viewport width — wide flex rows, long unbroken text) in a container that only has `overflow-hidden`. That clips anything past the edge with no way to scroll to it — the content silently becomes inaccessible on mobile instead of erroring.

If the outer wrapper needs `overflow-hidden` to clip rounded corners (the `card` class), nest the scrollable content in its own `overflow-x-auto` div:

```tsx
<div className="card overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm font-body">
      ...
    </table>
  </div>
</div>
```

Check this whenever adding a new `<table>` or wide row of content — test it at a narrow (375px) viewport width before considering it done.

## Never use window.confirm() / alert() / prompt()

This app is installed as a standalone PWA (`manifest.json` has `display: standalone`). Native browser dialogs — `confirm()`, `alert()`, `prompt()` — are unreliable in iOS's standalone WKWebView and can silently no-op instead of showing anything. Since destructive actions are almost always gated with `if (!confirm(...)) return`, the no-op makes the button look completely broken on an iOS home-screen install — the exact bug that hit every delete/cancel action in the instructor dashboard.

Always use `src/components/ConfirmDialog.tsx` for confirmations instead:

```tsx
const [confirmDialog, setConfirmDialog] = useState<{ message: string; confirmLabel?: string; action: () => void } | null>(null);

function deleteThing(id: string) {
  setConfirmDialog({
    message: "Delete this? This cannot be undone.",
    action: async () => {
      await supabase.from("things").delete().eq("id", id);
      loadData();
    },
  });
}

// in JSX:
{confirmDialog && (
  <ConfirmDialog
    message={confirmDialog.message}
    confirmLabel={confirmDialog.confirmLabel}
    onCancel={() => setConfirmDialog(null)}
    onConfirm={() => { const action = confirmDialog.action; setConfirmDialog(null); action(); }}
  />
)}
```

For non-destructive error/info messages, prefer inline UI state (an error banner, a toast) over `alert()` for the same reason — it hasn't caused a reported bug yet since it's not delete-blocking, but it's the same underlying risk.

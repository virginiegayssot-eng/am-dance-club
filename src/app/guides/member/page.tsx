import type { Metadata } from "next";

// Forces this to compile as a Netlify Function instead of a prerendered
// static file. Netlify's Next.js plugin (v5.15.13 on this site) isn't
// publishing this page's static HTML output — confirmed via the deploy's
// file browser, which only contains the page's JS chunk, not its HTML.
// Functions are unaffected by that gap (every /api/* route on this site
// is one and works fine), so this sidesteps the bug entirely.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "THE A.M Dance Club — How to Use",
  description: "A step-by-step guide to booking classes, passes and getting set up on THE A.M Dance Club app.",
};

const css = `
  :root {
    --ink: #17161c;
    --ink-soft: #6b6a72;
    --paper: #fff8f3;
    --surface: #ffffff;
    --accent: #2041d8;
    --accent-strong: #1731ad;
    --accent-tint: #dbe2fb;
    --accent-tint-soft: #eef1fd;
    --line: #e9e2da;
    --warn-tint: #fdeee0;
    --warn-ink: #8a4b12;
    --shadow: 0 1px 2px rgba(23, 22, 28, 0.04), 0 8px 24px -12px rgba(23, 22, 28, 0.12);
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ink: #f2f1f5;
      --ink-soft: #a9a7b3;
      --paper: #15141a;
      --surface: #201f27;
      --accent: #a8b8ff;
      --accent-strong: #cdd8ff;
      --accent-tint: #2a2f4a;
      --accent-tint-soft: #1e2036;
      --line: #35333f;
      --warn-tint: #3a2a17;
      --warn-ink: #f0b978;
      --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px -12px rgba(0, 0, 0, 0.5);
    }
  }

  :root[data-theme="dark"] {
    --ink: #f2f1f5;
    --ink-soft: #a9a7b3;
    --paper: #15141a;
    --surface: #201f27;
    --accent: #a8b8ff;
    --accent-strong: #cdd8ff;
    --accent-tint: #2a2f4a;
    --accent-tint-soft: #1e2036;
    --line: #35333f;
    --warn-tint: #3a2a17;
    --warn-ink: #f0b978;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px -12px rgba(0, 0, 0, 0.5);
  }

  * { box-sizing: border-box; }

  body {
    background: var(--paper);
    color: var(--ink);
    font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  .display {
    font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-weight: 900;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }

  .eyebrow {
    font-weight: 800;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }

  a { color: var(--accent); }

  /* ---------- Header ---------- */
  .hero {
    max-width: 700px;
    margin: 0 auto;
    padding: 3.5rem 1.5rem 2.5rem;
  }
  .hero-badge {
    width: 52px; height: 52px;
    border-radius: 14px;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow);
    background: var(--surface);
  }
  .hero-badge img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hero h1 {
    font-size: clamp(2rem, 5vw, 2.75rem);
    margin: 0 0 0.6rem;
  }
  .hero p.lede {
    color: var(--ink-soft);
    font-size: 1.05rem;
    max-width: 56ch;
    margin: 0;
  }

  /* ---------- Quick nav ---------- */
  .quicknav-wrap {
    position: sticky;
    top: 0;
    z-index: 10;
    background: color-mix(in srgb, var(--paper) 92%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
  }
  .quicknav {
    max-width: 700px;
    margin: 0 auto;
    padding: 0.7rem 1.5rem;
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .quicknav::-webkit-scrollbar { display: none; }
  .quicknav a {
    flex: none;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink-soft);
    text-decoration: none;
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    white-space: nowrap;
  }
  .quicknav a:hover { color: var(--accent); border-color: var(--accent); }

  /* ---------- Main ---------- */
  main {
    max-width: 700px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 6rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  section.step {
    scroll-margin-top: 4.5rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 1.75rem 1.75rem 2rem;
    box-shadow: var(--shadow);
  }

  .step-head {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.35rem;
  }
  .step-num {
    flex: none;
    width: 2.5rem; height: 2.5rem;
    border-radius: 12px;
    background: var(--accent-tint);
    color: var(--accent-strong);
    display: flex; align-items: center; justify-content: center;
    font-weight: 900;
    font-size: 1.05rem;
    font-variant-numeric: tabular-nums;
  }
  .step-titles h2 {
    font-size: 1.3rem;
    margin: 0.15rem 0 0.2rem;
  }
  .step-titles .who {
    font-size: 0.82rem;
    color: var(--ink-soft);
  }

  .step p {
    color: var(--ink-soft);
    margin: 0.9rem 0 0;
    max-width: 60ch;
  }
  .step p.small {
    font-size: 0.82rem;
    margin-top: 0.6rem;
  }

  .tap {
    display: inline-flex;
    align-items: center;
    font-weight: 700;
    font-size: 0.85em;
    color: var(--ink);
    background: var(--accent-tint-soft);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.05em 0.5em;
    white-space: nowrap;
  }

  .note {
    margin-top: 1.1rem;
    background: var(--accent-tint-soft);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    font-size: 0.88rem;
    color: var(--ink);
  }
  .note strong { color: var(--accent-strong); }

  footer {
    max-width: 700px;
    margin: 0 auto;
    padding: 0 1.5rem 4rem;
    color: var(--ink-soft);
    font-size: 0.85rem;
  }
  footer a { color: var(--ink-soft); text-decoration: underline; }

  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    * { scroll-behavior: auto !important; }
  }

  html { scroll-behavior: smooth; }

  /* ---------- Add to Home Screen ---------- */
  .install-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1.1rem;
  }
  @media (max-width: 620px) {
    .install-grid { grid-template-columns: 1fr; }
  }
  .install-platform {
    font-weight: 800;
    font-size: 0.85rem;
    margin: 0 0 0.9rem;
  }
  .install-steps {
    display: flex;
    align-items: flex-start;
    gap: 0.35rem;
  }
  .install-step {
    flex: 1;
    min-width: 0;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.55rem;
  }
  .install-step p {
    font-size: 0.72rem;
    color: var(--ink-soft);
    margin: 0;
    line-height: 1.35;
  }
  .install-step p strong { color: var(--ink); }
  .install-icon-frame {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: var(--accent-tint-soft);
    border: 1px solid var(--line);
    display: flex; align-items: center; justify-content: center;
    color: var(--accent);
    flex: none;
  }
  .install-icon-frame.app-tile {
    overflow: hidden;
    padding: 0;
  }
  .install-icon-frame.app-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .install-icon { width: 20px; height: 20px; }
  .install-arrow {
    color: var(--line);
    font-size: 1rem;
    flex: none;
    padding-top: 0.6rem;
  }

  /* ---------- Closing help card ---------- */
  .help-card {
    background: var(--accent);
    border-radius: 20px;
    padding: 1.75rem;
    color: white;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    box-shadow: var(--shadow);
  }
  .help-icon {
    flex: none;
    width: 2.5rem; height: 2.5rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.15);
    display: flex; align-items: center; justify-content: center;
  }
  .help-card h2 { font-size: 1.2rem; margin: 0 0 0.3rem; }
  .help-card p { margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.92rem; }
  .help-card a { color: white; text-decoration: underline; }
`;

const bodyHtml = `
<header class="hero">
  <div class="hero-badge">
    <img src="/logo.png" alt="THE A.M Dance Club logo" />
  </div>
  <p class="eyebrow">THE A.M Dance Club — Member Guide</p>
  <h1 class="display">How to use the app</h1>
  <p class="lede">Everything you need to book, pay, and keep dancing — from creating your account to turning on notifications.</p>
</header>

<div class="quicknav-wrap">
  <nav class="quicknav">
    <a href="#account">1. Account</a>
    <a href="#book">2. Book a class</a>
    <a href="#passes">3. Passes</a>
    <a href="#manage">4. Manage a booking</a>
    <a href="#videos">5. Videos &amp; playlists</a>
    <a href="#install">6. Home screen</a>
    <a href="#notifications">7. Notifications</a>
  </nav>
</div>

<main>

  <section class="step" id="account">
    <div class="step-head">
      <div class="step-num">1</div>
      <div class="step-titles">
        <p class="who">Getting started</p>
        <h2>Create an account</h2>
      </div>
    </div>
    <p>Click <span class="tap">Sign up</span> and fill in your details. Once you're in, you'll land on your dashboard where you can book classes, manage passes, and more.</p>
  </section>

  <section class="step" id="book">
    <div class="step-head">
      <div class="step-num">2</div>
      <div class="step-titles">
        <p class="who">Find a session</p>
        <h2>Book a class</h2>
      </div>
    </div>
    <p>Head to <span class="tap">Classes</span> to see what's coming up. Pick a session and book it — if you have an active pass, a credit is used automatically; otherwise you'll be prompted to pay or buy a pass first.</p>
  </section>

  <section class="step" id="passes">
    <div class="step-head">
      <div class="step-num">3</div>
      <div class="step-titles">
        <p class="who">Credits &amp; pricing</p>
        <h2>Passes &amp; pricing</h2>
      </div>
    </div>
    <p>Visit <span class="tap">Passes</span> to see pricing options. A pass gives you a set number of class credits to use whenever you like — no need to pay per class once you've got one.</p>
  </section>

  <section class="step" id="manage">
    <div class="step-head">
      <div class="step-num">4</div>
      <div class="step-titles">
        <p class="who">Change of plans</p>
        <h2>Manage or cancel a booking</h2>
      </div>
    </div>
    <p>Your upcoming bookings live on your dashboard. You can cancel directly from there — cancelling 24+ hours before class returns your credit automatically. See our Cancellation Policy for full details.</p>
  </section>

  <section class="step" id="videos">
    <div class="step-head">
      <div class="step-num">5</div>
      <div class="step-titles">
        <p class="who">Practice at home</p>
        <h2>Videos &amp; playlists</h2>
      </div>
    </div>
    <p>Check out <span class="tap">Videos</span> for class recordings, and Playlists for the music we dance to — great for practicing at home.</p>
  </section>

  <section class="step" id="install">
    <div class="step-head">
      <div class="step-num">6</div>
      <div class="step-titles">
        <p class="who">One-time setup, worth doing</p>
        <h2>Add THE A.M to your home screen</h2>
      </div>
    </div>
    <p>Once it's on your home screen, THE A.M opens full-screen like a real app — no browser bar, and faster to get into.</p>
    <div class="install-grid">
      <div>
        <p class="install-platform">iPhone — Safari</p>
        <div class="install-steps">
          <div class="install-step">
            <div class="install-icon-frame">
              <svg class="install-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-3"/><path d="M8 12H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2"/></svg>
            </div>
            <p>Tap the <strong>Share</strong> icon in Safari's toolbar</p>
          </div>
          <span class="install-arrow">→</span>
          <div class="install-step">
            <div class="install-icon-frame">
              <svg class="install-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </div>
            <p>Scroll down, tap <strong>Add to Home Screen</strong></p>
          </div>
          <span class="install-arrow">→</span>
          <div class="install-step">
            <div class="install-icon-frame app-tile">
              <img src="/logo.png" alt="" />
            </div>
            <p>Tap <strong>Add</strong> — THE A.M is on your home screen</p>
          </div>
        </div>
      </div>
      <div>
        <p class="install-platform">Android — Chrome</p>
        <div class="install-steps">
          <div class="install-step">
            <div class="install-icon-frame">
              <svg class="install-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </div>
            <p>Tap the <strong>⋮</strong> menu in Chrome's toolbar</p>
          </div>
          <span class="install-arrow">→</span>
          <div class="install-step">
            <div class="install-icon-frame">
              <svg class="install-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 9v6"/><path d="M9 12h6"/></svg>
            </div>
            <p>Tap <strong>Add to Home screen</strong></p>
          </div>
          <span class="install-arrow">→</span>
          <div class="install-step">
            <div class="install-icon-frame app-tile">
              <img src="/logo.png" alt="" />
            </div>
            <p>Tap <strong>Add</strong>, done!</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="step" id="notifications">
    <div class="step-head">
      <div class="step-num">7</div>
      <div class="step-titles">
        <p class="who">Stay in the loop</p>
        <h2>Turn on notifications</h2>
      </div>
    </div>
    <p>Head to <span class="tap">My Profile</span> and switch on <strong>Push Notifications</strong>. You'll get an alert on this device whenever there's a new video, a message in the group chat, or club news — no need to have the app open.</p>
    <p class="small">On iPhone, this only works once THE A.M is added to your home screen (see step 6 above) — Safari will ask you to allow notifications the first time you turn it on.</p>
  </section>

  <div class="help-card">
    <div class="help-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
    </div>
    <div>
      <h2>Need help?</h2>
      <p>Email us at <a href="mailto:theamdance@gmail.com">theamdance@gmail.com</a> and we'll sort you out.</p>
    </div>
  </div>

</main>

<footer>
  <p>Questions about anything here? Reach out any time.</p>
</footer>
`;

export default function MemberGuidePage() {
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}

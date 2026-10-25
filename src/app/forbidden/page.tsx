import { cvData } from "@/content/cv.data";

export default function Forbidden() {
  return (
    <main className="container not-found">
      <p className="context">{cvData.profile.fullName}</p>
      <h1>Access Denied</h1>
      <p>You don&apos;t have permission to access this page.</p>
      {/* Plain anchor by design: the client runtime is pruned (ADR-0004), so
          next/link would add no value and reintroduce JS. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="back-link" href="/">
Back to Home
      </a>
    </main>
  );
}

import { cvData } from "@/content/cv.data";

export default function NotFound() {
  return (
    <main className="container not-found">
      <p className="context">{cvData.profile.fullName}</p>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      {/* Plain anchor by design: the client runtime is pruned (ADR-0004), so
          next/link would add no value and reintroduce JS. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="back-link" href="/">
        Back to Home
      </a>
    </main>
  );
}

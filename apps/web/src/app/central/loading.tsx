/** Skeleton shown while the (dynamic) central console renders — avoids a blank
 *  wait. Safe with the layout-level auth gate: logged-out users are redirected in
 *  the layout (clean 307) before this loading boundary is ever reached. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-56 rounded bg-[color:var(--overlay)]" />
      <div className="h-4 w-80 rounded bg-[color:var(--overlay)] mt-3" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="panel rounded-2xl p-5 h-24" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel rounded-2xl p-6 h-32" />
        ))}
      </div>
    </div>
  );
}

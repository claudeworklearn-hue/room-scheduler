export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mb-1 h-7 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mb-5 h-4 w-72 animate-pulse rounded bg-gray-100" />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-gray-50 px-4 py-4"
          >
            <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-5 flex-1 animate-pulse rounded bg-gray-100" />
            <div className="h-5 w-20 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </main>
  );
}

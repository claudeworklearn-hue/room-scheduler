export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mb-1 h-7 w-72 animate-pulse rounded bg-gray-200" />
      <div className="mb-5 h-4 w-80 animate-pulse rounded bg-gray-100" />
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-8 w-60 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="mt-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-white"
          />
        ))}
      </div>
    </main>
  );
}

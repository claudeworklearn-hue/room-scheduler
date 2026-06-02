export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mb-1 h-7 w-56 animate-pulse rounded bg-gray-200" />
      <div className="mb-5 h-4 w-80 animate-pulse rounded bg-gray-100" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <li
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-white"
          />
        ))}
      </ul>
    </main>
  );
}

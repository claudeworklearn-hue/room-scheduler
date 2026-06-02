/**
 * Loading skeleton สำหรับหน้า room-schedule
 * แสดงทันทีตอน navigate / เปลี่ยนแท็บ — ให้รู้สึกตอบสนองเร็ว
 */
export default function Loading() {
  return (
    <main className="mx-auto max-w-[1700px] px-6 py-6">
      {/* breadcrumb */}
      <div className="mb-4 h-4 w-48 animate-pulse rounded bg-gray-200" />

      {/* toolbar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-8 w-80 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>

      {/* grid skeleton */}
      <div className="mt-6">
        <div className="mb-3 h-4 w-64 animate-pulse rounded bg-gray-200" />
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* header row */}
          <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          </div>
          {/* sample rows */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-gray-50 px-3 py-4"
            >
              <div className="h-8 w-24 animate-pulse rounded bg-gray-100" />
              <div className="h-8 flex-1 animate-pulse rounded bg-gray-50" />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        กำลังโหลดตาราง...
      </p>
    </main>
  );
}

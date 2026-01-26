export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
      <p className="text-teal-200/60 text-sm font-medium animate-pulse">Memuat konten...</p>
    </div>
  );
}

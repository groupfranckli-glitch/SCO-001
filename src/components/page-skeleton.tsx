export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-16 sm:px-8" aria-busy="true" aria-label="Chargement">
      <div className="h-4 w-24 rounded-full bg-muted" />
      <div className="mt-5 h-14 w-2/3 max-w-md rounded-2xl bg-muted" />
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="aspect-[4/5] rounded-[2rem] bg-muted" />
        <div className="space-y-4 self-center">
          <div className="h-4 w-1/3 rounded-full bg-muted" />
          <div className="h-4 w-full rounded-full bg-muted" />
          <div className="h-4 w-4/5 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

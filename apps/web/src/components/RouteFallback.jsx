// Minimal, layout-stable loading state for lazily-loaded routes.
export default function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand-600" />
    </div>
  )
}

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-xl ${className ?? ''}`} />
)

export const TaskSkeleton = () => (
  <div className="flex items-center gap-3 px-4 py-3 bg-surface rounded-2xl">
    <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
    <Skeleton className="h-4 flex-1" />
    <Skeleton className="w-12 h-4" />
  </div>
)

export const ProjectCardSkeleton = () => (
  <div className="p-4 rounded-2xl border border-white/5 space-y-3">
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-2 w-full" />
  </div>
)

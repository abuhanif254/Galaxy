'use client';

export function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm animate-pulse">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-2">
             <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24" />
             <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
          </div>
        </div>
      </div>
      {/* Image */}
      <div className="w-full aspect-square bg-zinc-200 dark:bg-zinc-800" />
      {/* Footer */}
      <div className="p-4 space-y-4">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
      </div>
    </div>
  );
}

export function StorySkeleton() {
  return (
    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse border-2 border-transparent" />
  );
}

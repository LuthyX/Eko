import React from "react";

const Skeleton = ({ className = "" }) => (
  <div
    className={`bg-surface-1 animate-pulse rounded ${className}`}
    aria-hidden="true"
  />
);

export const SkeletonCard = () => (
  <div className="border border-border-light rounded-md p-3.5 bg-surface-0">
    <div className="flex justify-between items-start mb-2 gap-2">
      <div className="flex-1 min-w-0">
        <Skeleton className="h-3.5 w-3/4 mb-1.5" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-5 w-12 rounded-full" />
    </div>
    <div className="flex gap-1.5 mb-2.5">
      <Skeleton className="h-4 w-16 rounded-full" />
      <Skeleton className="h-4 w-12 rounded-full" />
      <Skeleton className="h-4 w-14 rounded-full" />
    </div>
    <Skeleton className="h-9 w-full rounded-sm" />
  </div>
);

export default Skeleton;

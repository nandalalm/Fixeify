import React from "react";

// Generic skeleton line
export const SkeletonLine: React.FC<{ width?: string; height?: string; className?: string }> = ({ width = "w-full", height = "h-4", className = "" }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${width} ${height} ${className}`}/>
);

// Block skeleton (card)
export const SkeletonBlock: React.FC<{ className?: string; height?: string }> = ({ className = "", height = "h-24" }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow p-4 animate-pulse ${height} ${className}`}/>
);

// Table rows skeleton
export const TableSkeleton: React.FC<{ rows?: number; colSpan?: number }> = ({ rows = 3, colSpan = 6 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={`srow-${i}`} className="animate-pulse">
        <td className="px-4 py-3" colSpan={colSpan}>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"/>
        </td>
      </tr>
    ))}
  </>
);

// List of cards skeleton for mobile layouts
export const CardListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={`card-${i}`} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700 animate-pulse h-20"/>
    ))}
  </div>
);

export default {
  SkeletonLine,
  SkeletonBlock,
  TableSkeleton,
  CardListSkeleton,
};

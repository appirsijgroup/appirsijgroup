'use client';

import React from 'react';

export const PageSkeleton = () => {
    return (
        <div className="w-full h-full animate-fade-in space-y-6">
            {/* Header Area Skeleton */}
            <div className="flex items-center justify-between gap-4 mb-8">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse"></div>
                    <div className="h-4 w-32 bg-white/5 rounded-lg animate-pulse"></div>
                </div>
                <div className="h-12 w-12 bg-white/5 rounded-full animate-pulse"></div>
            </div>

            {/* Grid Content Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-white/10 rounded-2xl animate-pulse"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse"></div>
                                <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse"></div>
                            </div>
                        </div>
                        <div className="space-y-2 pt-4">
                            <div className="h-4 w-full bg-white/5 rounded animate-pulse"></div>
                            <div className="h-4 w-5/6 bg-white/5 rounded animate-pulse"></div>
                        </div>
                        <div className="h-10 w-full bg-white/10 rounded-xl mt-4 animate-pulse"></div>
                    </div>
                ))}
            </div>

            {/* Table-like Skeleton */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mt-8 space-y-4">
                <div className="h-6 w-40 bg-white/10 rounded mb-6 animate-pulse"></div>
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                        <div className="h-5 w-1/4 bg-white/5 rounded animate-pulse"></div>
                        <div className="h-5 w-1/4 bg-white/5 rounded animate-pulse"></div>
                        <div className="h-5 w-1/4 bg-white/5 rounded animate-pulse"></div>
                        <div className="h-5 w-1/4 bg-white/5 rounded animate-pulse ml-auto"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PageSkeleton;

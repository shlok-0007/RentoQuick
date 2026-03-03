export default function Skeleton({ className = '' }) {
    return <div className={`shimmer rounded-lg ${className}`} />;
}

export function ListingCardSkeleton() {
    return (
        <div className="glass rounded-2xl overflow-hidden border-white/50 shadow-sm">
            <Skeleton className="h-52 w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
                <div className="pt-3 border-t border-primary-500/10 flex justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-16" />
                </div>
            </div>
        </div>
    );
}

export function BookingCardSkeleton() {
    return (
        <div className="glass rounded-2xl p-5 space-y-4 border-white/50 shadow-sm">
            <div className="flex gap-4">
                <Skeleton className="h-20 w-28 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
            </div>
            <div className="flex justify-between pt-3 border-t border-primary-500/10">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
        </div>
    );
}

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, isBefore, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AvailabilityCalendar({ bookedDates = [] }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Memoize a Set of booked ISO date strings for O(1) lookup
    const bookedSet = useMemo(() => {
        const set = new Set();
        bookedDates.forEach(range => {
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);
            const day = new Date(start);
            while (day <= end) {
                set.add(format(day, 'yyyy-MM-dd'));
                day.setDate(day.getDate() + 1);
            }
        });
        return set;
    }, [bookedDates]);

    const isBooked = (date) => bookedSet.has(format(date, 'yyyy-MM-dd'));

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    // Add empty days for start of month alignment
    const firstDayIdx = days[0].getDay(); // 0 is Sunday
    const blanks = Array(firstDayIdx).fill(null);

    return (
        <div className="bg-white rounded-2xl border border-surface-100 p-4 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-surface-900 text-sm">
                    {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <div className="flex gap-1">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-1 rounded-lg hover:bg-surface-50 text-surface-600"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-1 rounded-lg hover:bg-surface-50 text-surface-600"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <span key={d} className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">{d}</span>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {blanks.map((_, i) => <div key={`blank-${i}`} className="h-8" />)}
                {days.map((day, i) => {
                    const booked = isBooked(day);
                    const isToday = isSameDay(day, new Date());
                    const isPast = isBefore(day, new Date()) && !isToday;

                    return (
                        <div
                            key={i}
                            className={`h-8 flex items-center justify-center text-xs font-medium rounded-lg transition-all relative ${booked
                                    ? 'bg-red-50 text-red-400 cursor-not-allowed line-through'
                                    : isPast
                                        ? 'text-surface-300'
                                        : 'text-surface-800 hover:bg-primary-50 hover:text-primary-600 cursor-pointer'
                                } ${isToday ? 'border border-primary-500 text-primary-600 font-bold' : ''}`}
                        >
                            {format(day, 'd')}
                            {booked && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-red-400" />}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t border-surface-50 flex gap-4 text-[10px] font-bold uppercase tracking-tight">
                <div className="flex items-center gap-1.5 text-surface-500">
                    <div className="w-2.5 h-2.5 rounded-full border border-surface-200" /> Available
                </div>
                <div className="flex items-center gap-1.5 text-red-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-50 border border-red-100" /> Booked
                </div>
            </div>
        </div>
    );
}

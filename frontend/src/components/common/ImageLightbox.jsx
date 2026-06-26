import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

/**
 * ImageLightbox
 *
 * A lightweight, dependency-free fullscreen image viewer.
 * Renders a fixed overlay with the current image, prev/next
 * navigation, keyboard support (Esc / ← / →), and a click-outside
 * to close behaviour.
 *
 * Props:
 *   images    — Array<{ url: string, alt?: string }>
 *   index     — currently visible image index
 *   onClose   — () => void
 *   onIndex   — (newIndex: number) => void
 */
export default function ImageLightbox({ images, index, onClose, onIndex }) {
    const total = images?.length || 0;
    const current = images?.[index];

    const goPrev = useCallback(() => {
        if (total <= 1) return;
        onIndex((index - 1 + total) % total);
    }, [index, total, onIndex]);

    const goNext = useCallback(() => {
        if (total <= 1) return;
        onIndex((index + 1) % total);
    }, [index, total, onIndex]);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'ArrowRight') goNext();
        };
        window.addEventListener('keydown', handler);

        // Lock body scroll while lightbox is open
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handler);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose, goPrev, goNext]);

    if (!current) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
                aria-label="Close"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Counter */}
            {total > 1 && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-bold tracking-wider">
                    {index + 1} / {total}
                </div>
            )}

            {/* Prev */}
            {total > 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    className="absolute left-4 md:left-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
                    aria-label="Previous image"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>
            )}

            {/* Image */}
            <div
                className="max-w-[92vw] max-h-[88vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={current.url}
                    alt={current.alt || 'Product image'}
                    className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl"
                />
            </div>

            {/* Next */}
            {total > 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    className="absolute right-4 md:right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
                    aria-label="Next image"
                >
                    <ChevronRight className="w-7 h-7" />
                </button>
            )}

            {/* Hint */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/60 text-xs font-medium">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Click outside or press Esc to close • Use arrow keys to navigate</span>
            </div>
        </div>
    );
}

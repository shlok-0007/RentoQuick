import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 *
 * Listens to route changes and forces the window to scroll to the top
 * whenever the pathname changes. This fixes the issue where navigating
 * from the Home page's featured items to a listing detail page leaves
 * the user scrolled to the middle/bottom of the new page.
 *
 * Mount this once near the top of the app tree (inside <BrowserRouter>).
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Scroll to top on every pathname change.
        // Use 'instant' so there is no visible animation when a new
        // page is being mounted (the smooth behaviour is jarring here).
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);

    return null;
}

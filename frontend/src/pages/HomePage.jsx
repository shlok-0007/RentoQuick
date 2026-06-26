import { lazy, Suspense } from "react";
import Hero from "../components/site/Hero";
import StatsBar from "../components/site/StatsBar";
import Categories from "../components/site/Categories";
import FeaturedListings from "../components/site/FeaturedListings";

// Lazy load below-fold sections
const HowItWorks = lazy(() => import("../components/site/HowItWorks"));
const WhyChooseUs = lazy(() => import("../components/site/WhyChooseUs"));
const Testimonials = lazy(() => import("../components/site/Testimonials"));
const HostCTA = lazy(() => import("../components/site/HostCTA"));
const FAQ = lazy(() => import("../components/site/FAQ"));

const SectionFallback = () => (
    <div className="h-32 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

export default function HomePage() {
    return (
        <div>
            <Hero />
            <StatsBar />
            <Categories />
            <FeaturedListings />
            <Suspense fallback={<SectionFallback />}><HowItWorks /></Suspense>
            <Suspense fallback={<SectionFallback />}><WhyChooseUs /></Suspense>
            <Suspense fallback={<SectionFallback />}><Testimonials /></Suspense>
            <Suspense fallback={<SectionFallback />}><HostCTA /></Suspense>
            <Suspense fallback={<SectionFallback />}><FAQ /></Suspense>
        </div>
    );
}
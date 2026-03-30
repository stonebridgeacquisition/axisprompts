import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Hero from '../components/sections/Hero';
import WhatYouGet from '../components/sections/WhatYouGet';
import WhoThisIsFor from '../components/sections/WhoThisIsFor';
import HowWeDoIt from '../components/sections/HowWeDoIt';
import MenuShowcase from '../components/sections/MenuShowcase';
import Guarantee from '../components/sections/Guarantee';
import WhyTrust from '../components/sections/WhyTrust';
import CostOfMissedMessages from '../components/sections/CostOfMissedMessages';
import CTA from '../components/sections/CTA';
import FAQ from '../components/sections/FAQ';
import Footer from '../components/layout/Footer';
import PreBookingModal from '../components/ui/PreBookingModal';

const LandingPage = () => {
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-brand-500 selection:text-white">
            <Navbar />
            <main>
                <Hero onOpenBooking={() => setIsBookingModalOpen(true)} />
                <WhatYouGet />
                <WhoThisIsFor />
                <HowWeDoIt />
                <MenuShowcase />
                <Guarantee />
                <WhyTrust />
                <CostOfMissedMessages />
                <FAQ />
                <CTA onOpenBooking={() => setIsBookingModalOpen(true)} />
            </main>
            <Footer />

            <PreBookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
            />
        </div>
    );
};

export default LandingPage;

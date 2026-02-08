import React from 'react';
import Navbar from '../components/layout/Navbar';
import Hero from '../components/sections/Hero';
import WhatYouGet from '../components/sections/WhatYouGet';
import WhoThisIsFor from '../components/sections/WhoThisIsFor';
import HowWeDoIt from '../components/sections/HowWeDoIt';
import Guarantee from '../components/sections/Guarantee';
import WhyTrust from '../components/sections/WhyTrust';
import CostOfMissedMessages from '../components/sections/CostOfMissedMessages';
import CTA from '../components/sections/CTA';
import FAQ from '../components/sections/FAQ';
import Footer from '../components/layout/Footer';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-brand-500 selection:text-white">
            <Navbar />
            <main>
                <Hero />
                <WhatYouGet />
                <WhoThisIsFor />
                <HowWeDoIt />
                <Guarantee />
                <WhyTrust />
                <CostOfMissedMessages />
                <FAQ />
                <CTA />
            </main>
            <Footer />
        </div>
    );
};

export default LandingPage;

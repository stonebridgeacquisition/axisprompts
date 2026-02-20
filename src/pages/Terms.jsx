import React, { useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const Terms = () => {
    // Scroll to top on load
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-brand-500 selection:text-white flex flex-col">
            <Navbar />

            <main className="flex-grow pt-32 pb-20 container mx-auto px-6 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-8">Terms of Service</h1>

                <div className="prose prose-lg prose-gray max-w-none">
                    <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Agreement to Terms</h2>
                    <p className="text-gray-600 mb-4">
                        By accessing our website, you agree to be bound by these Terms of Service and to comply with all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Use License</h2>
                    <p className="text-gray-600 mb-4">
                        Permission is granted to temporarily download one copy of the materials (information or software) on Swift Order AI's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                    </p>
                    <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                        <li>modify or copy the materials;</li>
                        <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                        <li>attempt to decompile or reverse engineer any software contained on Swift Order AI's website;</li>
                        <li>remove any copyright or other proprietary notations from the materials; or</li>
                        <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
                    </ul>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Disclaimer</h2>
                    <p className="text-gray-600 mb-4">
                        The materials on Swift Order AI's website are provided on an 'as is' basis. Swift Order AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Limitations</h2>
                    <p className="text-gray-600 mb-4">
                        In no event shall Swift Order AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Swift Order AI's website, even if Swift Order AI or a Swift Order AI authorized representative has been notified orally or in writing of the possibility of such damage.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Accuracy of Materials</h2>
                    <p className="text-gray-600 mb-4">
                        The materials appearing on Swift Order AI's website could include technical, typographical, or photographic errors. Swift Order AI does not warrant that any of the materials on its website are accurate, complete or current. Swift Order AI may make changes to the materials contained on its website at any time without notice. However Swift Order AI does not make any commitment to update the materials.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Governing Law</h2>
                    <p className="text-gray-600 mb-4">
                        These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Terms;

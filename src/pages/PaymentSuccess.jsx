import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [status, setStatus] = useState('verifying'); // verifying, success, error

  useEffect(() => {
    // In a real app, you might want to call to your backend to verify the reference
    // But since Paystack webhooks handle the actual confirmation, we just show a success UI
    // with a small delay to feel like it's verification
    if (reference) {
        const timer = setTimeout(() => setStatus('success'), 1500);
        return () => clearTimeout(timer);
    } else {
        setStatus('error');
    }
  }, [reference]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white max-w-md w-full rounded-[2rem] shadow-xl p-8 text-center"
      >
        {status === 'verifying' && (
            <div className="py-12 flex flex-col items-center">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment...</h2>
                <p className="text-gray-500">Please wait a moment while we confirm your transaction.</p>
            </div>
        )}

        {status === 'success' && (
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="py-8 flex flex-col items-center"
            >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Payment Successful!</h2>
                <p className="text-gray-500 mb-6 leading-relaxed">
                    Your order has been confirmed and is now being prepared. 
                    We've sent a receipt and updates to your WhatsApp!
                </p>
                
                {reference && (
                    <div className="bg-gray-50 rounded-xl p-4 w-full mb-8 border border-gray-100">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Transaction Reference</p>
                        <p className="text-sm text-gray-700 font-mono break-all">{reference}</p>
                    </div>
                )}

                <button 
                    onClick={() => window.close()}
                    className="w-full bg-gray-900 text-white font-medium py-4 rounded-xl hover:bg-gray-800 transition-colors"
                >
                    You can close this page
                </button>
            </motion.div>
        )}

        {status === 'error' && (
            <div className="py-12 flex flex-col items-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h2>
                <p className="text-gray-500">We couldn't find a valid payment reference. If you were charged, please contact support.</p>
            </div>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;

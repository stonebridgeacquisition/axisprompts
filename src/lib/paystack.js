/**
 * Paystack API Helper
 * Note: Interactions requiring the Secret Key should ideally be done on a backend server
 * to avoid exposing the key in the browser.
 */

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;

export const createSubaccount = async ({ business_name, bank_code, account_number, percentage_charge = 0.5 }) => {
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error("Paystack Secret Key is missing in .env");
    }

    const payload = {
        business_name,
        settlement_bank: bank_code,
        account_number,
        percentage_charge, // e.g., 10 for 10% platform fee
        description: `Subaccount for ${business_name}`
    };

    try {
        const response = await fetch('https://api.paystack.co/subaccount', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!data.status) {
            throw new Error(data.message || "Failed to create Paystack subaccount");
        }

        return data.data; // Contains subaccount_code, etc.
    } catch (error) {
        console.error("Paystack Error:", error);
        throw error;
    }
};

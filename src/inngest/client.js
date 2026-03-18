import { Inngest } from "inngest";

// Initialize Inngest Client
// This ID identifies your app in the Inngest dashboard
export const inngest = new Inngest({
    id: "axis-food-agent",
    eventKey: process.env.VITE_INNGEST_EVENT_KEY, // Use env var for safety
});

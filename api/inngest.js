import { serve } from "inngest/next";
import { inngest } from "../src/inngest/client.js";
import { agentWorkflow } from "../src/inngest/functions/agent.js";
import { paymentLifecycle } from "../src/inngest/functions/payment.js";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [agentWorkflow, paymentLifecycle],
});

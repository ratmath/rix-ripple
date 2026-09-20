import { RixCelEvaluationSession } from "./evaluation-runtime.js";

const session = new RixCelEvaluationSession();

self.addEventListener("message", async (event) => {
    const { id, request } = event.data || {};
    try {
        self.postMessage({ id, type: "result", value: await session.handle(request) });
    } catch (error) {
        self.postMessage({
            id,
            type: "error",
            message: error instanceof Error ? error.message : String(error),
        });
    }
});

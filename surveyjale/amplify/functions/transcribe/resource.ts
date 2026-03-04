import { defineFunction } from "@aws-amplify/backend";

export const transcribeFunction = defineFunction({
    name: "transcribe",
    timeoutSeconds: 120,
    memoryMB: 512,
    runtime: 20,
});
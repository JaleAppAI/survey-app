import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
    name: "surveyAudioBucket",
    access: (allow) => ({
        'temp-audio/*': [allow.guest.to(['write'])],
        'transcripts/*': [allow.guest.to(['read'])],
    }),
});
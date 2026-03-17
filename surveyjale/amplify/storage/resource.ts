import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'surveyAudio',
  access: (allow) => ({
    'audio/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});

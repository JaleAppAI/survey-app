import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Question: a
    .model({
      text: a.string().required(),
      order: a.integer().required(),
      conditions: a.json(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
    ]),

  Submission: a
    .model({
      respondentName: a.string(),
      respondentEmail: a.string().required(),
      responses: a.json().required(),
    })
    .authorization((allow) => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Question: a
    .model({
      text: a.string(),
      order: a.integer(),
      conditions: a.json(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
    ]),

  Response: a
    .model({
      questionId: a.string(),
      responseText: a.string(),
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
    defaultAuthorizationMode:"iam",
  },
});

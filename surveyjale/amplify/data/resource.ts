import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Survey: a
    .model({
      name: a.string().required(),
      questions: a.hasMany('Question', 'surveyId'),
      submissions: a.hasMany('Submission', 'surveyId'),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read', 'create', 'update']),
    ]),

  Question: a
    .model({
      text: a.string().required(),
      order: a.integer().required(),
      conditions: a.json(),
      surveyId: a.id().required(),
      survey: a.belongsTo('Survey', 'surveyId'),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read', 'create', 'update']),
    ]),

  Submission: a
    .model({
      respondentName: a.string().required(),
      respondentEmail: a.string().required(),
      respondentIndustry: a.string().required(),
      responses: a.json().required(),
      surveyId: a.id().required(),
      survey: a.belongsTo('Survey', 'surveyId'),
    })
    .authorization((allow) => [
      allow.guest().to(['create']),
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
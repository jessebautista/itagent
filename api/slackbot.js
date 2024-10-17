const { App } = require('@slack/bolt');
const { Configuration, OpenAIApi } = require('openai');
const express = require('express');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

app.message(async ({ message, say }) => {
  if (message.subtype && message.subtype === 'bot_message') return;

  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message.text }],
  });

  await say(response.data.choices[0].message.content);
});

const expressApp = express();

expressApp.use(express.json());

// Middleware to handle Slack's challenge request
expressApp.post('/api/slackbot', (req, res) => {
  if (req.body.type === 'url_verification') {
    return res.status(200).send({ challenge: req.body.challenge });
  }
});

expressApp.listen(3000, () => {
  console.log('Server running on port 3000');
});


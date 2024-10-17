const { App } = require('@slack/bolt');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Initialize OpenAI API
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

// Slack event listener for messages
app.message(async ({ message, say }) => {
  if (message.subtype && message.subtype === 'bot_message') return; // Ignore bot messages

  // Send the message content to OpenAI for a response
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message.text }],
  });

  // Send back the OpenAI-generated response to Slack
  await say(response.data.choices[0].message.content);
});

// Vercel serverless function handler
export default async function handler(req, res) {
  // Check for Slack's URL verification request
  if (req.method === 'POST') {
    const { type, challenge } = req.body;

    // Handle URL verification challenge
    if (type === 'url_verification') {
      return res.status(200).json({ challenge }); // Respond with the challenge
    }

    // Start the Slack app for other event requests
    await app.start();
    return res.status(200).send('Slack bot is running');
  }

  // Handle unsupported HTTP methods
  return res.status(405).send('Method Not Allowed');
}

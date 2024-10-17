const { App, ExpressReceiver } = require('@slack/bolt');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize the ExpressReceiver
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// Initialize the Slack app with the receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Slack event listener for messages
app.message(async ({ message, say }) => {
  try {
    if (message.subtype && message.subtype === 'bot_message') return;

    // Optional: Add a typing indicator
    await say({
      type: 'typing'
    });

    // Send the message content to OpenAI for a response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message.text }],
      temperature: 0.7,
      max_tokens: 500
    });

    // Send back the OpenAI-generated response to Slack
    await say(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error processing message:', error);
    await say('Sorry, I encountered an error processing your message.');
  }
});

// Error handler
app.error(async (error) => {
  console.error('Global error handler:', error);
});

// Start the app
(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
  } catch (error) {
    console.error('Unable to start App:', error);
  }
})();

// Vercel serverless function handler
export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Handle Slack's URL verification challenge
    if (req.body.type === 'url_verification') {
      return res.status(200).json({ challenge: req.body.challenge });
    }

    // Forward other requests to the Bolt receiver
    await receiver.router.handle(req, res);
  } else {
    // Handle other HTTP methods
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
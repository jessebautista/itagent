const { App, ExpressReceiver } = require('@slack/bolt');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a custom receiver for handling requests
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver, // Use the custom receiver
  processBeforeResponse: true
});

// Slack event listener for messages
app.event('message', async ({ event, say }) => {
  try {
    // Ignore bot messages and messages without text
    if (event.bot_id || !event.text) return;

    console.log('Received message:', event.text);

    // Send the message content to OpenAI for a response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: event.text }],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Send back the OpenAI-generated response to Slack
    await say({
      text: completion.choices[0].message.content,
      thread_ts: event.thread_ts || event.ts, // This will reply in a thread if the message is in a thread
    });

  } catch (error) {
    console.error('Error processing message:', error);
    await say({
      text: 'Sorry, I encountered an error processing your message.',
      thread_ts: event.thread_ts || event.ts,
    });
  }
});

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Pass incoming request to the receiver
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Let the receiver handle the request
    await receiver.app(req, res);
  } catch (error) {
    console.error('Error processing event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const Anthropic = require('@anthropic-ai/sdk');

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY environment variable not set');
  console.log('Set it with: $env:ANTHROPIC_API_KEY = "your-key-here"');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const question = process.argv.slice(2).join(' ');

if (!question) {
  console.log('Usage: node claude.js "your question here"');
  process.exit(1);
}

(async () => {
  try {
    console.log('Asking Claude...\n');

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: question }],
    });

    console.log(message.content[0].text);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();

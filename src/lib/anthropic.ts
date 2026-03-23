import Anthropic from '@anthropic-ai/sdk'

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
console.log('API KEY:', apiKey) // временный дебаг

const client = new Anthropic({
  apiKey,
  dangerouslyAllowBrowser: true,
})

export async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}
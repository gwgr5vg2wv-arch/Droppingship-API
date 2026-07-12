import OpenAI from 'openai';

const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
const client = hasOpenAIKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export function getAiStatus() {
  return {
    configured: hasOpenAIKey,
    mode: hasOpenAIKey ? 'openai-ready' : 'not-configured'
  };
}

export async function generateListing(product) {
  if (client) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Voce cria anuncios curtos, persuasivos e eticos para e-commerce no Brasil.'
          },
          {
            role: 'user',
            content: `Crie titulo, descricao, tags e bullets para: ${JSON.stringify(product)}`
          }
        ],
        response_format: { type: 'json_object' }
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      const publicError = new Error('OpenAI nao respondeu agora.');
      publicError.cause = error;
      throw publicError;
    }
  }

  const error = new Error('OpenAI nao configurada.');
  error.code = 'AI_NOT_CONFIGURED';
  throw error;
}

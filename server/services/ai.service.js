import OpenAI from 'openai';

const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
const client = hasOpenAIKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export function getAiStatus() {
  return {
    configured: hasOpenAIKey,
    mode: hasOpenAIKey ? 'openai-ready' : 'mock'
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
    } catch {
      return generateMockListing(product);
    }
  }

  return generateMockListing(product);
}

export function generateMockListing(product) {
  const cleanTitle = product.title.replace(/\s+/g, ' ').trim();
  const mainTag = cleanTitle.split(' ')[0]?.toLowerCase() || 'produto';

  return {
    title: `${cleanTitle} | Oferta com Envio Rapido`,
    description: `Produto selecionado para quem busca praticidade, bom acabamento e excelente custo-beneficio. Ideal para revenda online com anuncio claro, fotos objetivas e promessa realista de entrega.`,
    tags: [mainTag, 'dropshipping', 'oferta', 'tendencia', 'custo-beneficio'],
    bullets: [
      'Produto com boa margem simulada',
      'Descricao pronta para marketplace',
      'Indicado para teste de anuncio',
      'Dados gerados em modo simulacao'
    ]
  };
}

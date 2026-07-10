import { getTrendsMode } from './integrationMode.service.js';

const categories = [
  'Mais buscados agora',
  'Produtos virais',
  'Baixa concorrencia',
  'Alta margem',
  'Entrega rapida BR'
];

export async function getTrendingProducts() {
  const mode = getTrendsMode();
  return {
    mode,
    fallbackUsed: mode !== 'mock',
    categories: categories.map((category, index) => ({
      category,
      items: makeTrendItems(category, index)
    }))
  };
}

function makeTrendItems(category, categoryIndex) {
  const titles = [
    ['Fone bluetooth compacto', 'Mini camera Wi-Fi', 'Garrafa termica premium'],
    ['Luminaria por sensor', 'Bolsa organizadora viral', 'Massageador portatil'],
    ['Kit cozinha dobravel', 'Suporte notebook slim', 'Organizador de cabos'],
    ['Smartwatch fitness', 'Escova secadora compacta', 'Projetor mini LED'],
    ['Copo termico inox', 'Capinha anti-impacto', 'Carregador veicular rapido']
  ][categoryIndex];

  return titles.map((title, index) => ({
    title,
    category,
    source: 'mock',
    demandScore: 82 + categoryIndex * 2 + index,
    trendScore: 74 + categoryIndex * 4 + index * 3,
    avgPrice: 59.9 + categoryIndex * 22 + index * 13,
    estimatedProfit: 24.5 + categoryIndex * 7 + index * 4.2,
    competitionLevel: ['baixa', 'media', 'alta'][(categoryIndex + index) % 3],
    reason: trendReason(category),
    searchVolumeLabel: ['alto', 'medio', 'em crescimento'][(categoryIndex + index) % 3],
    tags: ['tendencia', 'margem', category.toLowerCase().replace(/\s+/g, '-')]
  }));
}

function trendReason(category) {
  return {
    'Mais buscados agora': 'Procura simulada alta e boa aderencia para testes rapidos.',
    'Produtos virais': 'Produto com apelo visual forte para conteudo curto.',
    'Baixa concorrencia': 'Menos ofertas simuladas disputando o mesmo publico.',
    'Alta margem': 'Diferenca saudavel entre custo estimado e preco medio.',
    'Entrega rapida BR': 'Promessa operacional mais simples para cliente final.'
  }[category];
}

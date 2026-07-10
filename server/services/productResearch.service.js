import { generateListing } from './ai.service.js';
import { calculateMargin, round } from './margin.service.js';
import { makeId } from './mockData.service.js';

const catalogs = {
  fone: ['Fone Bluetooth Pro Bass', 'Earbuds Sem Fio Touch', 'Headset Gamer Bluetooth', 'Fone Esportivo Resistente'],
  garrafa: ['Garrafa Termica Smart 900ml', 'Garrafa Inox Motivacional', 'Copo Termico Antivazamento', 'Squeeze Fitness Premium'],
  relogio: ['Relogio Smart Fitness', 'Smartwatch Chamada Bluetooth', 'Pulseira Inteligente Pro', 'Relogio Esportivo Digital'],
  pet: ['Bebedouro Automatico Pet', 'Escova Removedora de Pelos', 'Cama Pet Dobrável', 'Brinquedo Interativo Pet'],
  casa: ['Organizador Multiuso Dobrável', 'Luminaria LED Sensor', 'Mini Aspirador Portatil', 'Suporte Ajustavel Cozinha']
};

const images = [
  '/Droppingship/assets/img/product-card.svg',
  '/Droppingship/assets/img/app-preview.svg',
  '/Droppingship/assets/img/empty-state.svg',
  '/Droppingship/assets/img/ai-bot.svg'
];

export async function researchProducts({ query = 'produto', source = 'mock', marketplaceFeePercent = 14 }) {
  const normalized = normalize(query);
  const baseTitles = findTitles(normalized, query);
  const products = [];

  for (let index = 0; index < 8; index += 1) {
    const title = baseTitles[index % baseTitles.length];
    const supplierPrice = round(24 + index * 7.6 + normalized.length * 1.3);
    const shippingCost = round(8 + (index % 4) * 3.5);
    const suggestedPrice = round((supplierPrice + shippingCost) * (1.75 + (index % 3) * 0.18));
    const margin = calculateMargin({ supplierPrice, shippingCost, suggestedPrice, marketplaceFeePercent });
    const product = {
      id: makeId('PROD'),
      title: `${title} ${index + 1}`,
      source,
      mode: source === 'mock' ? 'mock' : 'hybrid',
      supplierPrice,
      shippingCost,
      suggestedPrice,
      profit: margin.profit,
      roi: margin.roi,
      rating: round(4.2 + (index % 7) * 0.1),
      sold: 90 + index * 47 + normalized.length * 3,
      deliveryDays: 7 + (index % 5) * 2,
      trendScore: Math.min(98, 68 + index * 4 + normalized.length),
      competitionLevel: ['baixa', 'media', 'alta'][index % 3],
      riskLevel: ['baixo', 'medio', 'alto'][(index + 1) % 3],
      image: images[index % images.length],
      recommendation: margin.roi >= 45 && margin.profit >= 25 ? 'Boa oportunidade para teste' : 'Validar concorrencia antes de publicar'
    };
    const listing = await generateListing(product);
    products.push({
      ...product,
      generatedTitle: listing.title,
      generatedDescription: listing.description,
      tags: listing.tags,
      bullets: listing.bullets
    });
  }

  return products;
}

function normalize(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findTitles(normalized, original) {
  const key = Object.keys(catalogs).find((item) => normalized.includes(item));
  if (key) return catalogs[key];

  const fallback = original?.trim() || 'Produto Vencedor';
  return [
    `${fallback} Premium`,
    `${fallback} Alta Procura`,
    `${fallback} Oferta Especial`,
    `${fallback} Para Revenda`
  ];
}

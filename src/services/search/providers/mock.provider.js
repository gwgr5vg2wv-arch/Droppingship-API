const samples = [
  ['Fone Bluetooth Pro Bass', 'electronics.png', 42.9],
  ['Mini camera Wi-Fi Full HD', 'electronics.png', 68.5],
  ['Organizador de cozinha dobravel', 'home.png', 35.2],
  ['Escova secadora compacta', 'beauty.png', 74.9],
  ['Bebedouro automatico pet', 'pet.png', 52.7],
  ['Garrafa termica fitness', 'sports.png', 39.9]
];

export const provider = {
  name: 'mock',
  enabled: true,

  async searchProducts(query, options = {}) {
    return samples.slice(0, options.limit || 20).map(([title, image, price], index) => ({
      id: `MOCK-${index}-${query}`,
      externalId: null,
      title: `${title} ${query ? `- ${query}` : ''}`.trim(),
      description: 'Sugestao temporaria local para manter a operacao funcionando quando fontes reais falham.',
      source: 'mock',
      marketplace: 'mock',
      url: null,
      image: `/Droppingship/assets/images/products/${image}`,
      images: [`/Droppingship/assets/images/products/${image}`],
      supplierPrice: price,
      shippingPrice: index % 2 ? 12.9 : 0,
      soldCount: 80 + index * 45,
      rating: 4.2 + index * 0.1,
      deliveryDays: 5 + index,
      tags: ['temporario', 'estimado'],
      isFallback: true,
      fallbackReason: 'no_real_sources'
    }));
  },

  async searchTrends(query, options = {}) {
    return this.searchProducts(query || 'tendencia', options);
  },

  async healthCheck() {
    return { ok: true, message: 'Fallback local disponivel' };
  }
};

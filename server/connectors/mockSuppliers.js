export async function mockSearch(keyword) {
  return [
    { source: 'aliexpress', title: `${keyword} tendência importado`, cost: 32, salePrice: 89.9, shipping: 12, feesPercent: 16 },
    { source: 'shopee', title: `${keyword} nacional estoque BR`, cost: 45, salePrice: 109.9, shipping: 10, feesPercent: 18 },
    { source: 'temu', title: `${keyword} kit promoção`, cost: 28, salePrice: 79.9, shipping: 15, feesPercent: 16 },
    { source: 'tiktok_shop', title: `${keyword} viral vídeo curto`, cost: 39, salePrice: 99.9, shipping: 12, feesPercent: 15 }
  ];
}

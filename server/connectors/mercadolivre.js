import axios from 'axios';

export async function searchMercadoLivre(keyword) {
  const { data } = await axios.get('https://api.mercadolibre.com/sites/MLB/search', { params: { q: keyword, limit: 10 } });
  return (data.results || []).map(p => ({
    source: 'mercadolivre',
    id: p.id,
    title: p.title,
    salePrice: p.price,
    cost: 0,
    shipping: p.shipping?.free_shipping ? 0 : 20,
    image: p.thumbnail,
    url: p.permalink,
    feesPercent: 16
  }));
}

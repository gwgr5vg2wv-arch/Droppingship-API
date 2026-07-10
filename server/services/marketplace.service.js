import mercadoLivre from '../marketplaces/mercadoLivre.client.js';
import shopee from '../marketplaces/shopee.client.js';
import aliexpress from '../marketplaces/aliexpress.client.js';
import temu from '../marketplaces/temu.client.js';
import tiktokShop from '../marketplaces/tiktokShop.client.js';

const clients = {
  mercadoLivre,
  shopee,
  aliexpress,
  temu,
  tiktokShop
};

export function getMarketplaceClient(source = 'mock') {
  return clients[source] || null;
}

export function simulationNotice() {
  return 'Modo simulacao: integracao oficial ainda nao configurada.';
}

export function getAllMarketplaceClients() {
  return clients;
}

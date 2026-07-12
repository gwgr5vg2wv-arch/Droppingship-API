import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'data', 'db.json');

const emptyIntegration = {
  status: 'nao-conectado',
  connected: false,
  accessToken: '',
  refreshToken: '',
  expiresAt: '',
  lastSyncAt: '',
  lastError: ''
};

const defaultDb = {
  products: [],
  savedProducts: [],
  publishQueue: [],
  publications: [],
  orders: [],
  integrations: {
    mercadoLivre: { ...emptyIntegration },
    shopee: { ...emptyIntegration },
    aliexpress: { ...emptyIntegration },
    temu: { ...emptyIntegration },
    tiktokShop: { ...emptyIntegration }
  },
  trends: [],
  snapshots: [],
  systemCredentials: {},
  settings: {
    openaiEnabled: false,
    profile: {
      name: 'Admin',
      storeName: 'Minha Loja Dropshipping',
      email: 'admin@droppingship.local',
      plan: 'Starter',
      avatar: '/Droppingship/assets/img/avatar-default.svg'
    },
    minimumMargin: 25,
    defaultMarketplaceFeePercent: 14,
    minimumProfit: 20,
    automaticMode: false,
    marketplaces: {
      mercadoLivre: false,
      shopee: false,
      aliexpress: false,
      temu: false,
      tiktokShop: false
    }
  }
};

export async function readDb() {
  try {
    const raw = await fs.readFile(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return mergeDb(parsed);
  } catch {
    await writeDb(defaultDb);
    return structuredClone(defaultDb);
  }
}

export async function writeDb(data) {
  const clean = mergeDb(data);
  await fs.writeFile(dbPath, JSON.stringify(clean, null, 2));
  return clean;
}

export function makeId(prefix = 'ID') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function mergeDb(parsed = {}) {
  return {
    ...defaultDb,
    ...parsed,
    products: Array.isArray(parsed.products) ? parsed.products.filter((item) => !item?.isFallback) : [],
    savedProducts: Array.isArray(parsed.savedProducts) ? parsed.savedProducts.filter((item) => !item?.isFallback) : [],
    publishQueue: Array.isArray(parsed.publishQueue) ? parsed.publishQueue.filter((item) => item?.status !== 'nao-real') : [],
    publications: Array.isArray(parsed.publications) ? parsed.publications : [],
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    trends: Array.isArray(parsed.trends) ? parsed.trends : [],
    snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
    integrations: {
      ...defaultDb.integrations,
      ...(parsed.integrations || {})
    },
    systemCredentials: {
      ...defaultDb.systemCredentials,
      ...(parsed.systemCredentials || {})
    },
    settings: {
      ...defaultDb.settings,
      ...(parsed.settings || {}),
      profile: {
        ...defaultDb.settings.profile,
        ...(parsed.settings?.profile || {})
      },
      marketplaces: {
        ...defaultDb.settings.marketplaces,
        ...(parsed.settings?.marketplaces || {})
      }
    }
  };
}

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'data', 'db.json');

const defaultDb = {
  products: [],
  savedProducts: [],
  publishQueue: [],
  orders: [],
  integrations: {
    mercadoLivre: { status: 'mock', connected: false, accessToken: '', refreshToken: '', expiresAt: '', lastSyncAt: '', lastError: '' },
    shopee: { status: 'mock', connected: false, accessToken: '', refreshToken: '', expiresAt: '', lastSyncAt: '', lastError: '' },
    aliexpress: { status: 'mock', connected: false, accessToken: '', refreshToken: '', expiresAt: '', lastSyncAt: '', lastError: '' },
    temu: { status: 'mock', connected: false, accessToken: '', refreshToken: '', expiresAt: '', lastSyncAt: '', lastError: '' },
    tiktokShop: { status: 'mock', connected: false, accessToken: '', refreshToken: '', expiresAt: '', lastSyncAt: '', lastError: '' }
  },
  trends: [],
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
    return {
      ...defaultDb,
      ...parsed,
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
  } catch {
    await writeDb(defaultDb);
    return defaultDb;
  }
}

export async function writeDb(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
  return data;
}

export function makeId(prefix = 'ID') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

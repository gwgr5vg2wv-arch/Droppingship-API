import { getAiStatus } from '../services/ai.service.js';
import { getIntegrationMode, getTrendsMode } from '../services/integrationMode.service.js';
import { readDb, writeDb } from '../services/mockData.service.js';

export async function getSettings(req, res, next) {
  try {
    const db = await readDb();
    res.json({
      ...db.settings,
      integrationMode: getIntegrationMode(),
      trendsMode: getTrendsMode(),
      openaiStatus: getAiStatus(),
      tokenStatus: {
        mercadoLivre: db.settings.marketplaces.mercadoLivre,
        shopee: db.settings.marketplaces.shopee,
        aliexpress: db.settings.marketplaces.aliexpress,
        temu: db.settings.marketplaces.temu,
        tiktokShop: db.settings.marketplaces.tiktokShop
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function saveSettings(req, res, next) {
  try {
    const db = await readDb();
    db.settings = {
      ...db.settings,
      ...req.body,
      profile: {
        ...db.settings.profile,
        ...(req.body.profile || {})
      },
      marketplaces: {
        ...db.settings.marketplaces,
        ...(req.body.marketplaces || {})
      }
    };
    await writeDb(db);
    res.json({ settings: db.settings });
  } catch (error) {
    next(error);
  }
}

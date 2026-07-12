import axios from 'axios';
import { saveDebugInfo, getDebugInfo } from '../services/debug.service.js';

const DEFAULT_TIMEOUT = 10000;

export async function checkNetwork(req, res, next) {
  const url = 'https://www.google.com/generate_204';
  const start = Date.now();

  try {
    const response = await axios.get(url, { timeout: DEFAULT_TIMEOUT, validateStatus: () => true });
    const elapsed = Date.now() - start;
    saveDebugInfo({ lastUrl: url, lastError: '', lastResponseTimeMs: elapsed, lastRequestAt: new Date().toISOString(), lastMode: 'real' });
    return res.json({ online: response.status < 400, status: response.status, responseTimeMs: elapsed, url });
  } catch (error) {
    const elapsed = Date.now() - start;
    saveDebugInfo({ lastUrl: url, lastError: error.message, lastResponseTimeMs: elapsed, lastRequestAt: new Date().toISOString(), lastMode: 'real' });
    return res.status(502).json({ online: false, status: error.response?.status || 502, error: error.message, responseTimeMs: elapsed, url });
  }
}

export async function checkMercadoLivre(req, res, next) {
  const url = 'https://api.mercadolibre.com/sites/MLB/search?q=iphone&limit=2';
  const start = Date.now();

  try {
    const response = await axios.get(url, { timeout: DEFAULT_TIMEOUT });
    const elapsed = Date.now() - start;
    saveDebugInfo({ lastUrl: url, lastError: '', lastResponseTimeMs: elapsed, lastRequestAt: new Date().toISOString(), lastResultCount: response.data?.results?.length || 0, lastMode: 'real' });
    return res.json({ online: true, status: response.status, responseTimeMs: elapsed, url, raw: response.data });
  } catch (error) {
    const elapsed = Date.now() - start;
    saveDebugInfo({ lastUrl: url, lastError: error.message, lastResponseTimeMs: elapsed, lastRequestAt: new Date().toISOString(), lastMode: 'real' });
    return res.status(502).json({ online: false, status: error.response?.status || 502, error: error.message, responseTimeMs: elapsed, url });
  }
}

export function getLastDebugInfo(req, res) {
  return res.json(getDebugInfo());
}


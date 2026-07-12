import {
  getSetupStatus,
  getSystemCredentials as getCredentials,
  saveSystemCredentials as saveCredentials,
  testMercadoLivreConnection
} from '../services/systemCredentials.service.js';

export async function getSystemCredentials(req, res, next) {
  try {
    const credentials = await getCredentials();
    res.json({ credentials });
  } catch (error) {
    next(error);
  }
}

export async function saveSystemCredentials(req, res, next) {
  try {
    await saveCredentials(req.body);
    const status = await getSetupStatus();
    res.json({ status });
  } catch (error) {
    next(error);
  }
}

export async function getSystemCredentialsStatus(req, res, next) {
  try {
    const status = await getSetupStatus();
    res.json({ status });
  } catch (error) {
    next(error);
  }
}

export async function testMercadoLivre(req, res, next) {
  try {
    const result = await testMercadoLivreConnection();
    res.json(result);
  } catch (error) {
    const status = error?.response?.status;
    const message = status === 403
      ? 'Mercado Livre bloqueou a busca publica neste ambiente. Conecte OAuth/token para busca real autenticada.'
      : error.message || 'Falha ao testar Mercado Livre.';
    res.status(error.status || 502).json({ ok: false, error: message });
  }
}

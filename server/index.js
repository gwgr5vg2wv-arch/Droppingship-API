import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import botRoutes from './routes/bot.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import productsRoutes from './routes/products.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import financeRoutes from './routes/finance.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import integrationsRoutes from './routes/integrations.routes.js';
import trendsRoutes from './routes/trends.routes.js';
import systemCredentialsRoutes from './routes/systemCredentials.routes.js';
import { initializeSystemCredentials } from './services/systemCredentials.service.js';

const app = express();
const port = process.env.PORT || 3000;
const localApiBase = '/Droppingship/api';
const productionApiBase = '/drop/Droppingship/api';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

await initializeSystemCredentials();

const apiRoutes = express.Router();

function healthHandler(req, res) {
  res.json({
    ok: true,
    service: 'Droppingship API',
    mode: process.env.INTEGRATION_MODE || 'mock',
    timestamp: new Date().toISOString()
  });
}

app.get('/Droppingship/health', (req, res) => {
  res.json({ ok: true, service: 'Droppingship API', compatibility: true });
});

app.get(`${productionApiBase}/health`, healthHandler);
app.get(`${localApiBase}/health`, healthHandler);

apiRoutes.use('/dashboard', dashboardRoutes);
apiRoutes.use('/bot', botRoutes);
apiRoutes.use('/products', productsRoutes);
apiRoutes.use('/orders', ordersRoutes);
apiRoutes.use('/finance', financeRoutes);
apiRoutes.use('/settings', settingsRoutes);
apiRoutes.use('/integrations', integrationsRoutes);
apiRoutes.use('/trends', trendsRoutes);
apiRoutes.use('/system-credentials', systemCredentialsRoutes);

app.use(productionApiBase, apiRoutes);
app.use(localApiBase, apiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada' });
});

app.use((error, req, res, next) => {
  console.error('Erro interno da API:', error.message);
  res.status(500).json({ error: 'Erro interno da API', details: error.message });
});

app.listen(port, () => {
  console.log(`Droppingship API rodando em http://localhost:${port}${localApiBase}`);
  console.log(`Droppingship API producao pronta em ${productionApiBase}`);
});

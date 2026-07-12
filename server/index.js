import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { applySecurity, corsOptions } from './middlewares/security.middleware.js';
import botRoutes from './routes/bot.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import productsRoutes from './routes/products.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import financeRoutes from './routes/finance.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import integrationsRoutes from './routes/integrations.routes.js';
import trendsRoutes from './routes/trends.routes.js';
import systemCredentialsRoutes from './routes/systemCredentials.routes.js';
import debugRoutes from './routes/debug.routes.js';
import searchRoutes from './routes/search.routes.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import workspacesRoutes from './routes/workspaces.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSystemCredentials } from './services/systemCredentials.service.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const port = env.PORT;
const localApiBase = '/Droppingship/api';
const productionApiBase = '/drop/Droppingship/api';

applySecurity(app);
app.use(cors(corsOptions()));
app.use(express.json({ limit: '1mb' }));

// Permite rodar painel e API juntos com `npm start`.
app.use('/Droppingship', express.static(publicDir));
app.use('/drop/Droppingship/public', express.static(publicDir));
app.get('/', (req, res) => res.redirect('/Droppingship/bot.html'));
app.get('/drop/Droppingship', (req, res) => res.redirect('/drop/Droppingship/public/bot.html'));

await initializeSystemCredentials();

const apiRoutes = express.Router();

app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/Droppingship/health', healthRoutes);
app.use(`${productionApiBase}/health`, healthRoutes);
app.use(`${localApiBase}/health`, healthRoutes);

apiRoutes.use('/dashboard', dashboardRoutes);
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', usersRoutes);
apiRoutes.use('/workspaces', workspacesRoutes);
apiRoutes.use('/bot', botRoutes);
apiRoutes.use('/products', productsRoutes);
apiRoutes.use('/orders', ordersRoutes);
apiRoutes.use('/finance', financeRoutes);
apiRoutes.use('/settings', settingsRoutes);
apiRoutes.use('/integrations', integrationsRoutes);
apiRoutes.use('/trends', trendsRoutes);
apiRoutes.use('/system-credentials', systemCredentialsRoutes);
apiRoutes.use('/debug', debugRoutes);
apiRoutes.use('/search', searchRoutes);

app.use(productionApiBase, apiRoutes);
app.use(localApiBase, apiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada' });
});

app.use((error, req, res, next) => {
  console.error('Erro interno da API:', error.message);
  res.status(500).json({ error: 'Erro interno da API' });
});

app.listen(port, () => {
  console.log(`Droppingship API rodando em http://localhost:${port}${localApiBase}`);
  console.log(`Droppingship API producao pronta em ${productionApiBase}`);
});

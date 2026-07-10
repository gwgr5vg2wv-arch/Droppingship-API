import { Router } from 'express';
import { addToPublishQueue, listProducts, publicSearchProducts, publishProduct, saveProduct, searchRealProducts, simulatePublication } from '../controllers/products.controller.js';

const router = Router();

router.get('/', listProducts);
router.post('/save', saveProduct);
router.post('/publish-queue', addToPublishQueue);
router.post('/publish-queue/simulate', simulatePublication);
router.post('/public-search', publicSearchProducts);
router.post('/search-real', searchRealProducts);
router.post('/publish', publishProduct);

export default router;

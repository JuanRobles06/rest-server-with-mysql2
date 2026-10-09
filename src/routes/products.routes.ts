import { Router } from 'express';
import { ProductController } from '../controllers/products.controller';

const router = Router();

router.get('/getAll', ProductController.getAll);
router.get('/getById/:id', ProductController.getById);
router.post('/create', ProductController.create);
router.put('/update/:id', ProductController.update);
router.delete('/delete/:id', ProductController.deleteLogic);
router.patch('/change-price/:id', ProductController.changePrice);

export default router;
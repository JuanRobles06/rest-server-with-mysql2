import { Request, Response, NextFunction } from 'express';
import { pool } from '../conf/dbConnection';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface IProduct extends RowDataPacket {
  id: number;
  name: string;
  price: number;
  stock: number;
  description: string;
  brand: string | null;
  img: string | null;
  active: number; // o boolean dependiendo de la configuración de mysql2
}

export class ProductController {
  
  // GET /getAll
  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { active } = req.query;
      let query = 'SELECT * FROM products WHERE active = 1';

      if (active !== undefined) {
        if (typeof active !== 'string' || active.toLowerCase() !== 'true') {
          res.status(400).json({ ok: false, message: 'Query param active inválido. Solo se acepta "true"' });
          return;
        }
      }

      const [rows] = await pool.query<IProduct[]>(query);
      res.status(200).json({ ok: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  // GET /getById/:id
  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ ok: false, message: 'ID inválido, debe ser un entero positivo' });
        return;
      }

      const [rows] = await pool.query<IProduct[]>(
        'SELECT * FROM products WHERE id = ? AND active = 1',
        [id]
      );

      if (rows.length === 0) {
        res.status(404).json({ ok: false, message: 'Producto no encontrado o inactivo' });
        return;
      }

      res.status(200).json({ ok: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }

  // POST /create
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as unknown as Record<string, unknown>;
      const { name, price, stock, description, brand, img } = body;

      if (typeof name !== 'string' || name.trim() === '' ||
          typeof description !== 'string' || description.trim() === '' ||
          typeof price !== 'number' || !Number.isFinite(price) || price <= 0 ||
          typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
        res.status(400).json({ ok: false, message: 'Datos de entrada inválidos' });
        return;
      }

      const cleanBrand = typeof brand === 'string' ? brand : null;
      const cleanImg = typeof img === 'string' ? img : null;

      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO products (name, price, stock, description, brand, img, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [name, price, stock, description, cleanBrand, cleanImg]
      );

      res.status(201).json({ ok: true, message: 'Producto creado exitosamente', id: result.insertId });
    } catch (error) {
      next(error);
    }
  }

  // PUT /update/:id
  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ ok: false, message: 'ID inválido' });
        return;
      }

      const body = req.body as unknown as Record<string, unknown>;
      const { name, price, stock, description, brand, img } = body;

      if (typeof name !== 'string' || name.trim() === '' ||
          typeof description !== 'string' || description.trim() === '' ||
          typeof price !== 'number' || !Number.isFinite(price) || price <= 0 ||
          typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
        res.status(400).json({ ok: false, message: 'Datos de entrada inválidos' });
        return;
      }

      const cleanBrand = typeof brand === 'string' ? brand : null;
      const cleanImg = typeof img === 'string' ? img : null;

      // Verificar que el producto exista y esté activo
      const [existing] = await pool.query<IProduct[]>(
        'SELECT id FROM products WHERE id = ? AND active = 1',
        [id]
      );
      if (existing.length === 0) {
        res.status(404).json({ ok: false, message: 'Producto no encontrado o inactivo' });
        return;
      }

      await pool.query(
        'UPDATE products SET name = ?, price = ?, stock = ?, description = ?, brand = ?, img = ? WHERE id = ?',
        [name, price, stock, description, cleanBrand, cleanImg, id]
      );

      res.status(200).json({ ok: true, message: 'Producto actualizado exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /delete/:id (Baja lógica)
  public static async deleteLogic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ ok: false, message: 'ID inválido' });
        return;
      }

      const [existing] = await pool.query<IProduct[]>(
        'SELECT id FROM products WHERE id = ? AND active = 1',
        [id]
      );
      if (existing.length === 0) {
        res.status(404).json({ ok: false, message: 'Producto no encontrado o ya inactivo' });
        return;
      }

      await pool.query('UPDATE products SET active = 0 WHERE id = ?', [id]);

      res.status(200).json({ ok: true, message: 'Producto dado de baja lógicamente' });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /change-price/:id
  public static async changePrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ ok: false, message: 'ID inválido' });
        return;
      }

      const body = req.body as unknown as Record<string, unknown>;
      const keys = Object.keys(body);

      // El cuerpo debe contener solamente 'price'
      if (keys.length !== 1 || keys[0] !== 'price') {
        res.status(400).json({ ok: false, message: 'El cuerpo debe contener únicamente la propiedad "price"' });
        return;
      }

      const { price } = body;
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        res.status(400).json({ ok: false, message: 'Precio inválido' });
        return;
      }

      const [existing] = await pool.query<IProduct[]>(
        'SELECT id FROM products WHERE id = ? AND active = 1',
        [id]
      );
      if (existing.length === 0) {
        res.status(404).json({ ok: false, message: 'Producto no encontrado o inactivo' });
        return;
      }

      await pool.query('UPDATE products SET price = ? WHERE id = ?', [price, id]);

      res.status(200).json({ ok: true, message: 'Precio actualizado exitosamente' });
    } catch (error) {
      next(error);
    }
  }
}
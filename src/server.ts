import express, { Application, Request, Response, NextFunction } from 'express';
import router from './routes';

export class Server {
  private app: Application;
  private port: string | number;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.middlewares();
    this.routes();
    this.errorHandler();
  }

  private middlewares(): void {
    this.app.use(express.json());
  }

  private routes(): void {
    this.app.use('/api/v1', router);
  }

  private errorHandler(): void {
    // Middleware global de manejo de errores (sin exponer detalles internos)
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error interno del servidor:', err.message);
      res.status(500).json({
        ok: false,
        message: 'Ocurrió un error interno en el servidor',
      });
    });
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`Servidor corriendo en el puerto ${this.port}`);
    });
  }
}
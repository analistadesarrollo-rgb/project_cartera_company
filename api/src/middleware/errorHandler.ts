import { Request, Response, NextFunction } from 'express';

/**
 * Middleware centralizado para manejo de errores.
 * Evita exponer stack traces en producción.
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error('[Error]', {
        message: err.message,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
    });

    // No exponer detalles del error en producción
    res.status(500).json({
        message: 'Error interno del servidor',
        // Solo incluir mensaje en desarrollo
        ...(process.env.NODE_ENV === 'development' && { error: err.message }),
    });
};

/**
 * Middleware para manejar rutas no encontradas
 */
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        message: 'Ruta no encontrada',
        path: req.path,
    });
};

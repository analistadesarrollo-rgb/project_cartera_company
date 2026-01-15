import { Request, Response, NextFunction } from 'express';

/**
 * Middleware que garantiza que todas las solicitudes HTTP reciban una respuesta
 * dentro del tiempo límite especificado.
 * 
 * Esto previene que solicitudes se queden colgadas indefinidamente cuando
 * las consultas a Oracle fallan silenciosamente o no responden.
 */
export const requestTimeout = (timeoutMs: number = 90000) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Solo aplicar timeout a rutas de API que pueden colgarse
        if (!req.path.includes('/report') && !req.path.includes('/cartera')) {
            return next();
        }

        let timeoutFired = false;

        const timeout = setTimeout(() => {
            timeoutFired = true;
            if (!res.headersSent) {
                console.error(`[Timeout] Request timeout después de ${timeoutMs}ms: ${req.method} ${req.path}`);
                res.status(504).json({
                    message: 'La solicitud excedió el tiempo máximo permitido',
                    path: req.path,
                    timeout: `${timeoutMs / 1000}s`,
                });
            }
        }, timeoutMs);

        // Limpiar timeout cuando la respuesta termine
        res.on('finish', () => {
            if (!timeoutFired) {
                clearTimeout(timeout);
            }
        });

        res.on('close', () => {
            clearTimeout(timeout);
        });

        next();
    };
};

/**
 * Timeout específico para rutas de Oracle que son más propensas a colgarse.
 * Usa un timeout más corto (70s) para dar margen al timeout de la query (60s).
 */
export const oracleRouteTimeout = requestTimeout(70000);

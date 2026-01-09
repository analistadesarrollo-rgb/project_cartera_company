import { DB_HOST, DB_NAME, DB_PASS, DB_PORT, DB_USER } from '../config';
import { Sequelize } from 'sequelize';

const conection = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  timezone: '-05:00',
  logging: false,
  pool: {
    max: 10,           // Máximo conexiones simultáneas
    min: 2,            // Mínimo conexiones activas
    acquire: 30000,    // Tiempo máximo para adquirir conexión (30s)
    idle: 10000,       // Tiempo máximo inactivo antes de liberar (10s)
  },
  retry: {
    max: 3,            // Reintentar hasta 3 veces en caso de error
  },
  dialectOptions: {
    connectTimeout: 10000,  // Timeout de conexión (10s)
  }
});

// Verificar conexión al iniciar
conection.authenticate()
  .then(() => console.log('[MySQL] Conexión establecida exitosamente'))
  .catch((err) => console.error('[MySQL] Error de conexión:', err));

export { conection };

import { sequelize } from '../src/config/database';
import { Settings } from '../src/modules/system/models/settings.model';
import fs from 'fs';
import path from 'path';

async function syncVersion() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const version = pkg.version;
    const releaseName = process.argv[2] || 'Automated Release';

    console.log(`🚀 Sincronizando versión ${version} (${releaseName}) con la base de datos...`);

    await sequelize.authenticate();
    
    // Asegurar que la columna existe (ejecutando el SQL)
    const sqlPath = path.join(process.cwd(), 'scripts', '20260501_add_metadata_to_settings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await sequelize.query(sql);

    // Actualizar la versión específica
    const entityId = process.env.PROTECTED_ENTITY_ID || '2e4ac41d-d4cd-43e4-823d-1e60c64515a3';
    
    await Settings.update({
      meta_data: {
        version,
        release: releaseName,
        updated_at: new Date().toISOString()
      }
    }, {
      where: { entity_id: entityId }
    });

    console.log('✅ Base de datos sincronizada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
    process.exit(1);
  }
}

syncVersion();

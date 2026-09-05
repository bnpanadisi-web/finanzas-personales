const { execSync } = require('child_process');

console.log('🚀 [1/2] Compilando aplicación estática (Next.js SSG)...');
try {
  execSync('npx next build', {
    stdio: 'inherit',
    env: { ...process.env, BUILD_MOBILE: 'true' },
  });
  console.log('✅ Exportación estática generada en la carpeta "out".');
} catch (e) {
  console.error('❌ Error al compilar Next.js:', e);
  process.exit(1);
}

console.log('📱 [2/2] Sincronizando assets nativos con Capacitor Android...');
try {
  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log('🎉 ¡Sincronización completada con éxito!');
  console.log('📁 Tu proyecto nativo Android está listo en la carpeta "android/".');
  console.log('👉 Puedes abrirlo en Android Studio con: npm run cap:open');
} catch (e) {
  console.error('❌ Error al sincronizar con Capacitor:', e);
  process.exit(1);
}

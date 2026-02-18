import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';
import { VitePWA } from 'vite-plugin-pwa';
import { generateTwigTemplate } from './vite/vite-plugins';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const devHost = env.VITE_DEV_HOST || '0.0.0.0';
  const devPort = Number(env.VITE_DEV_PORT || 5173);
  const appBase = '/app/dist/';
  const devPublicUrl = env.VITE_DEV_PUBLIC_URL || '';
  const devPublicHttps =
    env.VITE_DEV_PUBLIC_HTTPS === 'true' || devPublicUrl.startsWith('https://');
  const hmrHost =
    env.VITE_DEV_HMR_HOST ||
    env.VITE_DEV_PUBLIC_HOST ||
    env.VITE_DEV_HOST ||
    'localhost';
  const hmrPort = Number(env.VITE_DEV_HMR_PORT || env.VITE_DEV_PORT || 5173);
  const devHttps = env.VITE_DEV_HTTPS === 'true';
  const hmrProtocol =
    env.VITE_DEV_HMR_PROTOCOL || (devHttps || devPublicHttps ? 'wss' : 'ws');
  const devHttpsKey = env.VITE_DEV_HTTPS_KEY || '';
  const devHttpsCert = env.VITE_DEV_HTTPS_CERT || '';
  const devHttpsCa = env.VITE_DEV_HTTPS_CA || '';

  const httpsConfig =
    devHttps && devHttpsKey && devHttpsCert
      ? {
          key: fs.readFileSync(devHttpsKey),
          cert: fs.readFileSync(devHttpsCert),
          ca: devHttpsCa ? fs.readFileSync(devHttpsCa) : undefined,
        }
      : undefined;

  return {
    base: appBase,
    server: {
      host: devHost,
      port: devPort,
      strictPort: true,
      https: httpsConfig,
      origin: env.VITE_DEV_ORIGIN || devPublicUrl || undefined,
      hmr: {
        host: hmrHost,
        port: hmrPort,
        protocol: hmrProtocol,
        clientPort: hmrPort,
      },
    },
    resolve: {
      alias: {
        '@src': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
      },
    },
    css: {
      modules: {
        generateScopedName: (className, filePath) => {
          const fileName = path.basename(filePath, '.module.css');
          const hash = crypto
            .createHash('sha256')
            .update(fileName.concat(className))
            .digest('hex')
            .substring(0, 5);
          return `${fileName}__${className}__${hash}`;
        },
      },
    },
    // build: {
    //   outDir: 'public/dist',
    //   manifest: true
    // },
    plugins: [
      react(),
      checker({
        typescript: true,
      }),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,

        pwaAssets: {
          disabled: false,
          config: true,
        },

        manifest: {
          name: 'cookbook',
          scope: appBase,
          start_url: appBase,
          short_name: 'cookbook',
          description: 'cookbook',
          theme_color: '#ffffff',
        },

        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
        },

        devOptions: {
          enabled: false,
          navigateFallback: 'index.html',
          suppressWarnings: true,
          type: 'module',
        },
      }),
      devHttps && !httpsConfig
        ? basicSsl({
            /** name of certification */
            name: 'test',
            /** custom trust domains */
            domains: ['*.localhost', 'localhost'],
            /** custom certification directory */
            certDir: '/home/feuf/ssl-certs',
          })
        : undefined,
      generateTwigTemplate(),
    ].filter(Boolean),
  };
});

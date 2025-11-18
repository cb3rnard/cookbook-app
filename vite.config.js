import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { generateTwigTemplate } from './vite/vite-plugins';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/app/dist',
	server: {
		https: true, // same as "--https" flag
		host: true, // same as "--host" flag
	},
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components')
    }
  },
  css: {
    modules: {
      generateScopedName: (className, filePath) => {
        const fileName = path.basename(filePath, '.module.css')
        const hash = crypto
          .createHash('sha256')
          .update(fileName.concat(className))
          .digest('hex')
          .substring(0, 5)
        return `${fileName}__${className}__${hash}`
      },
    }
  },
  // build: {
  //   outDir: 'public/dist',
  //   manifest: true
  // },
  plugins: [
    react(),
    VitePWA({
    registerType: 'prompt',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'cookbook',
      scope: '/app/dist',
      start_url: '/app/dist',
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
    basicSsl({
      /** name of certification */
      name: 'test',
      /** custom trust domains */
      domains: ['*.localhost', 'localhost'],
      /** custom certification directory */
      certDir: '/home/feuf/ssl-certs',
    }),
    generateTwigTemplate(),
  ],
    
})
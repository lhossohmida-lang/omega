// =============================================================================
//  OMEGA — PWABuilder APK Generator
// =============================================================================
//  Uses pwabuilder.com API to build an Android APK from the deployed PWA URL.
//  Run this after deploying to Vercel.
//
//  Usage:
//    node generate-apk.mjs <your-vercel-url>
//  Example:
//    node generate-apk.mjs https://omega-gules-nine.vercel.app
//
//  Output:
//    ./apk/omega-app.apk
//    ./public/omega-app.apk
//    ./dist/omega-app.apk
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_URL = process.argv[2] || 'https://omega-gules-nine.vercel.app';

console.log(`\n🚀 Building APK for: ${SITE_URL}\n`);

// PWABuilder API endpoint
const PWABUILDER_API = 'https://pwabuilder-api.azurewebsites.net/api/package';

const payload = JSON.stringify({
  siteUrl: SITE_URL,
  packageId: 'com.omega.pos',
  name: 'OMEGA',
  launcherName: 'أوميغا',
  themeColor: '#ff6b00',
  backgroundColor: '#f8f9fa',
  display: 'standalone',
  orientation: 'portrait',
  startUrl: '/?launch=kiosk',
  iconUrl: `${SITE_URL}/logo.png`,
  maskableIconUrl: `${SITE_URL}/logo.png`,
  versionCode: 1,
  versionName: '1.0.0',
  signingMode: 'none', // debug signing
  platform: 'androidapk'
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function buildAPK() {
  try {
    // Ensure output directories exist
    const apkDir     = path.join(__dirname, 'apk');
    const publicApk  = path.join(__dirname, 'public');
    const distApk    = path.join(__dirname, 'dist');
    fs.mkdirSync(apkDir,    { recursive: true });
    fs.mkdirSync(publicApk, { recursive: true });
    fs.mkdirSync(distApk,   { recursive: true });

    console.log('📡 Sending request to PWABuilder API...');

    const response = await fetch(PWABUILDER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const downloadUrl = data.uri || data.url || data.downloadUrl;

    if (!downloadUrl) {
      console.log('API Response:', JSON.stringify(data, null, 2));
      throw new Error('No download URL in response');
    }

    console.log(`✅ APK ready! Downloading from: ${downloadUrl}`);

    const apkPath       = path.join(apkDir,    'omega-app.apk');
    const publicApkPath = path.join(publicApk, 'omega-app.apk');
    const distApkPath   = path.join(distApk,   'omega-app.apk');

    await downloadFile(downloadUrl, apkPath);
    fs.copyFileSync(apkPath, publicApkPath);
    fs.copyFileSync(apkPath, distApkPath);

    const size = (fs.statSync(apkPath).size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ APK saved! (${size} MB)`);
    console.log(`   → ${apkPath}`);
    console.log(`   → ${publicApkPath}`);
    console.log(`   → ${distApkPath}`);
    console.log('\n🎉 Done! Users can now download the APK from the app.\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.log('\n💡 Alternative: Visit https://www.pwabuilder.com and enter your site URL');
    console.log('   to manually build and download the APK, then place it in ./apk/\n');
    process.exit(1);
  }
}

buildAPK();

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = message => {
  throw new Error(message);
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

const pkg = JSON.parse(read('package.json'));
const app = JSON.parse(read('app.json'));
const manifest = read('manifest.toml');
const config = read('src/config.ts');
const appSource = read('src/App.tsx');
const playerCompatSource = read('src/injected/playerCompat.ts');
const pointerModeSource = read('src/remote/useWebPointerMode.ts');
const homeSource = read('src/ui/BrowserHome.tsx');

const expected = {
  packageId: 'com.kaylanetv.browser',
  componentId: 'com.kaylanetv.browser.main',
  runtime: '/com.amazon.kepler.runtime.react_native_kepler_4@IReactNativeKepler_0',
};

expect(pkg.engines?.node === '>=22.14.0', 'Node engine must stay >=22.14.0 for Vega SDK 0.24 / RN 0.83.');
expect(pkg.dependencies?.react === '19.2.0', 'React must stay on 19.2.0.');
expect(pkg.dependencies?.['react-native'] === '0.83.0', 'React Native must stay on 0.83.0.');
expect(pkg.dependencies?.['@amazon-devices/react-native-kepler'] === '~4.0.0+rn0.83.0', 'react-native-kepler must stay on the RN 0.83 Vega line.');
const webViewVersionSpec = pkg.dependencies?.['@amazon-devices/webview'];
expect(
  typeof webViewVersionSpec === 'string' &&
    /^~?4\.0(?:\.\d+)?$/.test(webViewVersionSpec),
  'Vega WebView must stay on the SDK-resolved 4.0 compatibility line.',
);
expect(pkg.devDependencies?.['@amazon-devices/kepler-cli-platform'] === '~0.22.0', 'kepler-cli-platform must stay on the current Vega SDK line.');
expect(pkg.devDependencies?.['@amazon-devices/keplerscript-commonmodules'] === '~1.0.0', 'RN 0.83 common modules bundle dependency is required.');
expect(pkg.devDependencies?.['@babel/core'] === '^7.25.2', 'RN 0.83 Babel core dependency drifted.');
expect(pkg.devDependencies?.['@babel/preset-env'] === '^7.25.3', 'RN 0.83 Babel preset dependency drifted.');
expect(pkg.devDependencies?.['@babel/runtime'] === '^7.25.0', 'RN 0.83 Babel runtime dependency drifted.');
expect(pkg.devDependencies?.['@react-native-community/cli'] === '^20.0.0', 'React Native community CLI must remain installed for Vega build command registration.');
expect(pkg.scripts?.build === 'react-native build-vega', 'Default build must use react-native build-vega.');
expect(pkg.scripts?.['build:debug'] === 'react-native build-vega --build-type Debug', 'Debug build script drifted.');
expect(pkg.scripts?.['build:release'] === 'react-native build-vega --build-type Release', 'Release build script drifted.');
expect(app.name === expected.componentId, 'app.json name must match the interactive component id.');

for (const fragment of [
  'schema-version = 1',
  `id = "${expected.packageId}"`,
  `id = "${expected.componentId}"`,
  `runtime-module = "${expected.runtime}"`,
  'min = "1.2"',
  'target = "1.2"',
  'icon = "@image/kaylane-tv.png"',
  '"com.amazon.category.main"',
  '"com.amazon.category.kepler.media"',
  'id = "com.amazon.webview.renderer_service"',
  'id = "com.amazon.inputmethod.service"',
  'id = "com.amazon.inputd.service"',
  'id = "com.amazon.network.service"',
  'id = "com.amazon.media.server"',
  'id = "com.amazon.media.playersession.service"',
  'id = "com.amazon.mediabuffer.service"',
  'id = "com.amazon.mediatransform.service"',
  'id = "com.amazon.audio.stream"',
  'id = "com.amazon.audio.control"',
  'id = "com.amazon.audio.system"',
  'id = "com.amazon.gipc.uuid.*"',
  'id = "com.amazon.devconf.privilege.accessibility"',
  'id = "/com.amazon.vega.os@IVega_1_2"',
  'key = "interface.provider"',
  `component-id = "${expected.componentId}"`,
  'interface_name = "com.amazon.kepler.media.IMediaPlaybackServer"',
  '"SkipForward"',
  '"SkipBackward"',
]) {
  expect(manifest.includes(fragment), `manifest.toml is missing required fragment: ${fragment}`);
}
expect(!manifest.includes('network-traffic-policy.cleartext'), 'Cleartext HTTP policy must remain absent.');

const configuredUrls = [...config.matchAll(/https:\/\/[^'"\s,]+/g)].map(match => match[0]);
expect(configuredUrls.length >= 3, 'Expected home URL and supported HTTPS origins in config.');
for (const value of configuredUrls) {
  const parsed = new URL(value);
  expect(parsed.protocol === 'https:', `Configured URL is not HTTPS: ${value}`);
}

expect(appSource.includes('mixedContentMode="never"'), 'WebView mixed content must explicitly remain disabled.');
expect(appSource.includes('allowJavaScriptInBackground={false}'), 'Background JavaScript must remain disabled.');
expect(appSource.includes('domStorageEnabled={true}'), 'DOM storage must remain enabled for normal browsing.');
expect(appSource.includes('allowsDefaultMediaControl={true}'), 'Default WebView media controls must remain enabled.');
expect(appSource.includes('thirdPartyCookiesEnabled={true}'), 'Third-party cookies must remain enabled for embedded-player compatibility.');
expect(appSource.includes('mediaPlaybackRequiresUserAction={false}'), 'HTML5 media compatibility mode must allow playback without an additional WebView gesture gate.');
expect(appSource.includes('createPlayerCompatibilityScript'), 'Player compatibility bootstrap must remain installed.');
expect(appSource.includes('FocusManager.focus'), 'Pointer mode must move native TV focus away from WebView/player controls.');
expect(appSource.includes('pointerInputCapture'), 'Pointer mode must keep a native focus-capture layer over the WebView.');
expect(appSource.includes('<Pressable'), 'Pointer focus capture must be a native Pressable so OK works on Vega TV.');
expect(appSource.includes('delayLongPress={700}'), 'Pointer Pressable must preserve the 700 ms long-OK mode switch.');
expect(appSource.includes('activatePointer()'), 'Short OK on the pointer capture must activate the DOM pointer target.');
expect(
  !pointerModeSource.includes('addUserInputListenerCallback(\n        UserInputEventName.Select'),
  'Pointer mode must not override Select through UserInputManager because that suppresses native Pressable OK handling.',
);
expect(playerCompatSource.includes('disableRemotePlayback = true'), 'Player compatibility must disable unsupported remote playback surfaces.');
expect(!playerCompatSource.includes('setInterval('), 'Player compatibility must not use permanent polling.');
expect(appSource.includes('callback.cancel();'), 'SSL error handler must explicitly fail closed.');
expect(appSource.includes('if (__DEV__)'), 'WebView diagnostics must stay development-only.');

const png = fs.readFileSync(path.join(root, 'assets/image/kaylane-tv.png'));
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
expect(png.subarray(0, 8).equals(pngSignature), 'App icon must be a PNG.');
expect(png.readUInt32BE(16) === 512 && png.readUInt32BE(20) === 512, 'App icon must be exactly 512x512.');

expect(
  homeSource.includes(
    'https://dofuz.com/xoitsomxvna96/home/dofuz',
  ),
  'Dofuz home card must use the validated direct route.',
);
expect(
  homeSource.includes('KAYLANE_SLIDES'),
  'Kaylane home must use individual slideshow photos instead of the broken collage.',
);
expect(homeSource.includes('#TEAMDEFEUX'), 'Kaylane home must show #TEAMDEFEUX.');
expect(
  homeSource.includes('Je suis fucking fier de toi.'),
  'Kaylane home must show the requested pride message.',
);

console.log('Static Vega/native validation passed.');

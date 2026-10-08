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
const pageGuardSource = read('src/injected/pageGuard.ts');
const backHandlerSource = read('src/remote/useBrowserBackHandler.ts');
const browserOptionsSource = read('src/ui/BrowserOptions.tsx');

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
expect(
  !appSource.includes('delayLongPress={700}') &&
    !appSource.includes('onLongPress='),
  'Pointer/selection switching must be menu-only; long-OK switching must stay removed.',
);
expect(appSource.includes('onPress={activatePointer}'), 'Short OK on the pointer capture must activate the DOM pointer target.');
expect(
  !appSource.includes('kaylane-pointer-native-activation'),
  'Embedded surfaces must not auto-switch pointer mode anymore.',
);
expect(
  !browserOptionsSource.includes('Interaction lecteur / vérification'),
  'Browser menu must use the single pointer/selection toggle instead of a second interaction mode.',
);
expect(
  browserOptionsSource.includes('Passer en mode sélection'),
  'Browser options must expose pointer-to-selection switching.',
);
expect(
  browserOptionsSource.includes('Passer en mode pointeur'),
  'Browser options must expose selection-to-pointer switching.',
);
expect(
  browserOptionsSource.includes('Fermer toutes les fenêtres') &&
    browserOptionsSource.includes('onClosePopups'),
  'Browser options must expose the manual close-all-popups recovery action.',
);
expect(
  browserOptionsSource.includes('Supprimer élément : ON') &&
    browserOptionsSource.includes('Supprimer élément : OFF') &&
    browserOptionsSource.includes('onToggleElementDeleteMode'),
  'Browser options must expose an explicit delete-element ON/OFF toggle.',
);
expect(
  appSource.includes('elementDeleteMode') &&
    appSource.includes('syncElementDeleteMode') &&
    appSource.includes('setDeleteMode'),
  'Native app state must keep delete-element mode synchronized with the page pointer.',
);
expect(
  browserOptionsSource.includes("width: '49%'") &&
    browserOptionsSource.includes("flexWrap: 'wrap'"),
  'Browser options must stay in a compact two-column TV-safe grid.',
);
expect(
  appSource.includes('inputEnabled:'),
  'Pointer mode must preserve state while temporarily disabling browser input for overlays.',
);
expect(
  !pointerModeSource.includes('UserInputEventName.Select'),
  'Pointer/selection mode switching must not be tied to Select/hold logic.',
);
expect(
  backHandlerSource.includes('UserInputEventName.Back'),
  'Browser Back must override the platform Back route while browsing.',
);
expect(
  appSource.includes("window.history && window.history.length > 1") &&
    appSource.includes("kaylane-browser-history-empty"),
  'Browser Back must consult DOM history before returning to Kaylane home.',
);
expect(
  backHandlerSource.includes("if (controller.isAtHome)"),
  'Back override must be released on Kaylane TV home so system behavior is not globally replaced.',
);
expect(
  pageGuardSource.includes('function isLikelyAdOverlay(node)'),
  'Navigation guard must remove large same-tab ad overlays.',
);
expect(
  pageGuardSource.includes('__KAYLANE_TV_GUARD_API__') &&
    pageGuardSource.includes('allowPlayerNavigation'),
  'Navigation guard must expose one-shot promoted-player navigation.',
);
expect(
  pageGuardSource.includes('function closePopupAt(clientX, clientY)') &&
    pageGuardSource.includes('function dismissPopupFrameAt(clientX, clientY, forceCloseCorner)') &&
    pageGuardSource.includes('function closeAllPopups()') &&
    pageGuardSource.includes('function deleteElementAt(clientX, clientY)') &&
    pageGuardSource.includes('function isProtectedMediaDeletionTarget(node)') &&
    pageGuardSource.includes('deleteElementAt: deleteElementAt') &&
    pageGuardSource.includes('closePopupAt: closePopupAt') &&
    pageGuardSource.includes('dismissPopupFrameAt: dismissPopupFrameAt') &&
    pageGuardSource.includes('closeAllPopups: closeAllPopups'),
  'Navigation guard must expose popup cleanup plus explicit media-safe element deletion.',
);
expect(
  pageGuardSource.includes('var quarantinedPopupSignatures = new Set()') &&
    pageGuardSource.includes('function rememberPopupFrame(frame)') &&
    pageGuardSource.includes('function isQuarantinedPopupFrame(frame)') &&
    pageGuardSource.includes('popupPurgeUntil'),
  'Dismissed popup iframes must be quarantined so delayed re-open attempts are removed.',
);
expect(
  pageGuardSource.includes('function isLikelyPlayerFrame(frame)') &&
    pageGuardSource.includes('ratio >= 1.35') &&
    pageGuardSource.includes('ratio <= 2.40') &&
    pageGuardSource.includes('coverage >= 0.16'),
  'Manual popup cleanup must preserve video-shaped player iframes.',
);
expect(
  appSource.includes('kaylane-popup-cleanup') &&
    appSource.includes('closeAllPopups'),
  'App menu cleanup must invoke the page popup cleaner and report completion.',
);
expect(
  appSource.includes('kaylane-player-promote') &&
    appSource.includes('promotePlayerUrl'),
  'App must route promoted embedded players through the existing WebView.',
);
expect(
  browserOptionsSource.includes('Ouvrir le lecteur'),
  'Browser options must expose the promoted-player fallback.',
);
expect(
  pageGuardSource.includes('attributeFilter: [') &&
    pageGuardSource.includes("'src'") &&
    pageGuardSource.includes("'href'") &&
    pageGuardSource.includes("'style'") &&
    pageGuardSource.includes("'class'") &&
    pageGuardSource.includes("'open'") &&
    pageGuardSource.includes("'role'") &&
    pageGuardSource.includes("'aria-modal'") &&
    pageGuardSource.includes("'aria-hidden'"),
  'Navigation guard must recheck dynamic overlay and modal state changes.',
);
expect(
  pageGuardSource.includes('visibleMediaCoverage() >= 0.20'),
  'Promoted player pages must clean large external overlays above visible media.',
);
expect(
  pageGuardSource.includes('function armPlaybackShield(durationMs)') &&
    pageGuardSource.includes('var PLAYBACK_SHIELD_MS = 20000'),
  'Playback modal shield must stay event-driven and bounded.',
);
expect(
  pageGuardSource.includes('function isLikelyPlaybackModal(node, aggressive)') &&
    pageGuardSource.includes('coverage >= 0.012') &&
    pageGuardSource.includes('aggressive === true'),
  'Playback modal shield must aggressively remove small newly-added overlays.',
);
expect(
  pageGuardSource.includes('function isSourceSelectionSurface(node)') &&
    pageGuardSource.includes("'source'") &&
    pageGuardSource.includes("'server'") &&
    pageGuardSource.includes("'serveur'") &&
    pageGuardSource.includes('!nodeHasBlockedHost(current)') &&
    pageGuardSource.includes('!nodeHasExternalEscape(current)'),
  'Primary-site source chooser surfaces must be protected from the playback shield without protecting ad/external panels.',
);
expect(
  pageGuardSource.includes("target.closest('video,audio,iframe')") &&
    pageGuardSource.includes("!isPrimaryHost(window.location.hostname)"),
  'Primary pages must arm the shield only from real media/iframe interactions, not generic player wrappers.',
);
expect(
  pageGuardSource.includes('function sweepAddedOverlayTree(root)') &&
    pageGuardSource.includes('var MAX_ADDED_NODE_SCAN = 40') &&
    pageGuardSource.includes('var MAX_ALWAYS_MODAL_SCAN = 32') &&
    pageGuardSource.includes('var MAX_MUTATION_QUEUE = 80'),
  'Modal cleanup must keep both subtree scans and mutation queues bounded.',
);
expect(
  pageGuardSource.includes('containsLargePlayerFrame(node)'),
  'Playback modal shield must preserve real large player iframes.',
);
expect(
  pageGuardSource.includes('function looksLikeVerificationModal(node)') &&
    pageGuardSource.includes("text.indexOf('scan the qr')") &&
    pageGuardSource.includes("text.indexOf('not a robot')") &&
    pageGuardSource.includes("text.indexOf('verify you')") &&
    pageGuardSource.includes("text.indexOf('human verification')"),
  'Robot/human verification overlays must be treated as blocked modals.',
);
expect(
  !pageGuardSource.includes('function isVerificationSurface(node)') &&
    !pageGuardSource.includes('function isTrustedVerificationUrl(url)'),
  'No verification modal provider may be exempt from the no-modal policy.',
);
expect(
  pageGuardSource.includes('function queueMutationNode(node)') &&
    pageGuardSource.includes('function flushMutationQueue()') &&
    pageGuardSource.includes('window.requestAnimationFrame(flushMutationQueue)'),
  'DOM mutation cleanup must be batched to avoid starving SPA rendering.',
);
expect(
  pageGuardSource.includes('if (!isPlaybackShieldActive())') &&
    pageGuardSource.includes('Keep primary pages light while they bootstrap'),
  'Deep playback scans must stay disabled while primary pages bootstrap.',
);
expect(
  pageGuardSource.includes('function installNonPrimaryModalCssShield()') &&
    pageGuardSource.includes('data-kaylane-no-modal-css') &&
    pageGuardSource.includes('window.alert = function ()') &&
    pageGuardSource.includes('window.confirm = function ()') &&
    pageGuardSource.includes('window.prompt = function ()'),
  'Modal CSS and blocking browser dialogs must stay disabled globally.',
);
expect(
  pageGuardSource.includes("'aria-modal'") &&
    pageGuardSource.includes("'aria-hidden'") &&
    pageGuardSource.includes("'open'"),
  'Playback shield must recheck dynamic modal state changes.',
);
const remotePointerSource = read('src/injected/remotePointer.ts');
expect(
  remotePointerSource.includes('var PRECISION_NUDGE = 7') &&
    remotePointerSource.includes('var PRECISION_SPEED = 120') &&
    remotePointerSource.includes('var PRECISION_HOLD_MS = 170'),
  'Pointer must keep the precision-first tap/hold movement profile.',
);
expect(
  remotePointerSource.includes('var MAX_SPEED = 650') &&
    remotePointerSource.includes('var FRICTION = 18'),
  'Pointer must keep the reduced top speed and stronger stopping friction.',
);
expect(
  remotePointerSource.includes(
    'Only promote when the iframe itself is the TOPMOST hit target',
  ) &&
    remotePointerSource.includes("hit.tagName === 'IFRAME'") &&
    remotePointerSource.includes('promoteFrame(hit)'),
  'Pointer OK may promote only a topmost iframe, never an iframe hidden under another control.',
);
expect(
  remotePointerSource.includes('var deleteMode = false') &&
    remotePointerSource.includes('function setDeleteMode(enabled, shouldAnnounce)') &&
    remotePointerSource.includes('function deleteElementAtPointer()') &&
    remotePointerSource.includes('__KAYLANE_TV_GUARD_API__.deleteElementAt') &&
    remotePointerSource.includes('if (deleteMode)'),
  'Element deletion must be explicit opt-in pointer behavior.',
);
expect(
  remotePointerSource.includes('Normal pointer mode never deletes DOM elements') &&
    !remotePointerSource.includes('function closePopupAtPointer()') &&
    !remotePointerSource.includes('function dismissTopmostPopupFrame(frame)') &&
    !remotePointerSource.includes('function isNearTopRightOfFrame(frame)'),
  'Normal pointer OK must not auto-delete page elements.',
);
expect(
  remotePointerSource.includes('function deepElementAtPointer()') &&
    remotePointerSource.includes('function interactiveTarget(target)') &&
    remotePointerSource.includes("dispatchPointerEvent(target, 'pointerdown')") &&
    remotePointerSource.includes('function toggleMedia(target)'),
  'Normal pointer OK must keep robust play/custom-control activation.',
);
expect(
  remotePointerSource.includes("cursor.style.borderColor = deleteMode ? '#ff4d5e' : '#ffffff'") &&
    remotePointerSource.includes("'Supprimer élément : ON'") &&
    remotePointerSource.includes("'Vidéo protégée'"),
  'Delete-element mode must be visually distinct and protect video targets.',
);
expect(
  remotePointerSource.includes('function promoteLargestEmbeddedPlayer()') &&
    remotePointerSource.includes('armPlaybackShield();'),
  'Player isolation must remain available explicitly through the menu/API.',
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

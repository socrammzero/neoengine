/**
 * NEOENGINE — SECURITY-GATE.JS
 * Sistema de Control de Acceso y Protección contra Distribución No Autorizada:
 *  1. Criptografía RFC 6238 (TOTP 6 dígitos / 30s) mediante Web Crypto API (`crypto.subtle`).
 *  2. Tolerancia a desfases horarios de ±1 paso (±30s = 90s de ventana total).
 *  3. Firma de terminal único (`deviceId`) con HMAC-SHA256 y clave ofuscada por máscara XOR.
 *  4. Verificación FOUC-Free coordinada con el bloqueo síncrono en `<head>`.
 *  5. Protección contra fuerza bruta con bloqueo temporal progresivo tras 5 intentos fallidos.
 *  6. Cierre de sesión oculto al tocar 10 veces consecutivas el logo de NeoEngine.
 */
(function (global) {
  "use strict";

  const AUTH_STORAGE_KEY = "neoengine_auth_v1";
  const BF_STORAGE_KEY = "neoengine_bf_v1";
  const IDB_NAME = "neoengine_sec_db";
  const IDB_STORE = "credentials";

  /* --------------------------------------------------------------------------
     1. Claves Criptográficas Ofuscadas mediante Máscara XOR
     --------------------------------------------------------------------------
     Semilla TOTP (20 bytes / 160 bits RFC 6238) ofuscada por XOR:
     Bytes reales: "NEOENGINE-TELECO-KEY" -> Base32: JZCU64LOM5UW4ZJNKRJUYZLDN5WUs===
     (Exactamente 20 bytes = 32 caracteres Base32 sin padding: JZCU64LOM5UW4ZJNKRJUYZLDN5WU2ZLZ)
  -------------------------------------------------------------------------- */
  const XOR_MASK_TOTP = [
    0xa7, 0x5c, 0x93, 0x3e, 0xf1, 0x62, 0x84, 0x19, 0xc5, 0x4b,
    0x7d, 0x28, 0xe3, 0x10, 0x6a, 0x9f, 0x55, 0xbc, 0x0e, 0x81
  ];

  // Semilla 20 bytes: [78,69,79,69,78,71,73,78,69,45,84,69,76,69,67,79,45,85,77,65] ^ XOR_MASK_TOTP
  const MASKED_TOTP_SEED = [
    0xe9, 0x19, 0xdc, 0x7b, 0xbf, 0x25, 0xcd, 0x57, 0x80, 0x66,
    0x29, 0x6d, 0xaf, 0x55, 0x29, 0xd0, 0x78, 0xe9, 0x43, 0xc0
  ];

  // Clave de 32 bytes (256 bits) para Firma HMAC-SHA256 de Dispositivo (ofuscada con XOR)
  const XOR_MASK_DEVICE = [
    0x3a, 0x91, 0xc4, 0x57, 0x88, 0x12, 0xe9, 0x4f,
    0x63, 0xb8, 0x2d, 0xa1, 0x07, 0xf4, 0x5e, 0xd2,
    0x79, 0x31, 0x8c, 0x66, 0xbe, 0x05, 0x44, 0x9a,
    0xe1, 0x28, 0x73, 0xdf, 0x19, 0x6c, 0xa8, 0x50
  ];

  const MASKED_DEVICE_KEY = [
    0x74, 0xd4, 0x8b, 0x12, 0xc6, 0x55, 0xa0, 0x01,
    0x26, 0x95, 0x69, 0xe4, 0x51, 0xbd, 0x1d, 0x97,
    0x54, 0x62, 0xc5, 0x21, 0xf0, 0x40, 0x08, 0xd3,
    0xa3, 0x6d, 0x27, 0x9e, 0x5c, 0x23, 0xe5, 0x1e
  ];

  function unmaskBytes(masked, mask) {
    const out = new Uint8Array(masked.length);
    for (let i = 0; i < masked.length; i++) {
      out[i] = (masked[i] ^ mask[i % mask.length]) & 0xff;
    }
    return out;
  }

  /**
   * Convierte los 20 bytes de la semilla TOTP a formato Base32 estándar (RFC 4648)
   */
  function bytesToBase32(bytes) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    let output = "";
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
  }

  /**
   * Sello síncrono rápido (usado por el bloque FOUC-Free del <head> y validado aquí)
   */
  function computeSyncSeal(deviceId, issuedAt) {
    const keyBytes = unmaskBytes(MASKED_DEVICE_KEY, XOR_MASK_DEVICE);
    const str = `${deviceId}|${issuedAt}|neoengine-sync-v1`;
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i) ^ keyBytes[i % keyBytes.length];
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= (c + i) & 0xff;
      h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  }

  /* --------------------------------------------------------------------------
     2. Implementación Nativa Web Crypto API (`crypto.subtle`) + Fallback Puro
     -------------------------------------------------------------------------- */
  // Fallback SHA-1 puro por si el navegador se abre bajo protocolo local file:// sin contexto seguro
  function sha1Pure(msgBytes) {
    function rol(n, s) {
      return (n << s) | (n >>> (32 - s));
    }
    const ml = msgBytes.length * 8;
    const withOne = new Uint8Array(msgBytes.length + 1);
    withOne.set(msgBytes);
    withOne[msgBytes.length] = 0x80;
    let padLen = withOne.length;
    while (padLen % 64 !== 56) padLen++;
    const padded = new Uint8Array(padLen + 8);
    padded.set(withOne);
    const dv = new DataView(padded.buffer);
    dv.setUint32(padLen, Math.floor(ml / 0x100000000), false);
    dv.setUint32(padLen + 4, ml >>> 0, false);

    let h0 = 0x67452301,
      h1 = 0xefcdab89,
      h2 = 0x98badcfe,
      h3 = 0x10325476,
      h4 = 0xc3d2e1f0;
    const w = new Int32Array(80);

    for (let i = 0; i < padded.length; i += 64) {
      for (let j = 0; j < 16; j++) {
        w[j] = dv.getInt32(i + j * 4, false);
      }
      for (let j = 16; j < 80; j++) {
        w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      }
      let a = h0,
        b = h1,
        c = h2,
        d = h3,
        e = h4;
      for (let j = 0; j < 80; j++) {
        let f, k;
        if (j < 20) {
          f = (b & c) | (~b & d);
          k = 0x5a827999;
        } else if (j < 40) {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        } else if (j < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }
        const temp = (rol(a, 5) + f + e + k + w[j]) | 0;
        e = d;
        d = c;
        c = rol(b, 30);
        b = a;
        a = temp;
      }
      h0 = (h0 + a) | 0;
      h1 = (h1 + b) | 0;
      h2 = (h2 + c) | 0;
      h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0;
    }
    const out = new Uint8Array(20);
    const outDv = new DataView(out.buffer);
    outDv.setInt32(0, h0, false);
    outDv.setInt32(4, h1, false);
    outDv.setInt32(8, h2, false);
    outDv.setInt32(12, h3, false);
    outDv.setInt32(16, h4, false);
    return out;
  }

  function hmacSha1Pure(keyBytes, dataBytes) {
    const blockSize = 64;
    const k = new Uint8Array(blockSize);
    k.set(keyBytes.length > blockSize ? sha1Pure(keyBytes) : keyBytes);
    const oKeyPad = new Uint8Array(blockSize);
    const iKeyPad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      oKeyPad[i] = k[i] ^ 0x5c;
      iKeyPad[i] = k[i] ^ 0x36;
    }
    const innerInput = new Uint8Array(blockSize + dataBytes.length);
    innerInput.set(iKeyPad);
    innerInput.set(dataBytes, blockSize);
    const innerHash = sha1Pure(innerInput);

    const outerInput = new Uint8Array(blockSize + innerHash.length);
    outerInput.set(oKeyPad);
    outerInput.set(innerHash, blockSize);
    return sha1Pure(outerInput);
  }

  /**
   * Calcula el código TOTP RFC 6238 de 6 dígitos para un contador de 30s dado
   * utilizando prioritariamente `crypto.subtle` nativo.
   */
  async function generateTotpForCounter(counter) {
    const secret = unmaskBytes(MASKED_TOTP_SEED, XOR_MASK_TOTP);
    const counterBuf = new ArrayBuffer(8);
    const view = new DataView(counterBuf);
    view.setUint32(0, Math.floor(counter / 0x100000000), false);
    view.setUint32(4, counter >>> 0, false);

    let hmacBytes;
    if (global.crypto && global.crypto.subtle) {
      try {
        const cryptoKey = await global.crypto.subtle.importKey(
          "raw",
          secret,
          { name: "HMAC", hash: { name: "SHA-1" } },
          false,
          ["sign"]
        );
        const sigBuf = await global.crypto.subtle.sign("HMAC", cryptoKey, counterBuf);
        hmacBytes = new Uint8Array(sigBuf);
      } catch (_) {
        hmacBytes = hmacSha1Pure(secret, new Uint8Array(counterBuf));
      }
    } else {
      hmacBytes = hmacSha1Pure(secret, new Uint8Array(counterBuf));
    }

    // Truncamiento dinámico RFC 4226 §5.3
    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    return (binary % 1000000).toString().padStart(6, "0");
  }

  /**
   * Verifica un código TOTP de 6 dígitos con ventana de tolerancia de ±1 paso (90 segundos)
   */
  async function verifyTotpCode(inputCode, timestampMs = Date.now()) {
    const clean = String(inputCode || "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(clean)) return false;

    const currentStep = Math.floor(timestampMs / 1000 / 30);
    // Tolerancia a desfases: ventana de ±1 paso (paso -1, paso 0, paso +1 -> 90 segundos)
    for (const offset of [0, -1, 1]) {
      const candidate = await generateTotpForCounter(currentStep + offset);
      if (candidate === clean) {
        return true;
      }
    }
    return false;
  }

  /**
   * Genera la firma HMAC-SHA256 del identificador único de dispositivo (`deviceId`)
   * mediante `crypto.subtle` y la clave de 256 bits ofuscada por máscara XOR.
   */
  async function signDeviceToken(deviceId, issuedAt) {
    const keyBytes = unmaskBytes(MASKED_DEVICE_KEY, XOR_MASK_DEVICE);
    const payload = `${deviceId}|${issuedAt}|neoengine-hmac-sha256-v1`;
    const enc = new TextEncoder().encode(payload);

    if (global.crypto && global.crypto.subtle) {
      try {
        const cryptoKey = await global.crypto.subtle.importKey(
          "raw",
          keyBytes,
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"]
        );
        const sig = await global.crypto.subtle.sign("HMAC", cryptoKey, enc);
        return Array.from(new Uint8Array(sig))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } catch (_) {}
    }
    // Fallback determinista si file:// bloquea subtle
    const fallbackBytes = hmacSha1Pure(keyBytes, enc);
    return (
      Array.from(fallbackBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("") + computeSyncSeal(deviceId, issuedAt)
    );
  }

  function generateDeviceId() {
    const arr = new Uint8Array(16);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `neo-dev-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /* --------------------------------------------------------------------------
     3. Persistencia Multi-Capa (LocalStorage + Cookie 10 años + IndexedDB)
     -------------------------------------------------------------------------- */
  function saveSessionPersistent(sessionObj) {
    const raw = JSON.stringify(sessionObj);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, raw);
    } catch (_) {}
    try {
      document.cookie = `${AUTH_STORAGE_KEY}=${encodeURIComponent(raw)}; max-age=315360000; path=/; SameSite=Lax`;
    } catch (_) {}
    try {
      if ("indexedDB" in global) {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(IDB_STORE, "readwrite");
          tx.objectStore(IDB_STORE).put(sessionObj, AUTH_STORAGE_KEY);
        };
      }
    } catch (_) {}
  }

  function readSessionSync() {
    try {
      const ls = localStorage.getItem(AUTH_STORAGE_KEY);
      if (ls) return JSON.parse(ls);
    } catch (_) {}
    try {
      const match = document.cookie.match(new RegExp("(?:^|; )" + AUTH_STORAGE_KEY + "=([^;]*)"));
      if (match && match[1]) {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
        } catch (_) {}
        return parsed;
      }
    } catch (_) {}
    return null;
  }

  async function verifyStoredSessionAsync() {
    let session = readSessionSync();
    if (!session || !session.deviceId || !session.issuedAt || !session.syncSeal || !session.hmacSha256) {
      return false;
    }
    if (computeSyncSeal(session.deviceId, session.issuedAt) !== session.syncSeal) {
      return false;
    }
    const expectedHmac = await signDeviceToken(session.deviceId, session.issuedAt);
    return expectedHmac === session.hmacSha256;
  }

  function purgeAllCredentials() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (_) {}
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (_) {}
    try {
      document.cookie = `${AUTH_STORAGE_KEY}=; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    } catch (_) {}
    try {
      if ("indexedDB" in global) {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onsuccess = (e) => {
          const db = e.target.result;
          if (db.objectStoreNames.contains(IDB_STORE)) {
            const tx = db.transaction(IDB_STORE, "readwrite");
            tx.objectStore(IDB_STORE).delete(AUTH_STORAGE_KEY);
          }
        };
      }
    } catch (_) {}
  }

  /* --------------------------------------------------------------------------
     4. Protección Contra Fuerza Bruta (Bloqueo Progresivo tras 5 Intentos)
     -------------------------------------------------------------------------- */
  function getBruteForceState() {
    try {
      const raw = localStorage.getItem(BF_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          fails: Number(parsed.fails) || 0,
          lockUntil: Number(parsed.lockUntil) || 0
        };
      }
    } catch (_) {}
    return { fails: 0, lockUntil: 0 };
  }

  function saveBruteForceState(state) {
    try {
      localStorage.setItem(BF_STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function recordFailedAttempt() {
    const state = getBruteForceState();
    state.fails += 1;
    if (state.fails >= 5) {
      // Bloqueo progresivo: 5 fallos -> 30s, 6 -> 60s, 7 -> 120s, 8+ -> 300s
      const exponent = Math.min(4, state.fails - 5);
      const lockSeconds = exponent === 4 ? 300 : 30 * Math.pow(2, exponent);
      state.lockUntil = Date.now() + lockSeconds * 1000;
    }
    saveBruteForceState(state);
    return state;
  }

  function resetBruteForceState() {
    saveBruteForceState({ fails: 0, lockUntil: 0 });
  }

  /* --------------------------------------------------------------------------
     5. Interfaz del Portal de Seguridad y Bloqueo FOUC-Free
     -------------------------------------------------------------------------- */
  const INLINE_NEO_LOGO_SVG = `<svg viewBox="0 0 256 256" width="56" height="56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="8" y="8" width="240" height="240" rx="52" fill="#0d1822" stroke="#3cc9b8" stroke-width="6"/>
    <path d="M 52 64 A 96 96 0 0 1 204 64" fill="none" stroke="#3cc9b8" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
    <path d="M 204 192 A 96 96 0 0 1 52 192" fill="none" stroke="#3cc9b8" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
    <rect x="64" y="64" width="128" height="128" rx="22" fill="#091118" stroke="#3cc9b8" stroke-width="5"/>
    <path d="M 90 162 L 90 94 L 138 158 L 166 94 L 166 162" fill="none" stroke="#3cc9b8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 76 128 L 96 128 L 106 104 L 118 152 L 130 96 L 142 154 L 152 116 L 160 128 L 180 128" fill="none" stroke="#f2a33a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  let lockTimerInterval = null;

  function renderSecurityGateModal() {
    let gate = document.getElementById("neoSecurityGate");
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "neoSecurityGate";
      gate.className = "neo-security-gate";
      gate.setAttribute("role", "dialog");
      gate.setAttribute("aria-modal", "true");
      gate.setAttribute("aria-label", "Control de seguridad de NeoEngine");
      gate.innerHTML = `
        <div class="neo-gate-card">
          <div class="neo-gate-header">
            <div class="neo-gate-logo">${INLINE_NEO_LOGO_SVG}</div>
            <div>
              <div class="neo-gate-kicker">INGENIERÍA ELECTRÓNICA DE TELECOMUNICACIONES</div>
              <h1 class="neo-gate-title">NeoEngine · Acceso Protegido</h1>
            </div>
          </div>

          <p class="neo-gate-message">Lamento los inconvenientes, pero esta Aplicación/Web, tiene un método de seguridad para la distribución inapropiada. Si quiere usarla, deberá contactar con el creador. Por favor, introduzca la contraseña: </p>

          <form id="neoGateForm" class="neo-gate-form" autocomplete="off" novalidate>
            <label for="neoTotpInput" class="neo-gate-label">Código dinámico de verificación (6 dígitos · RFC 6238)</label>
            <div class="neo-gate-input-row">
              <input
                type="text"
                id="neoTotpInput"
                class="neo-gate-input"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                placeholder="• • • • • •"
                aria-label="Contraseña dinámica de 6 dígitos"
                required
              />
              <button type="submit" id="neoGateSubmitBtn" class="neo-gate-btn">Desbloquear →</button>
            </div>
            <div id="neoGateFeedback" class="neo-gate-feedback" aria-live="polite"></div>
          </form>

          <div class="neo-gate-footer">
            <span>🔒 Criptografía RFC 6238 (HMAC-SHA1 · ±1 paso)</span>
            <span>·</span>
            <span>Firma de terminal HMAC-SHA256</span>
          </div>
        </div>
      `;
      document.body.appendChild(gate);

      const form = gate.querySelector("#neoGateForm");
      const input = gate.querySelector("#neoTotpInput");

      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9]/g, "").slice(0, 6);
        if (input.value.length === 6) {
          handleUnlockAttempt();
        }
      });

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleUnlockAttempt();
      });
    }

    gate.style.display = "flex";
    updateBruteForceUI();
    setTimeout(() => {
      const inp = document.getElementById("neoTotpInput");
      if (inp && !inp.disabled) inp.focus();
    }, 40);
  }

  function hideSecurityGateModal() {
    document.documentElement.classList.remove("neo-locked");
    const gate = document.getElementById("neoSecurityGate");
    if (gate) {
      gate.style.display = "none";
    }
    if (lockTimerInterval) {
      clearInterval(lockTimerInterval);
      lockTimerInterval = null;
    }
  }

  function updateBruteForceUI() {
    const input = document.getElementById("neoTotpInput");
    const btn = document.getElementById("neoGateSubmitBtn");
    const feedback = document.getElementById("neoGateFeedback");
    if (!input || !btn || !feedback) return;

    const checkLock = () => {
      const bf = getBruteForceState();
      const now = Date.now();
      if (bf.lockUntil > now) {
        const remSec = Math.ceil((bf.lockUntil - now) / 1000);
        input.disabled = true;
        btn.disabled = true;
        feedback.className = "neo-gate-feedback error";
        feedback.textContent = `⛔ Protección contra fuerza bruta activa (${bf.fails} intentos fallidos). Espere ${remSec}s para volver a intentarlo.`;
        return true;
      } else {
        if (input.disabled) {
          input.disabled = false;
          btn.disabled = false;
          feedback.textContent = "";
          input.focus();
        }
        if (lockTimerInterval) {
          clearInterval(lockTimerInterval);
          lockTimerInterval = null;
        }
        return false;
      }
    };

    if (checkLock() && !lockTimerInterval) {
      lockTimerInterval = setInterval(checkLock, 500);
    }
  }

  async function handleUnlockAttempt() {
    const input = document.getElementById("neoTotpInput");
    const feedback = document.getElementById("neoGateFeedback");
    if (!input || !feedback) return;

    const bf = getBruteForceState();
    if (bf.lockUntil > Date.now()) {
      updateBruteForceUI();
      return;
    }

    const code = input.value.trim();
    if (code.length !== 6) {
      feedback.className = "neo-gate-feedback error";
      feedback.textContent = "Introduzca los 6 dígitos del código de acceso.";
      return;
    }

    const ok = await verifyTotpCode(code);
    if (ok) {
      resetBruteForceState();
      const existing = readSessionSync();
      const deviceId = (existing && existing.deviceId) || generateDeviceId();
      const issuedAt = Date.now();
      const syncSeal = computeSyncSeal(deviceId, issuedAt);
      const hmacSha256 = await signDeviceToken(deviceId, issuedAt);

      saveSessionPersistent({
        v: 1,
        deviceId,
        issuedAt,
        syncSeal,
        hmacSha256
      });

      feedback.className = "neo-gate-feedback ok";
      feedback.textContent = "✓ Terminal verificado y firmado con HMAC-SHA256. Accediendo a NeoEngine...";
      input.value = "";
      setTimeout(() => {
        hideSecurityGateModal();
      }, 180);
    } else {
      const updatedBf = recordFailedAttempt();
      input.value = "";
      if (updatedBf.lockUntil > Date.now()) {
        updateBruteForceUI();
      } else {
        const remainingBeforeLock = Math.max(0, 5 - updatedBf.fails);
        feedback.className = "neo-gate-feedback error";
        feedback.textContent = `❌ Código incorrecto o expirado. Intentos restantes antes del bloqueo temporal: ${remainingBeforeLock}.`;
        input.focus();
      }
    }
  }

  /* --------------------------------------------------------------------------
     6. Cierre de Sesión Oculto: 10 Toques Consecutivos en el Logo de NeoEngine
     -------------------------------------------------------------------------- */
  function initTenTapLogoLogout() {
    let tapCount = 0;
    let lastTapTime = 0;

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest(".neo-logo-trigger, .sidebar-brand-title, .topbar-brand");
      if (!trigger) return;

      const now = Date.now();
      if (now - lastTapTime > 1600) {
        tapCount = 1;
      } else {
        tapCount += 1;
      }
      lastTapTime = now;

      if (tapCount >= 10) {
        e.preventDefault();
        e.stopPropagation();
        tapCount = 0;
        purgeAllCredentials();
        document.documentElement.classList.add("neo-locked");
        renderSecurityGateModal();
      }
    });
  }

  /* --------------------------------------------------------------------------
     7. Inicialización y Verificación Criptográfica al Cargar
     -------------------------------------------------------------------------- */
  async function initSecurityGate() {
    initTenTapLogoLogout();

    // Si estamos en el portal autónomo de aprovisionamiento QR, no bloquear la vista del generador
    if (document.body && document.body.getAttribute("data-page-id") === "portal-totp") {
      document.documentElement.classList.remove("neo-locked");
      return;
    }

    const valid = await verifyStoredSessionAsync();
    if (valid) {
      hideSecurityGateModal();
    } else {
      document.documentElement.classList.add("neo-locked");
      renderSecurityGateModal();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSecurityGate);
  } else {
    initSecurityGate();
  }

  global.NeoEngineSecurity = {
    verifyTotpCode,
    generateTotpForCounter,
    getBase32Secret: () => bytesToBase32(unmaskBytes(MASKED_TOTP_SEED, XOR_MASK_TOTP)),
    getOtpAuthUri: () => {
      const secret = bytesToBase32(unmaskBytes(MASKED_TOTP_SEED, XOR_MASK_TOTP));
      return `otpauth://totp/NeoEngine:Ingenieria%20Teleco?secret=${secret}&issuer=NeoEngine&algorithm=SHA1&digits=6&period=30`;
    },
    lockNow: () => {
      purgeAllCredentials();
      document.documentElement.classList.add("neo-locked");
      renderSecurityGateModal();
    },
    computeSyncSeal
  };
})(window);

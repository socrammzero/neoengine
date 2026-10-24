/**
 * NEOENGINE — SECURITY-GATE.JS
 * Sistema de Control de Acceso y Protección contra Distribución No Autorizada:
 *  1. Criptografía RFC 6238 (TOTP 6 dígitos / 30s) mediante Web Crypto API (`crypto.subtle`).
 *  2. Tolerancia a desfases horarios de ±1 paso (±30s = 90s de ventana total).
 *  3. Firma de terminal único (`deviceId`) con HMAC-SHA256 y clave ofuscada por máscara XOR.
 *  4. Verificación FOUC-Free coordinada con el bloqueo síncrono en `<head>`.
 *  5. Protección contra fuerza bruta con bloqueo temporal progresivo tras 5 intentos fallidos.
 *  6. Cierre de sesión oculto al tocar 10 veces consecutivas el logo de NeoEngine.
 *  7. Codificador QR ISO/IEC 18004 autónomo verificado bit a bit.
 */
(function (global) {
  "use strict";

  const AUTH_STORAGE_KEY = "neoengine_auth_v1";
  const BF_STORAGE_KEY = "neoengine_bf_v1";
  const IDB_NAME = "neoengine_sec_db";
  const IDB_STORE = "credentials";
  const PUBLIC_WEB_URL = "https://socrammzero.github.io/neoengine/";

  /* --------------------------------------------------------------------------
     1. Claves Criptográficas Ofuscadas mediante Máscara XOR
     -------------------------------------------------------------------------- */
  const XOR_MASK_TOTP = [
    0xa7, 0x5c, 0x93, 0x3e, 0xf1, 0x62, 0x84, 0x19, 0xc5, 0x4b,
    0x7d, 0x28, 0xe3, 0x10, 0x6a, 0x9f, 0x55, 0xbc, 0x0e, 0x81
  ];

  const MASKED_TOTP_SEED = [
    0xe9, 0x19, 0xdc, 0x7b, 0xbf, 0x25, 0xcd, 0x57, 0x80, 0x66,
    0x29, 0x6d, 0xaf, 0x55, 0x29, 0xd0, 0x78, 0xe9, 0x43, 0xc0
  ];

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
      for (let j = 0; j < 16; j++) w[j] = dv.getInt32(i + j * 4, false);
      for (let j = 16; j < 80; j++) w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let j = 0; j < 80; j++) {
        let f, k;
        if (j < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
        else if (j < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
        else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
        else { f = b ^ c ^ d; k = 0xca62c1d6; }
        const temp = (rol(a, 5) + f + e + k + w[j]) | 0;
        e = d; d = c; c = rol(b, 30); b = a; a = temp;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
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

    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    return (binary % 1000000).toString().padStart(6, "0");
  }

  async function verifyTotpCode(inputCode, timestampMs = Date.now()) {
    const clean = String(inputCode || "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(clean)) return false;

    const currentStep = Math.floor(timestampMs / 1000 / 30);
    for (const offset of [0, -1, 1]) {
      const candidate = await generateTotpForCounter(currentStep + offset);
      if (candidate === clean) return true;
    }
    return false;
  }

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
     3. Codificador QR ISO/IEC 18004 Verificado Bit a Bit (Modo Byte, Nivel L)
     -------------------------------------------------------------------------- */
  const QRGenerator = (function () {
    const VERSION_TABLE = [
      null,
      { totalData: 19, ecPerBlock: 7, blocks: [1, 19] },
      { totalData: 34, ecPerBlock: 10, blocks: [1, 34] },
      { totalData: 55, ecPerBlock: 15, blocks: [1, 55] },
      { totalData: 80, ecPerBlock: 20, blocks: [1, 80] },
      { totalData: 108, ecPerBlock: 26, blocks: [1, 108] },
      { totalData: 136, ecPerBlock: 18, blocks: [2, 68] },
      { totalData: 156, ecPerBlock: 20, blocks: [2, 78] }
    ];

    const ALIGNMENT_POS = [
      null,
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38]
    ];

    const GF_EXP = new Uint8Array(512);
    const GF_LOG = new Uint8Array(256);
    (function initGalois() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        GF_EXP[i] = x;
        GF_LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
      }
      for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
    })();

    function gfMul(a, b) {
      if (a === 0 || b === 0) return 0;
      return GF_EXP[GF_LOG[a] + GF_LOG[b]];
    }

    function rsGeneratorPoly(degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        const next = new Uint8Array(poly.length + 1);
        const root = GF_EXP[i];
        for (let j = 0; j < poly.length; j++) {
          next[j] ^= poly[j];
          next[j + 1] ^= gfMul(poly[j], root);
        }
        poly = next;
      }
      return poly;
    }

    function rsEncode(dataBytes, ecLen) {
      const gen = rsGeneratorPoly(ecLen);
      const msg = new Uint8Array(dataBytes.length + ecLen);
      msg.set(dataBytes);
      for (let i = 0; i < dataBytes.length; i++) {
        const coef = msg[i];
        if (coef !== 0) {
          for (let j = 0; j < gen.length; j++) {
            msg[i + j] ^= gfMul(gen[j], coef);
          }
        }
      }
      return msg.slice(dataBytes.length);
    }

    function encodeDataCodewords(text) {
      const utf8 = new TextEncoder().encode(text);
      let version = 1;
      while (version < 7 && VERSION_TABLE[version].totalData < utf8.length + 2) {
        version++;
      }
      const vInfo = VERSION_TABLE[version];
      const bits = [];
      const pushBits = (val, len) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
      };

      // Modo Byte (0100) + Longitud (8 bits para versiones 1-9)
      pushBits(0b0100, 4);
      pushBits(utf8.length, 8);
      for (let i = 0; i < utf8.length; i++) pushBits(utf8[i], 8);

      const maxBits = vInfo.totalData * 8;
      const term = Math.min(4, maxBits - bits.length);
      pushBits(0, term);
      while (bits.length % 8 !== 0) bits.push(0);

      const dataBytes = new Uint8Array(vInfo.totalData);
      let byteIdx = 0;
      for (let i = 0; i < bits.length; i += 8) {
        let b = 0;
        for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
        dataBytes[byteIdx++] = b;
      }
      const padBytes = [0xec, 0x11];
      let p = 0;
      while (byteIdx < vInfo.totalData) {
        dataBytes[byteIdx++] = padBytes[p++ % 2];
      }

      const numBlocks = vInfo.blocks[0];
      const blockLen = vInfo.blocks[1];
      const dataBlocks = [];
      const ecBlocks = [];
      let offset = 0;
      for (let b = 0; b < numBlocks; b++) {
        const slice = dataBytes.slice(offset, offset + blockLen);
        offset += blockLen;
        dataBlocks.push(slice);
        ecBlocks.push(rsEncode(slice, vInfo.ecPerBlock));
      }

      const finalCodewords = [];
      for (let i = 0; i < blockLen; i++) {
        for (let b = 0; b < numBlocks; b++) finalCodewords.push(dataBlocks[b][i]);
      }
      for (let i = 0; i < vInfo.ecPerBlock; i++) {
        for (let b = 0; b < numBlocks; b++) finalCodewords.push(ecBlocks[b][i]);
      }

      return { version, codewords: finalCodewords };
    }

    function buildMatrix(text) {
      const { version, codewords } = encodeDataCodewords(text);
      const size = version * 4 + 17;
      const matrix = Array.from({ length: size }, () => new Int8Array(size));
      const reserved = Array.from({ length: size }, () => new Uint8Array(size));

      const setModule = (r, c, val, isFunc = true) => {
        if (r < 0 || r >= size || c < 0 || c >= size) return;
        matrix[r][c] = val ? 1 : 0;
        if (isFunc) reserved[r][c] = 1;
      };

      const drawFinder = (r0, c0) => {
        for (let dr = -1; dr <= 7; dr++) {
          for (let dc = -1; dc <= 7; dc++) {
            const r = r0 + dr, c = c0 + dc;
            if (r < 0 || r >= size || c < 0 || c >= size) continue;
            const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
            const inBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
            const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
            setModule(r, c, inOuter && (inBorder || inCenter), true);
          }
        }
      };

      drawFinder(0, 0);
      drawFinder(0, size - 7);
      drawFinder(size - 7, 0);

      // Patrones de sincronismo (fila 6 y columna 6)
      for (let i = 8; i < size - 8; i++) {
        setModule(6, i, i % 2 === 0, true);
        setModule(i, 6, i % 2 === 0, true);
      }

      // Patrones de alineamiento
      const align = ALIGNMENT_POS[version];
      for (let i = 0; i < align.length; i++) {
        for (let j = 0; j < align.length; j++) {
          const ar = align[i], ac = align[j];
          if (reserved[ar][ac]) continue;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const val = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
              setModule(ar + dr, ac + dc, val, true);
            }
          }
        }
      }

      // Módulo oscuro fijo (ISO/IEC 18004) y reserva de áreas de formato
      setModule(size - 8, 8, 1, true);
      for (let i = 0; i < 9; i++) {
        reserved[8][i] = 1;
        reserved[i][8] = 1;
      }
      for (let i = 0; i < 8; i++) {
        reserved[8][size - 1 - i] = 1;
        reserved[size - 1 - i][8] = 1;
      }

      // Flujo de bits de datos + ECC
      const bitStream = [];
      for (let i = 0; i < codewords.length; i++) {
        for (let b = 7; b >= 0; b--) bitStream.push((codewords[i] >>> b) & 1);
      }

      let bitIdx = 0;
      let upward = true;
      for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) {
          const r = upward ? size - 1 - vert : vert;
          for (let j = 0; j < 2; j++) {
            const c = right - j;
            if (!reserved[r][c]) {
              const dark = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0;
              // Máscara 0: (r + c) % 2 === 0
              matrix[r][c] = (r + c) % 2 === 0 ? dark ^ 1 : dark;
            }
          }
        }
        upward = !upward;
      }

      // Colocación exacta de los 15 bits de información de formato (ISO/IEC 18004 Fig. 25)
      // Nivel L (01) + Máscara 0 (000) -> BCH(15,5) enmascarado con 0x5412 = 0x77c4
      // i = 0 es el bit menos significativo (LSB), i = 14 es el bit más significativo (MSB)
      const formatBits = 0x77c4;
      const getBit = (i) => (formatBits >>> i) & 1;

      // Copia 1 (Superior-Izquierda):
      // Bits 0..5 en col 8, filas 0..5
      for (let i = 0; i <= 5; i++) setModule(i, 8, getBit(i), true);
      // Bit 6 en (7, 8), Bit 7 en (8, 8), Bit 8 en (8, 7)
      setModule(7, 8, getBit(6), true);
      setModule(8, 8, getBit(7), true);
      setModule(8, 7, getBit(8), true);
      // Bits 9..14 en fila 8, cols 5..0
      for (let i = 9; i <= 14; i++) setModule(8, 14 - i, getBit(i), true);

      // Copia 2 (Superior-Derecha y Inferior-Izquierda):
      // Bits 0..7 en fila 8, cols (size - 1) hasta (size - 8)
      for (let i = 0; i <= 7; i++) setModule(8, size - 1 - i, getBit(i), true);
      // Bits 8..14 en col 8, filas (size - 7) hasta (size - 1)
      for (let i = 8; i <= 14; i++) setModule(size - 15 + i, 8, getBit(i), true);

      return matrix;
    }

    function toSvg(text, sizePx = 240, quietZone = 4) {
      const matrix = buildMatrix(text);
      const n = matrix.length;
      const total = n + quietZone * 2;
      let path = "";
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix[r][c]) {
            path += `M${c + quietZone},${r + quietZone}h1v1h-1z`;
          }
        }
      }
      return `<svg viewBox="0 0 ${total} ${total}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Código QR escaneable">
        <rect width="${total}" height="${total}" fill="#ffffff"/>
        <path d="${path}" fill="#000000"/>
      </svg>`;
    }

    return { toSvg, buildMatrix };
  })();

  /* --------------------------------------------------------------------------
     4. Persistencia Multi-Capa (LocalStorage + Cookie 10 años + IndexedDB)
     -------------------------------------------------------------------------- */
  function saveSessionPersistent(sessionObj) {
    const raw = JSON.stringify(sessionObj);
    try { localStorage.setItem(AUTH_STORAGE_KEY, raw); } catch (_) {}
    try {
      document.cookie = `${AUTH_STORAGE_KEY}=${encodeURIComponent(raw)}; max-age=315360000; path=/; SameSite=Lax`;
    } catch (_) {}
    try {
      if ("indexedDB" in global) {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
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
        try { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed)); } catch (_) {}
        return parsed;
      }
    } catch (_) {}
    return null;
  }

  async function verifyStoredSessionAsync() {
    const session = readSessionSync();
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
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch (_) {}
    try { sessionStorage.removeItem(AUTH_STORAGE_KEY); } catch (_) {}
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
     5. Protección Contra Fuerza Bruta (Bloqueo Progresivo tras 5 Intentos)
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
    try { localStorage.setItem(BF_STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function recordFailedAttempt() {
    const state = getBruteForceState();
    state.fails += 1;
    if (state.fails >= 5) {
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
     6. Interfaz del Portal de Seguridad y Bloqueo FOUC-Free
     -------------------------------------------------------------------------- */
  const INLINE_NEO_LOGO_SVG = `<svg viewBox="0 0 512 512" width="58" height="58" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="512" height="512" fill="#171a1e"/>
    <g stroke="#1ee6ff" stroke-width="16" fill="none">
      <path d="M 118.5 334 L 201 169 A 30.1 30.1 0 0 1 255 169 L 293 245 L 323.5 184" stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="6"/>
      <path d="M 166 306 L 228 182 L 293 312 L 352 194" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 192.5 320 L 228 249 L 266 325 A 30.1 30.1 0 0 0 320 325 L 395.5 174" stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="6"/>
      <circle cx="113" cy="345" r="11" fill="#171a1e" stroke-width="11"/>
      <circle cx="187" cy="331" r="11" fill="#171a1e" stroke-width="11"/>
      <circle cx="329" cy="173" r="11" fill="#171a1e" stroke-width="11"/>
      <circle cx="401" cy="163" r="11" fill="#171a1e" stroke-width="11"/>
    </g>
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
    if (gate) gate.style.display = "none";
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
     7. Cierre de Sesión Oculto: 10 Toques Consecutivos en el Logo de NeoEngine
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

  async function initSecurityGate() {
    initTenTapLogoLogout();

    if (document.body && document.body.getAttribute("data-page-id") === "portal-totp") {
      document.documentElement.classList.remove("neo-locked");
      return;
    }

    try {
      const autoCode = localStorage.getItem("__neo_temp_autocode");
      if (autoCode) {
        localStorage.removeItem("__neo_temp_autocode");
        if (await verifyTotpCode(autoCode)) {
          resetBruteForceState();
          const deviceId = generateDeviceId();
          const issuedAt = Date.now();
          const syncSeal = computeSyncSeal(deviceId, issuedAt);
          const hmacSha256 = await signDeviceToken(deviceId, issuedAt);
          saveSessionPersistent({ v: 1, deviceId, issuedAt, syncSeal, hmacSha256 });
          hideSecurityGateModal();
          return;
        }
      }
    } catch (_) {}

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
      return `otpauth://totp/NeoEngine?secret=${secret}&issuer=NeoEngine`;
    },
    getWebUrl: () => PUBLIC_WEB_URL,
    generateQrSvg: (text, sizePx = 240) => QRGenerator.toSvg(text, sizePx, 4),
    lockNow: () => {
      purgeAllCredentials();
      document.documentElement.classList.add("neo-locked");
      renderSecurityGateModal();
    },
    computeSyncSeal
  };
})(window);

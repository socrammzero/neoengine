#!/usr/bin/env node
/**
 * Auditor de Privacidad, Neutralidad, Estándar html-maker y Reglas INFO.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const RESTRICTED_PATTERNS = [
  { regex: /C:\\Users\\[a-zA-Z0-9_-]+/i, reason: 'Ruta local de usuario detectada' },
  { regex: /\/home\/[a-zA-Z0-9_-]+\//i, reason: 'Ruta local de usuario Linux detectada' },
  { regex: /@[a-zA-Z0-9.-]+\.(edu|es|ac\.[a-z]{2})\b/i, reason: 'Correo electrónico institucional detectado' },
  { regex: /<!--\s*Añadir el resto aqu[ií]\s*-->/i, reason: 'Placeholder prohibido por estándar html-maker (Zero-Toy UI)' },
  { regex: /TODO:\s*completar/i, reason: 'Código truncado o placeholder incompleto detectado' }
];

const C_CODE_FORBIDDEN = [
  { regex: /\bvolatile\b/, reason: 'PROHIBICIÓN INFO.md #1: Uso de volatile en archivo .c' },
  { regex: /\bpthread_mutex_lock\b/, reason: 'PROHIBICIÓN INFO.md #3: Uso de pthread_mutex_lock en archivo .c (usar sem_t mutex)' },
  { regex: /\(\s*void\s*\*\s*\)\s*\(\s*intptr_t\s*\)/, reason: 'PROHIBICIÓN INFO.md #4: Uso de (void*)(intptr_t) en archivo .c (usar &ids[i])' }
];

const IGNORED_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.pytest_cache']);
const ALLOWED_FILES = new Set(['audit-privacy.js', 'PLAN.md']);

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function runAudit() {
  const files = walkDir(ROOT);
  const violations = [];

  for (const filePath of files) {
    const baseName = path.basename(filePath);
    if (ALLOWED_FILES.has(baseName)) continue;

    const ext = path.extname(filePath).toLowerCase();
    if (!['.html', '.js', '.css', '.json', '.md', '.py', '.c', '.cpp', '.java', '.sql', '.ts'].includes(ext)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, idx) => {
      for (const rule of RESTRICTED_PATTERNS) {
        if (rule.regex.test(line)) {
          violations.push({
            file: path.relative(ROOT, filePath),
            line: idx + 1,
            reason: rule.reason,
            snippet: line.trim().slice(0, 100)
          });
        }
      }
      if (ext === '.c') {
        const cleanLine = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
        for (const cRule of C_CODE_FORBIDDEN) {
          if (cRule.regex.test(cleanLine)) {
            violations.push({
              file: path.relative(ROOT, filePath),
              line: idx + 1,
              reason: cRule.reason,
              snippet: line.trim().slice(0, 100)
            });
          }
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error('❌ [PRIVACY & INFO.MD HOOK] Se encontraron infracciones:');
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line} -> ${v.reason} ("${v.snippet}")`);
    }
    process.exit(1);
  } else {
    console.log(`✅ [PRIVACY & INFO.MD HOOK] ${files.length} archivos verificados. 100% conforme con INFO.md, html-maker y neutralidad.`);
  }
}

runAudit();

#!/usr/bin/env node
/**
 * NEOENGINE — Auditor Automático de Privacidad, Neutralidad y Normativa de Evaluación
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const RESTRICTED_PATTERNS = [
  { regex: /C:\\Users\\[a-zA-Z0-9_-]+/i, reason: 'Ruta local de usuario detectada' },
  { regex: /\/home\/[a-zA-Z0-9_-]+\//i, reason: 'Ruta local de usuario Linux detectada' },
  { regex: /@[a-zA-Z0-9.-]+\.(edu|es|ac\.[a-z]{2})\b/i, reason: 'Correo electrónico institucional detectado' },
  { regex: /\bINFO\.md\b/i, reason: 'Referencia a archivo interno detectada' },
  { regex: /\bhtml-maker\b/i, reason: 'Referencia interna de maquetación detectada' },
  { regex: /\bEngineering Workbench\b|\bEngWorkbench\b/i, reason: 'Nombre antiguo detectado (debe ser NeoEngine)' },
  { regex: /TODO:\s*completar/i, reason: 'Código truncado o placeholder incompleto detectado' }
];

const C_CODE_FORBIDDEN = [
  { regex: /\bvolatile\b/, reason: 'NORMATIVA #1: Uso prohibido de volatile en archivo .c' },
  { regex: /\bpthread_mutex_lock\b/, reason: 'NORMATIVA #3: Uso prohibido de pthread_mutex_lock en archivo .c (usar sem_t mutex)' },
  { regex: /\(\s*void\s*\*\s*\)\s*\(\s*intptr_t\s*\)/, reason: 'NORMATIVA #4: Uso prohibido de (void*)(intptr_t) en archivo .c (usar &ids[i])' }
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
    console.error('❌ [NEOENGINE AUDITOR] Se encontraron infracciones:');
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line} -> ${v.reason} ("${v.snippet}")`);
    }
    process.exit(1);
  } else {
    console.log(`✅ [NEOENGINE AUDITOR] ${files.length} archivos verificados. 100% conforme con NeoEngine, seguridad y normativa.`);
  }
}

runAudit();

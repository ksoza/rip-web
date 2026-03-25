// lib/agents/tools/code-analysis.ts
// Tool: Analyze code snippets and suggest improvements

export interface CodeAnalysis {
  language: string;
  summary: string;
  issues: string[];
  suggestions: string[];
  complexity: 'low' | 'medium' | 'high';
}

// Lightweight static analysis for common patterns
export function analyzeCode(code: string, language?: string): CodeAnalysis {
  const detectedLang = language || detectLanguage(code);
  const lines = code.split('\n');
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Basic checks
  if (lines.length > 300) {
    issues.push('File is very long — consider breaking into smaller modules');
  }

  // Check for common anti-patterns
  if (code.includes('console.log') && (detectedLang === 'typescript' || detectedLang === 'javascript')) {
    suggestions.push('Remove console.log statements before production');
  }

  if (code.includes('any') && detectedLang === 'typescript') {
    issues.push('Uses `any` type — consider adding proper types');
  }

  if (code.includes('TODO') || code.includes('FIXME') || code.includes('HACK')) {
    issues.push('Contains TODO/FIXME/HACK comments that need addressing');
  }

  if (code.includes('var ') && (detectedLang === 'typescript' || detectedLang === 'javascript')) {
    suggestions.push('Replace `var` with `const` or `let`');
  }

  // Check nesting depth
  let maxDepth = 0;
  let currentDepth = 0;
  for (const char of code) {
    if (char === '{') { currentDepth++; maxDepth = Math.max(maxDepth, currentDepth); }
    if (char === '}') currentDepth--;
  }
  if (maxDepth > 5) {
    issues.push(`Deep nesting (${maxDepth} levels) — consider refactoring`);
  }

  // Complexity estimate
  const complexity: 'low' | 'medium' | 'high' =
    lines.length > 200 || maxDepth > 6 ? 'high' :
    lines.length > 50 || maxDepth > 3 ? 'medium' : 'low';

  return {
    language: detectedLang,
    summary: `${lines.length} lines of ${detectedLang}, complexity: ${complexity}`,
    issues,
    suggestions,
    complexity,
  };
}

function detectLanguage(code: string): string {
  if (code.includes('import React') || code.includes('from \'react\'') || code.includes('tsx')) return 'typescript';
  if (code.includes(': string') || code.includes(': number') || code.includes('interface ')) return 'typescript';
  if (code.includes('const ') || code.includes('function ') || code.includes('=>')) return 'javascript';
  if (code.includes('def ') || code.includes('import ') && code.includes(':')) return 'python';
  if (code.includes('func ') || code.includes('package ')) return 'go';
  if (code.includes('fn ') || code.includes('let mut ')) return 'rust';
  return 'unknown';
}

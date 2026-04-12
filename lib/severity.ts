// lib/severity.ts
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export function calculateSeverity(
  verdict: string,
  confidence: string,
  redFlags: string[]
): Severity {
  if (verdict === 'fabricated' && confidence === 'high' && redFlags.length >= 2) return 'CRITICAL'
  if ((verdict === 'fabricated' || verdict === 'weak') && confidence === 'high') return 'HIGH'
  if (verdict === 'fabricated' && redFlags.some(f =>
    f.toLowerCase().includes('chain') || f.toLowerCase().includes('share')
  )) return 'HIGH'
  if (verdict === 'weak' || verdict === 'unclear') return 'MEDIUM'
  return 'LOW'
}
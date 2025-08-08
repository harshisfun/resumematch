import { JdSignals } from "./jdSignals";

function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export function keywordCoverage(text: string, signals: JdSignals) {
  const all = new Set<string>();
  signals.canonicalSkills.forEach(s => {
    all.add(s.name.toLowerCase());
    s.synonyms.forEach(x => all.add(x.toLowerCase()));
  });
  const present = new Set<string>();
  for (const term of all) {
    const re = new RegExp(`\\b${esc(term)}\\b`, "i");
    if (re.test(text)) present.add(term);
  }
  return present.size / (all.size || 1);
}



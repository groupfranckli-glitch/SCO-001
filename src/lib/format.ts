const nf = new Intl.NumberFormat("fr-FR");

/** 10000 -> "10 000 FCFA" (espaces insécables pour éviter les retours à la ligne). */
export function formatFcfa(amount: number): string {
  return `${nf.format(amount).replace(/[  \s]/g, " ")} FCFA`;
}

/** plural(1, "saveur") -> "1 saveur" ; plural(8, "saveur") -> "8 saveurs" */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

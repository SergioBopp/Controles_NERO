export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

export const num = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const nero = {
  sidebar: "#14532d",
  sidebarSoft: "#166534",
  primary: "#16a34a",
  primaryStrong: "#15803d",
};

export function money(value) {
  return brl.format(Number(value || 0));
}

export function pct(value) {
  return `${num.format(Number(value || 0))}%`;
}

export function shortDate(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}
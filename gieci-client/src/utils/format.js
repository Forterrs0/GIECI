export function qtyOf(product) {
  const raw = product.currentWeight / product.unitWeight;
  return Math.round(raw * 10) / 10;
}
export function statusOf(product) {
  const qty = qtyOf(product);
  if (qty <= product.minQuantity / 2) {
    return { key: "critico", label: "Crítico" };
  }
  if (qty <= product.minQuantity) {
    return { key: "baixo", label: "Baixo" };
  }
  return { key: "ok", label: "Normal" };
}
export function fmtWeight(g) {
  if (g >= 1000) {
    return `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 2)} kg`;
  }
  return `${Math.round(g)} g`;
}
export function fmtQty(product) {
  const q = qtyOf(product);
  return Number.isInteger(q) ? String(q) : q.toFixed(1);
}
export function fmtDateTime(ts) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
export function isToday(ts) {
  const a = new Date(ts);
  const b = new Date();
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}
export function getPeriodRange(period, refDate) {
  const d = new Date(refDate);
  if (period === "dia") {
    const start = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0,
      0,
      0,
      0,
    );
    const end = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }
  if (period === "semana") {
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate() + diffToMonday,
      0,
      0,
      0,
      0,
    );
    const sunday = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 6,
      23,
      59,
      59,
      999,
    );
    return { start: monday, end: sunday };
  }
  // mês
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
export function shiftDate(period, refDate, direction) {
  const d = new Date(refDate);
  if (period === "dia") d.setDate(d.getDate() + direction);
  else if (period === "semana") d.setDate(d.getDate() + direction * 7);
  else {
    d.setDate(1);
    d.setMonth(d.getMonth() + direction);
  }
  return d;
}
export function fmtPeriodLabel(period, range) {
  if (period === "dia") {
    return range.start.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  if (period === "semana") {
    const s = range.start.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    const e = range.end.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    return `${s} – ${e}`;
  }
  return range.start.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function byId(doc, id) {
  const el = doc.getElementById(id);
  if (!el) throw new Error(`Elemento não encontrado: #${id}`);
  return el;
}

export function setText(el, value) {
  el.textContent = value == null ? "" : String(value);
}

export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}


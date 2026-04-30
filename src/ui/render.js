import { clearChildren } from "./dom.js";
import { ActionKind } from "../core/index.js";

/** @param {HTMLElement} listEl @param {ReadonlyArray<import("../core/solver.js").SolverAction>} actions */
export function renderActions(listEl, actions) {
  clearChildren(listEl);

  if (actions.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma dedução determinística encontrada (sem chute).";
    listEl.appendChild(li);
    return;
  }

  for (const a of actions) {
    const li = document.createElement("li");

    const badge = document.createElement("span");
    badge.className = `badge ${a.kind === ActionKind.MarkMine ? "mine" : "safe"}`;
    badge.textContent = a.kind === ActionKind.MarkMine ? "Mina" : "Seguro";

    const where = document.createElement("span");
    where.textContent = `(${a.r},${a.c}) `;

    const reason = document.createElement("span");
    reason.className = "muted";
    reason.textContent = a.reason;

    li.appendChild(badge);
    li.appendChild(where);
    li.appendChild(reason);
    listEl.appendChild(li);
  }
}


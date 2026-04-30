const DEFAULT_CELL_SIZE_PX = 44;
const DEFAULT_CELL_GAP_PX = 8;

/** @param {HTMLElement} container @param {number} width @param {number} height */
export function renderBoard(container, width, height) {
  container.innerHTML = "";
  container.style.setProperty("--cell-size", `${DEFAULT_CELL_SIZE_PX}px`);
  container.style.setProperty("--cell-gap", `${DEFAULT_CELL_GAP_PX}px`);
  container.style.gridTemplateColumns = `repeat(${width}, var(--cell-size, ${DEFAULT_CELL_SIZE_PX}px))`;
  container.style.gridAutoRows = `var(--cell-size, ${DEFAULT_CELL_SIZE_PX}px)`;
  container.style.gap = `var(--cell-gap, ${DEFAULT_CELL_GAP_PX}px)`;

  const frag = document.createDocumentFragment();

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell is-closed";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Célula ${r + 1}, ${c + 1}`);
      frag.appendChild(cell);
    }
  }

  container.appendChild(frag);
}

/** @param {HTMLElement} cellEl @param {{kind:"closed"|"open0"|"number"|"bomb", value:number|null}} state */
export function applyCellView(cellEl, state) {
  cellEl.classList.remove(
    "is-closed",
    "is-open",
    "is-open0",
    "is-number",
    "is-bomb",
    "is-flag",
    "n1",
    "n2",
    "n3",
    "n4",
    "n5",
    "n6",
    "n7",
    "n8",
  );
  cellEl.textContent = "";

  if (state.kind === "closed") {
    cellEl.classList.add("is-closed");
    return;
  }

  if (state.kind === "open0") {
    cellEl.classList.add("is-open", "is-open0");
    return;
  }

  if (state.kind === "bomb") {
    cellEl.classList.add("is-open", "is-bomb");
    return;
  }

  if (state.kind === "flag") {
    cellEl.classList.add("is-open", "is-flag");
    return;
  }

  cellEl.classList.add("is-open", "is-number", `n${state.value}`);
  cellEl.textContent = String(state.value);
}


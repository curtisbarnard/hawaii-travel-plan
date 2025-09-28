let data = [];
const listEl = document.getElementById("list");
const filterType = document.getElementById("filter-type");
const filterRegion = document.getElementById("filter-region");
const searchEl = document.getElementById("search");

// Add sort dropdown dynamically
const sortSelect = document.createElement("select");
sortSelect.id = "sort";
sortSelect.innerHTML = `
  <option value="name">Sort: Name</option>
  <option value="type">Sort: Type</option>
  <option value="region">Sort: Region</option>
  <option value="town">Sort: Town</option>
`;
document.querySelector(".filters").appendChild(sortSelect);

function loadLocalState() {
  const saved = JSON.parse(localStorage.getItem("tripState") || "{}");
  data.forEach(item => {
    if (saved[item.name]) {
      item.done = saved[item.name].done;
      item.notes = saved[item.name].notes;
    }
  });
}

function saveLocalState() {
  const state = {};
  data.forEach(item => {
    state[item.name] = { done: item.done, notes: item.notes };
  });
  localStorage.setItem("tripState", JSON.stringify(state));
}

function render() {
  listEl.innerHTML = "";
  const typeVal = filterType.value;
  const regionVal = filterRegion.value;
  const searchVal = searchEl.value.toLowerCase();
  const sortVal = sortSelect.value;

  let items = data
    .filter(i => !typeVal || i.type === typeVal)
    .filter(i => !regionVal || i.region === regionVal)
    .filter(i => i.name.toLowerCase().includes(searchVal));

  // Sorting
  items.sort((a, b) => {
    if (!a[sortVal]) return 1;
    if (!b[sortVal]) return -1;
    return a[sortVal].toString().localeCompare(b[sortVal].toString());
  });

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "item" + (item.done ? " done" : "");

    row.innerHTML = `
      <div class="item-header">
        <input type="checkbox" ${item.done ? "checked" : ""}>
        <h3>${item.name}</h3>
      </div>
      <div class="item-info">
        <span>Type: ${item.type || "-"}</span>
        <span>Region: ${item.region || "-"}</span>
        <span>${item.town ? "Town: " + item.town : ""}</span>
      </div>
      <textarea placeholder="Notes...">${item.notes || ""}</textarea>
    `;

    const checkbox = row.querySelector("input[type='checkbox']");
    const textarea = row.querySelector("textarea");

    checkbox.addEventListener("change", () => {
      item.done = checkbox.checked;
      saveLocalState();
      render();
    });

    textarea.addEventListener("input", () => {
      item.notes = textarea.value;
      saveLocalState();
    });

    listEl.appendChild(row);
  });
}

fetch("data.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    loadLocalState();
    populateFilters();
    render();
  });

function populateFilters() {
  const types = [...new Set(data.map(i => i.type).filter(Boolean))].sort();
  const regions = [...new Set(data.map(i => i.region).filter(Boolean))].sort();

  types.forEach(t => filterType.innerHTML += `<option value="${t}">${t}</option>`);
  regions.forEach(r => filterRegion.innerHTML += `<option value="${r}">${r}</option>`);

  filterType.addEventListener("change", render);
  filterRegion.addEventListener("change", render);
  searchEl.addEventListener("input", render);
  sortSelect.addEventListener("change", render);
}

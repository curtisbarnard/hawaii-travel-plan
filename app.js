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
document.querySelector(".filters").prepend(sortSelect);

function loadLocalState() {
  const saved = localStorage.getItem("tripData");
  if (saved) {
    data = JSON.parse(saved);
    return true;
  }
  return false;
}

function saveLocalState() {
  localStorage.setItem("tripData", JSON.stringify(data));
}

function render() {
  listEl.innerHTML = "";
  const regionVal = filterRegion.value;
  const searchVal = searchEl.value.toLowerCase();
  const sortVal = sortSelect.value;

    const selectedTypes = Array.from(document.querySelectorAll("#type-options input:checked")).map(cb => cb.value);

  let items = data
    .filter(i => selectedTypes.length === 0 || selectedTypes.every(t => (i.type || []).includes(t)))
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
    let regionClass = item.region ? " " + item.region.toLowerCase() : "";
    row.className = "item" + regionClass + (item.done ? " done" : "");


    row.innerHTML = `
    <div class="item-header">
        <input type="checkbox" ${item.done ? "checked" : ""}>
        <h3>
        <a href="${item.maps || '#'}" target="_blank" rel="noopener">
            ${item.name}
        </a>
        </h3>
    </div>
    <div class="item-desc">
        ${item.description || ""}
    </div>
    <div class="item-info">
        <span>Type: ${(item.type || []).join(", ") || "-"}</span>
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

if (!loadLocalState()) {
  // if nothing in localStorage, load the base data.json
  fetch("data.json")
    .then(res => res.json())
    .then(json => {
      data = json;
      saveLocalState(); // save initial version so we can extend it
      populateFilters();
      render();
    });
} else {
  populateFilters();
  render();
}

function populateFilters() {
  const types = [...new Set(data.flatMap(i => i.type || []))].sort();
  const regions = [...new Set(data.map(i => i.region).filter(Boolean))].sort();

  // Build region dropdown
  filterRegion.innerHTML = '<option value="">All Regions</option>';
  regions.forEach(r => filterRegion.innerHTML += `<option value="${r}">${r}</option>`);

  // Build type checkboxes
  const typeOptions = document.getElementById("type-options");
  typeOptions.innerHTML = "";
  types.forEach(t => {
    const id = "type-" + t.replace(/\s+/g, "-").toLowerCase();
    typeOptions.innerHTML += `
      <label><input type="checkbox" value="${t}" id="${id}"> ${t}</label>
    `;
  });

    // Build type checkboxes in Add Place form
    const newTypeOptions = document.getElementById("new-type-options");
    if (newTypeOptions) {
    newTypeOptions.innerHTML = "";
    types.forEach(t => {
        const id = "new-type-" + t.replace(/\s+/g, "-").toLowerCase();
        newTypeOptions.innerHTML += `
        <label><input type="checkbox" value="${t}" id="${id}"> ${t}</label>
        `;
    });
    }

  // Update button text and re-render on change
  typeOptions.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      updateTypeFilterBtn();
      render();
    });
  });

  updateTypeFilterBtn();

  filterRegion.addEventListener("change", render);
  searchEl.addEventListener("input", render);
  sortSelect.addEventListener("change", render);
}

// Update button text
function updateTypeFilterBtn() {
  const selected = Array.from(document.querySelectorAll("#type-options input:checked")).map(cb => cb.value);
  const btn = document.getElementById("type-filter-btn");
  btn.textContent = selected.length > 0 ? `Filter Types (${selected.length}) ▾` : "Filter Types ▾";
}

// Download current state as JSON
document.getElementById("download").addEventListener("click", () => {
  // include updated notes + done state
  saveLocalState();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hawaii-trip-progress.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Form elements
const addFormSection = document.getElementById("add-form");
const showFormBtn = document.getElementById("show-form");
const cancelFormBtn = document.getElementById("cancel-form");
const addForm = addFormSection.querySelector("form");

showFormBtn.addEventListener("click", () => {
  addFormSection.classList.remove("hidden");
});

cancelFormBtn.addEventListener("click", () => {
  addFormSection.classList.add("hidden");
  addForm.reset();
});

addForm.addEventListener("submit", e => {
  e.preventDefault();
  const newItem = {
  name: document.getElementById("new-name").value,
  description: document.getElementById("new-description").value,
  maps: document.getElementById("new-maps").value,
  type: Array.from(document.querySelectorAll("#new-type-options input:checked"))
            .map(cb => cb.value),
  region: document.getElementById("new-region").value.toLowerCase(),
  town: document.getElementById("new-town").value,
  notes: document.getElementById("new-notes").value,
  done: false
};

  data.push(newItem);
  saveLocalState();
  populateFilters();
  render();

  addForm.reset();
  addFormSection.classList.add("hidden");
});

const typeFilterBtn = document.getElementById("type-filter-btn");
const typeOptions = document.getElementById("type-options");

typeFilterBtn.addEventListener("click", () => {
  typeOptions.classList.toggle("hidden");
});

// Close if clicking outside
document.addEventListener("click", (e) => {
  if (!document.getElementById("type-filter").contains(e.target)) {
    typeOptions.classList.add("hidden");
  }
});
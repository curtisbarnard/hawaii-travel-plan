let data = [];
const listEl = document.getElementById("list");
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

// Auto-resize textarea function
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

// Apply auto-resize to all textareas
function initAutoResize() {
  document.querySelectorAll('textarea').forEach(textarea => {
    // Set initial height
    autoResizeTextarea(textarea);
    
    // Add event listeners for auto-resize
    textarea.addEventListener('input', () => autoResizeTextarea(textarea));
    textarea.addEventListener('paste', () => {
      // Small delay to allow paste content to be processed
      setTimeout(() => autoResizeTextarea(textarea), 10);
    });
  });
}

function render() {
  listEl.innerHTML = "";
  const searchVal = searchEl.value.toLowerCase();
  const sortVal = sortSelect.value;
  const hideCompleted = document.getElementById("hide-completed")?.checked ?? true;

  const selectedTypes = Array.from(document.querySelectorAll("#type-options input:checked")).map(cb => cb.value);
  const selectedRegions = Array.from(document.querySelectorAll("#region-options input:checked")).map(cb => cb.value);

  let items = data
    .filter(i => selectedTypes.length === 0 || selectedTypes.every(t => (i.type || []).includes(t)))
    .filter(i => selectedRegions.length === 0 || selectedRegions.includes(i.region))
    .filter(i => i.name.toLowerCase().includes(searchVal))
    .filter(i => !hideCompleted || !i.done);

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
      autoResizeTextarea(textarea);
    });

    // Initialize auto-resize for this textarea
    autoResizeTextarea(textarea);

    listEl.appendChild(row);
  });

  // Initialize auto-resize for any other textareas (like in forms)
  initAutoResize();
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

  // Build region checkboxes for filtering
  const regionOptions = document.getElementById("region-options");
  regionOptions.innerHTML = "";
  regions.forEach(r => {
    const id = "region-" + r.replace(/\s+/g, "-").toLowerCase();
    regionOptions.innerHTML += `
      <label><input type="checkbox" value="${r}" id="${id}" checked> ${r}</label>
    `;
  });

  // Build region dropdown for add form
  const newRegionSelect = document.getElementById("new-region");
  if (newRegionSelect) {
    newRegionSelect.innerHTML = '<option value="">Select Region</option>';
    regions.forEach(r => {
      newRegionSelect.innerHTML += `<option value="${r}">${r}</option>`;
    });
  }

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

  // Update button text and re-render on change for types
  typeOptions.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      updateTypeFilterBtn();
      render();
    });
  });

  // Update button text and re-render on change for regions
  regionOptions.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      updateRegionFilterBtn();
      render();
    });
  });

  updateTypeFilterBtn();
  updateRegionFilterBtn();

  searchEl.addEventListener("input", render);
  sortSelect.addEventListener("change", render);

  // Add event listener for hide completed checkbox
  const hideCompletedCheckbox = document.getElementById("hide-completed");
  if (hideCompletedCheckbox) {
    hideCompletedCheckbox.addEventListener("change", render);
  }
}

// Update button text
function updateTypeFilterBtn() {
  const selected = Array.from(document.querySelectorAll("#type-options input:checked")).map(cb => cb.value);
  const btn = document.getElementById("type-filter-btn");
  btn.textContent = selected.length > 0 ? `Type (${selected.length}) ↓` : "Type ↓";
}

function updateRegionFilterBtn() {
  const selected = Array.from(document.querySelectorAll("#region-options input:checked")).map(cb => cb.value);
  const btn = document.getElementById("region-filter-btn");
  btn.textContent = selected.length > 0 ? `Region (${selected.length}) ↓` : "Region ↓";
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

// Reset data to original data.json
document.getElementById("reset-data").addEventListener("click", () => {
  if (confirm("Are you sure you want to reset all data to the original? This will remove all your notes and progress.")) {
    // Clear local storage
    localStorage.removeItem("tripData");
    
    // Reload original data from data.json
    fetch("data.json")
      .then(res => res.json())
      .then(json => {
        data = json;
        saveLocalState(); // save fresh version
        populateFilters();
        render();
        
        // Close the menu after reset
        document.getElementById("menu-options").classList.add("hidden");
        document.getElementById("menu-toggle").classList.remove("active");
      })
      .catch(error => {
        console.error("Error loading original data:", error);
        alert("Error resetting data. Please refresh the page.");
      });
  }
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
  const regionValue = document.getElementById("new-region").value;
  const capitalizedRegion = regionValue.charAt(0).toUpperCase() + regionValue.slice(1).toLowerCase();
  
  const newItem = {
  name: document.getElementById("new-name").value,
  description: document.getElementById("new-description").value,
  maps: document.getElementById("new-maps").value,
  type: Array.from(document.querySelectorAll("#new-type-options input:checked"))
            .map(cb => cb.value),
  region: capitalizedRegion,
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
const regionFilterBtn = document.getElementById("region-filter-btn");
const regionOptions = document.getElementById("region-options");

typeFilterBtn.addEventListener("click", () => {
  typeOptions.classList.toggle("hidden");
});

regionFilterBtn.addEventListener("click", () => {
  regionOptions.classList.toggle("hidden");
});

// Hamburger menu functionality
const menuToggle = document.getElementById("menu-toggle");
const menuOptions = document.getElementById("menu-options");

menuToggle.addEventListener("click", () => {
  menuOptions.classList.toggle("hidden");
  menuToggle.classList.toggle("active");
});

// Close if clicking outside
document.addEventListener("click", (e) => {
  if (!document.getElementById("type-filter").contains(e.target)) {
    typeOptions.classList.add("hidden");
  }
  if (!document.getElementById("region-filter").contains(e.target)) {
    regionOptions.classList.add("hidden");
  }
  if (!document.querySelector(".hamburger-menu").contains(e.target)) {
    menuOptions.classList.add("hidden");
    menuToggle.classList.remove("active");
  }
});

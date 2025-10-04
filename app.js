let data = [];
const listEl = document.getElementById("list");
const searchEl = document.getElementById("search");
let userLocation = null;

// Add sort dropdown dynamically
const sortSelect = document.createElement("select");
sortSelect.id = "sort";
sortSelect.innerHTML = `
  <option value="name">Sort: Name</option>
  <option value="type">Sort: Type</option>
  <option value="region">Sort: Region</option>
  <option value="town">Sort: Town</option>
  <option value="distance" selected>Sort: Distance</option>
`;
document.querySelector(".filters").prepend(sortSelect);

// Geolocation and distance calculation functions
function getUserLocation(forceRefresh = false) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('User location obtained:', userLocation);
        calculateDistances();
        render();
      },
      (error) => {
        console.error('Error getting user location:', error);
        // Still render the app even if geolocation fails
        render();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: forceRefresh ? 0 : 300000 // No cache if forcing refresh, otherwise cache for 5 minutes
      }
    );
  } else {
    console.error('Geolocation is not supported by this browser.');
    render();
  }
}

// Function to refresh location and recalculate distances
function refreshLocation() {
  console.log('Refreshing location...');
  getUserLocation(true); // Force refresh by bypassing cache
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
}

// Calculate distances for all items
function calculateDistances() {
  if (!userLocation) return;
  
  data.forEach(item => {
    if (item.coordinates) {
      const [lat, lng] = item.coordinates.split(',').map(coord => parseFloat(coord.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        item.distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          lat,
          lng
        );
      } else {
        item.distance = null;
      }
    } else {
      item.distance = null;
    }
  });
}

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
    if (sortVal === 'distance') {
      // Handle distance sorting specially
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    } else {
      if (!a[sortVal]) return 1;
      if (!b[sortVal]) return -1;
      return a[sortVal].toString().localeCompare(b[sortVal].toString());
    }
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
        ${item.distance !== null && item.distance !== undefined ? `<span>Distance: ${item.distance.toFixed(1)} mi</span>` : '<span>Distance: Unknown</span>'}
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
      getUserLocation(); // Get user location after initial render
    });
} else {
  populateFilters();
  render();
  getUserLocation(); // Get user location after initial render
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
  // Show custom confirmation modal
  document.getElementById("confirm-modal").classList.remove("hidden");
  
  // Close the hamburger menu
  document.getElementById("menu-options").classList.add("hidden");
  document.getElementById("menu-toggle").classList.remove("active");
});

// Refresh location and recalculate distances
document.getElementById("refresh-location").addEventListener("click", () => {
  // Close the hamburger menu
  document.getElementById("menu-options").classList.add("hidden");
  document.getElementById("menu-toggle").classList.remove("active");
  
  // Refresh the location
  refreshLocation();
});

// Handle confirmation modal buttons
document.getElementById("confirm-reset").addEventListener("click", () => {
  // Hide modal
  document.getElementById("confirm-modal").classList.add("hidden");
  
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
    })
    .catch(error => {
      console.error("Error loading original data:", error);
      alert("Error resetting data. Please refresh the page.");
    });
});

document.getElementById("cancel-reset").addEventListener("click", () => {
  // Just hide the modal
  document.getElementById("confirm-modal").classList.add("hidden");
});

// Close modal when clicking outside
document.getElementById("confirm-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("confirm-modal")) {
    document.getElementById("confirm-modal").classList.add("hidden");
  }
});

// Form elements
const addPlaceModal = document.getElementById("add-place-modal");
const showFormBtn = document.getElementById("show-form");
const cancelFormBtn = document.getElementById("cancel-form");
const addForm = document.getElementById("add-place-form");

showFormBtn.addEventListener("click", () => {
  addPlaceModal.classList.remove("hidden");
  
  // Close the hamburger menu
  document.getElementById("menu-options").classList.add("hidden");
  document.getElementById("menu-toggle").classList.remove("active");
});

cancelFormBtn.addEventListener("click", () => {
  addPlaceModal.classList.add("hidden");
  addForm.reset();
});

// Close modal when clicking outside
addPlaceModal.addEventListener("click", (e) => {
  if (e.target === addPlaceModal) {
    addPlaceModal.classList.add("hidden");
    addForm.reset();
  }
});

addForm.addEventListener("submit", e => {
  e.preventDefault();
  const regionValue = document.getElementById("new-region").value;
  const capitalizedRegion = regionValue.charAt(0).toUpperCase() + regionValue.slice(1).toLowerCase();
  
  // Get coordinates and validate format if provided
  const coordinatesInput = document.getElementById("new-coordinates").value.trim();
  let coordinates = null;
  
  if (coordinatesInput) {
    // Validate coordinates format (lat,lng or lat, lng)
    const coordPattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
    if (!coordPattern.test(coordinatesInput)) {
      alert("Invalid coordinates format. Please use: latitude,longitude (e.g., 21.3099,-157.8581)");
      return;
    }
    
    // Additional validation to check lat/lng ranges
    const [lat, lng] = coordinatesInput.split(',').map(coord => parseFloat(coord.trim()));
    if (lat < -90 || lat > 90) {
      alert("Latitude must be between -90 and 90 degrees");
      return;
    }
    if (lng < -180 || lng > 180) {
      alert("Longitude must be between -180 and 180 degrees");
      return;
    }
    
    coordinates = coordinatesInput;
  }
  
  const newItem = {
  name: document.getElementById("new-name").value,
  description: document.getElementById("new-description").value,
  maps: document.getElementById("new-maps").value,
  coordinates: coordinates,
  type: Array.from(document.querySelectorAll("#new-type-options input:checked"))
            .map(cb => cb.value),
  region: capitalizedRegion,
  town: document.getElementById("new-town").value,
  notes: document.getElementById("new-notes").value,
  done: false
};

  data.push(newItem);
  
  calculateDistances();
  
  saveLocalState();
  populateFilters();
  render();

  addForm.reset();
  addPlaceModal.classList.add("hidden");
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

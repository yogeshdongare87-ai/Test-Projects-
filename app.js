// =====================================================
// GITHUB REPOSITORY CONFIGURATION
// =====================================================
const GITHUB_USERNAME = "yogeshdongare87-ai";
const GITHUB_REPO = "Survey-Number-Maps";
const GITHUB_BRANCH = "main"; 

const MAPS_BASE_PATH = "./data/maps";

// Global State
let locationData = {};
let polygonLayer = null;
let lineLayer = null;
let pointLayer = null;
let selectedFeatureLayer = null;
let selectedFeatureType = null;
let lastSelectedProperties = null;

// DOM Elements
const districtSelect = document.getElementById("districtSelect");
const talukaSelect = document.getElementById("talukaSelect");
const villageSelect = document.getElementById("villageSelect");
const loadMapBtn = document.getElementById("loadMapBtn");
const surveySearch = document.getElementById("surveySearch");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const printBtn = document.getElementById("printBtn");
const infoPanel = document.getElementById("infoPanel");

// =====================================================
// MAP INITIALIZATION & SWITCHER BASE LAYERS
// =====================================================
const map = L.map("map").setView([20.9374, 77.7796], 8);

const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: "© OpenStreetMap"
});

const googleSatLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}", {
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: "© Google Maps"
});

const esriSatLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Tiles © Esri"
});

googleSatLayer.addTo(map);

const baseLayers = {
    "🛰️ Google Satellite": googleSatLayer,
    "🌍 Esri Satellite": esriSatLayer,
    "🗺️ Standard Map": osmLayer
};

L.control.layers(baseLayers, null, { position: "topright" }).addTo(map);

// Add Geoman Measure Controls
map.pm.addControls({
    position: 'topleft',
    drawCircleMarker: false,
    drawCircle: false,
    cutPolygon: false,
    rotateMode: false
});

// =====================================================
// ROAD LINE SYMBOLOGY
// =====================================================
function getRoadLineStyle(feature) {
    const props = feature.properties || {};
    const typeStr = String(
        props.type || props.road_type || props.rasta_type || props.class || props.category || props.name || ""
    ).toLowerCase();

    if (typeStr.includes("tar") || typeStr.includes("pakka") || typeStr.includes("highway") || typeStr.includes("main")) {
        return { color: "#dc2626", weight: 4, opacity: 0.9 }; 
    } else if (typeStr.includes("kachha") || typeStr.includes("cart") || typeStr.includes("gravel")) {
        return { color: "#d97706", weight: 3, dashArray: "6, 6", opacity: 0.9 }; 
    } else if (typeStr.includes("foot") || typeStr.includes("path") || typeStr.includes("paya")) {
        return { color: "#475569", weight: 2, dashArray: "2, 5", opacity: 0.85 }; 
    } else if (typeStr.includes("nala") || typeStr.includes("river") || typeStr.includes("water")) {
        return { color: "#0284c7", weight: 3, opacity: 0.9 }; 
    }

    return { color: "#e11d48", weight: 3, opacity: 0.85 };
}

// =====================================================
// REAL-TIME REPOSITORY DISCOVERY
// =====================================================
async function fetchRepoFoldersRealTime() {
    districtSelect.innerHTML = `<option value="">Loading real-time folders...</option>`;

    let url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;

    try {
        let res = await fetch(url);

        if (!res.ok && res.status === 404) {
            url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/git/trees/master?recursive=1`;
            res = await fetch(url);
        }

        if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);

        const data = await res.json();
        locationData = {};

        data.tree.forEach(item => {
            const parts = item.path.split("/");

            if (parts.length >= 5 && parts[0].toLowerCase() === "data" && parts[1].toLowerCase() === "maps") {
                const district = parts[2];
                const taluka = parts[3];
                const village = parts[4];
                const fileName = parts[5] || parts[parts.length - 1];

                if (fileName.toLowerCase().endsWith(".geojson")) {
                    if (!locationData[district]) locationData[district] = {};
                    if (!locationData[district][taluka]) locationData[district][taluka] = {};
                    if (!locationData[district][taluka][village]) {
                        locationData[district][taluka][village] = { polygonFile: null, lineFile: null };
                    }

                    const lowerName = fileName.toLowerCase();
                    if (lowerName.includes("polygon")) {
                        locationData[district][taluka][village].polygonFile = fileName;
                    } else if (lowerName.includes("line")) {
                        locationData[district][taluka][village].lineFile = fileName;
                    }
                }
            }
        });

        populateDistricts();

    } catch (err) {
        console.error("Error fetching repository tree:", err);
        districtSelect.innerHTML = `<option value="">Failed to load folders</option>`;
        alert("Failed to load real-time folder data from GitHub.");
    }
}

function populateDistricts() {
    districtSelect.innerHTML = `<option value="">Select District</option>`;
    const districts = Object.keys(locationData).sort();

    if (districts.length === 0) {
        districtSelect.innerHTML = `<option value="">No valid map folders found</option>`;
        return;
    }

    districts.forEach(d => {
        districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
}

districtSelect.addEventListener("change", function () {
    talukaSelect.innerHTML = `<option value="">Select Taluka</option>`;
    villageSelect.innerHTML = `<option value="">Select Village</option>`;
    talukaSelect.disabled = !this.value;
    villageSelect.disabled = true;
    loadMapBtn.disabled = true;

    if (this.value && locationData[this.value]) {
        Object.keys(locationData[this.value]).sort().forEach(t => {
            talukaSelect.innerHTML += `<option value="${t}">${t}</option>`;
        });
    }
});

talukaSelect.addEventListener("change", function () {
    villageSelect.innerHTML = `<option value="">Select Village</option>`;
    villageSelect.disabled = !this.value;
    loadMapBtn.disabled = true;

    if (this.value && locationData[districtSelect.value][this.value]) {
        Object.keys(locationData[districtSelect.value][this.value]).sort().forEach(v => {
            villageSelect.innerHTML += `<option value="${v}">${v}</option>`;
        });
    }
});

villageSelect.addEventListener("change", function () {
    loadMapBtn.disabled = !this.value;
});

fetchRepoFoldersRealTime();
loadMapBtn.addEventListener("click", loadVillageMap);

// =====================================================
// GEOJSON MAP LOADER
// =====================================================
async function loadVillageMap() {
    const d = districtSelect.value;
    const t = talukaSelect.value;
    const v = villageSelect.value;

    clearMapLayers();

    const villageInfo = locationData[d]?.[t]?.[v];
    if (!villageInfo) return alert("Selected village data is unavailable.");

    const folderPath = `${MAPS_BASE_PATH}/${encodeURIComponent(d)}/${encodeURIComponent(t)}/${encodeURIComponent(v)}`;
    let loadedPolyData = null;
    let loadedLineData = null;

    try {
        if (villageInfo.polygonFile) {
            const polyRes = await fetch(`${folderPath}/${encodeURIComponent(villageInfo.polygonFile)}`);
            if (polyRes.ok) {
                loadedPolyData = await polyRes.json();
                polygonLayer = L.geoJSON(loadedPolyData, {
                    style: { color: "#4f46e5", weight: 1.5, fillColor: "#818cf8", fillOpacity: 0.35 },
                    onEachFeature: (feature, layer) => setupFeatureEvents(feature, layer, 'polygon')
                }).addTo(map);

                map.fitBounds(polygonLayer.getBounds(), { padding: [20, 20] });
            }
        }

        if (villageInfo.lineFile) {
            const lineRes = await fetch(`${folderPath}/${encodeURIComponent(villageInfo.lineFile)}`);
            if (lineRes.ok) {
                loadedLineData = await lineRes.json();
                lineLayer = L.geoJSON(loadedLineData, {
                    style: (feature) => getRoadLineStyle(feature),
                    onEachFeature: (feature, layer) => setupFeatureEvents(feature, layer, 'line')
                }).addTo(map);
            }
        }

        if (loadedPolyData || loadedLineData) {
            showInitialDashboardInfo(d, t, v);
            generateVillageReport(loadedPolyData, loadedLineData);
        } else {
            alert(`No GeoJSON files found for "${v}".`);
        }

    } catch (error) {
        console.error("Error fetching map files:", error);
        alert("Failed to load map layers from GitHub.");
    }
}

// =====================================================
// MAP CLICK & PARCEL TEXT LABELS
// =====================================================
function setupFeatureEvents(feature, layer, type) {
    if (type === 'polygon' && feature.properties) {
        let labelText = "";

        for (let key of Object.keys(feature.properties)) {
            if (key.toLowerCase() === "text") {
                labelText = feature.properties[key];
                break;
            }
        }

        if (labelText) {
            layer.bindTooltip(String(labelText), {
                permanent: true,
                direction: "center",
                className: "parcel-label"
            });
        }
    }

    layer.on({
        click: function (e) {
            L.DomEvent.stopPropagation(e);
            selectFeature(feature, layer, type);
        }
    });
}

function selectFeature(feature, layer, type) {
    if (selectedFeatureLayer) {
        if (selectedFeatureType === 'polygon' && polygonLayer) polygonLayer.resetStyle(selectedFeatureLayer);
        if (selectedFeatureType === 'line' && lineLayer) lineLayer.resetStyle(selectedFeatureLayer);
    }

    selectedFeatureLayer = layer;
    selectedFeatureType = type;
    lastSelectedProperties = { properties: feature.properties, layer: layer, type: type };

    if (type === 'polygon') {
        layer.setStyle({ color: "#fbbf24", weight: 3, fillColor: "#fef3c7", fillOpacity: 0.7 });
    } else if (type === 'line') {
        layer.setStyle({ color: "#fbbf24", weight: 6 });
    }

    layer.bringToFront();

    if (layer.getBounds) {
        map.fitBounds(layer.getBounds(), { maxZoom: 18 });
    }

    showFeatureDashboard(feature.properties, type, layer);
}

// =====================================================
// DASHBOARD & INFO PANEL + AUTOMATIC AREA CALCULATOR
// =====================================================
function showFeatureDashboard(properties, type, layer) {
    let title = type === 'polygon' ? "🌾 Parcel / Gat Details" : "🛣️ Road / Line Details";
    infoPanel.innerHTML = `<h2>${title}</h2>`;

    if (type === 'polygon' && layer && layer.toGeoJSON) {
        try {
            const geojson = layer.toGeoJSON();
            const areaSqMeters = turf.area(geojson);
            const areaHectares = (areaSqMeters / 10000).toFixed(4);

            infoPanel.innerHTML += `
                <div class="info-row" style="background:#e0e7ff; padding: 6px 8px; border-radius:4px; margin-bottom: 8px;">
                    <span class="info-label" style="color:#3730a3;">Calculated Area</span>
                    <span class="info-value" style="color:#3730a3; font-weight:700;">${areaHectares} Ha (${areaSqMeters.toFixed(0)} m²)</span>
                </div>
            `;
        } catch (err) {
            console.error("Area calculation error:", err);
        }
    }

    if (!properties || Object.keys(properties).length === 0) {
        infoPanel.innerHTML += `<div class="empty-state">No detailed attributes available for this feature.</div>`;
        return;
    }

    let html = "";
    Object.entries(properties).forEach(([key, value]) => {
        html += `
        <div class="info-row">
            <span class="info-label">${key}</span>
            <span class="info-value">${value !== null ? value : "-"}</span>
        </div>`;
    });
    infoPanel.innerHTML += html;
}

function showInitialDashboardInfo(d, t, v) {
    infoPanel.innerHTML = `
        <h2>🌍 Loaded Area</h2>
        <div class="info-row"><span class="info-label">District</span><span class="info-value">${d}</span></div>
        <div class="info-row"><span class="info-label">Taluka</span><span class="info-value">${t}</span></div>
        <div class="info-row"><span class="info-label">Village</span><span class="info-value">${v}</span></div>
        <div class="empty-state">👆 Click on any Parcel or Road to view details here.</div>
    `;
}

// =====================================================
// GENERATE VILLAGE SUMMARY REPORT
// =====================================================
function generateVillageReport(polyData, lineData) {
    let totalParcelsCount = 0;
    let totalAreaSqM = 0;
    let pakkaRoadMeters = 0;
    let kachhaRoadMeters = 0;

    if (polyData && polyData.features) {
        totalParcelsCount = polyData.features.length;
        polyData.features.forEach(f => {
            try { totalAreaSqM += turf.area(f); } catch(e){}
        });
    }

    if (lineData && lineData.features) {
        lineData.features.forEach(f => {
            try {
                const lengthMeters = turf.length(f, { units: 'kilometers' });
                const props = f.properties || {};
                const typeStr = String(props.type || props.road_type || props.rasta_type || "").toLowerCase();

                if (typeStr.includes("tar") || typeStr.includes("pakka") || typeStr.includes("highway")) {
                    pakkaRoadMeters += lengthMeters;
                } else {
                    kachhaRoadMeters += lengthMeters;
                }
            } catch(e){}
        });
    }

    document.getElementById("totalParcels").innerText = totalParcelsCount;
    document.getElementById("totalArea").innerText = (totalAreaSqM / 10000).toFixed(2) + " Ha";
    document.getElementById("pakkaRoadLen").innerText = pakkaRoadMeters.toFixed(2) + " km";
    document.getElementById("kachhaRoadLen").innerText = kachhaRoadMeters.toFixed(2) + " km";
}

// =====================================================
// SEARCH FUNCTIONALITY
// =====================================================
searchBtn.addEventListener("click", searchSurveyNumber);
surveySearch.addEventListener("keydown", (e) => { if (e.key === "Enter") searchSurveyNumber(); });

function searchSurveyNumber() {
    const rawSearch = surveySearch.value.trim().toLowerCase();
    if (!rawSearch) return alert("Enter Survey / Gat Number.");
    if (!polygonLayer) return alert("Please load a village map first.");

    let targetLayer = null;

    polygonLayer.eachLayer(layer => {
        if (targetLayer) return;

        const props = layer.feature.properties;
        if (!props) return;

        for (let key of Object.keys(props)) {
            if (key.toLowerCase() === "text") {
                const valStr = String(props[key]).trim().toLowerCase();
                if (valStr === rawSearch || valStr.split('/')[0] === rawSearch || valStr.split('-')[0] === rawSearch) {
                    targetLayer = layer;
                    return;
                }
            }
        }
    });

    if (targetLayer) {
        selectFeature(targetLayer.feature, targetLayer, 'polygon');
    } else {
        alert(`Survey/Gat Number "${surveySearch.value}" not found in Text attribute.`);
    }
}

clearBtn.addEventListener("click", function () {
    surveySearch.value = "";
    if (selectedFeatureLayer) {
        if (selectedFeatureType === 'polygon' && polygonLayer) polygonLayer.resetStyle(selectedFeatureLayer);
        if (selectedFeatureType === 'line' && lineLayer) lineLayer.resetStyle(selectedFeatureLayer);
    }
    selectedFeatureLayer = null;
    selectedFeatureType = null;
    lastSelectedProperties = null;

    infoPanel.innerHTML = `
        <h2>📋 Feature Details</h2>
        <div class="empty-state">Select a parcel (land) or road on the map to see details here.</div>
    `;
});

// =====================================================
// STRICT SINGLE SELECTED PARCEL PRINT LOGIC
// =====================================================
printBtn.addEventListener("click", function () {
    if (!lastSelectedProperties) {
        return alert("कृपया पहले नक्शे पर किसी सर्वे नंबर/प्लॉट पर क्लिक करें या सर्च करें, उसके बाद ही प्रिंट लें।");
    }

    const { properties, layer, type } = lastSelectedProperties;
    const printContent = document.getElementById("printContent");
    document.getElementById("printDate").innerText = new Date().toLocaleDateString();

    let areaHtml = "";
    if (type === 'polygon' && layer && layer.toGeoJSON) {
        try {
            const geojson = layer.toGeoJSON();
            const areaSqMeters = turf.area(geojson);
            const areaHectares = (areaSqMeters / 10000).toFixed(4);
            areaHtml = `
                <tr>
                    <th>Calculated Area</th>
                    <td><strong>${areaHectares} Hectares</strong> (${areaSqMeters.toFixed(2)} m²)</td>
                </tr>
            `;
        } catch (e) {}
    }

    let locationInfo = `
        <tr><th>District</th><td>${districtSelect.value || '-'}</td></tr>
        <tr><th>Taluka</th><td>${talukaSelect.value || '-'}</td></tr>
        <tr><th>Village</th><td>${villageSelect.value || '-'}</td></tr>
    `;

    let attrRows = "";
    if (properties) {
        Object.entries(properties).forEach(([k, v]) => {
            attrRows += `<tr><th>${k}</th><td>${v !== null ? v : "-"}</td></tr>`;
        });
    }

    printContent.innerHTML = `
        <table class="print-table">
            ${locationInfo}
            ${areaHtml}
            ${attrRows}
        </table>
    `;

    window.print();
});

function clearMapLayers() {
    if (polygonLayer) map.removeLayer(polygonLayer);
    if (lineLayer) map.removeLayer(lineLayer);
    if (pointLayer) map.removeLayer(pointLayer);
    polygonLayer = lineLayer = pointLayer = null;
    selectedFeatureLayer = selectedFeatureType = null;
    lastSelectedProperties = null;
}

// =====================================================
// SINGLE SELECTED PARCEL PRINT LOGIC WITH MAP PREVIEW
// =====================================================
printBtn.addEventListener("click", function () {
    if (!lastSelectedProperties) {
        return alert("Please select or search a survey number on the map first before printing.");
    }

    const { properties, layer, type } = lastSelectedProperties;
    const printContent = document.getElementById("printContent");
    document.getElementById("printDate").innerText = new Date().toLocaleDateString();

    let areaHtml = "";
    let centerLat = 20.9374;
    let centerLng = 77.7796;

    // अगर पॉलीगॉन सेलेक्टेड है तो उसका एरिया निकालें और सेंटर कोऑर्डिनेट्स लें
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

            // मैप का सेंटर लेटीट्यूड और लोंगिट्यूड निकालना
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            centerLat = center.lat;
            centerLng = center.lng;

        } catch (e) {
            console.error(e);
        }
    }

    // सर्वे / गट नंबर निकालना
    let surveyNo = "-";
    if (properties) {
        for (let key of Object.keys(properties)) {
            if (key.toLowerCase() === "text" || key.toLowerCase() === "survey_no" || key.toLowerCase() === "gat_no") {
                surveyNo = properties[key];
                break;
            }
        }
    }

    let locationInfo = `
        <tr><th>District</th><td>${districtSelect.value || '-'}</td></tr>
        <tr><th>Taluka</th><td>${talukaSelect.value || '-'}</td></tr>
        <tr><th>Village</th><td>${villageSelect.value || '-'}</td></tr>
        <tr><th>Survey / Gat No.</th><td><strong>${surveyNo}</strong></td></tr>
    `;

    let attrRows = "";
    if (properties) {
        Object.entries(properties).forEach(([k, v]) => {
            attrRows += `<tr><th>${k}</th><td>${v !== null ? v : "-"}</td></tr>`;
        });
    }

    // OpenStreetMap/Google का स्टैटिक मैप लेआउट जोड़ना
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=17&size=600x350&maptype=hybrid&markers=color:red%7C${centerLat},${centerLng}`;

    printContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 5px;">Map Location Preview:</div>
            <img src="${staticMapUrl}" style="width: 100%; max-width: 500px; height: 250px; border: 2px solid #333; border-radius: 6px; object-fit: cover;" onerror="this.style.display='none';" />
        </div>
        <table class="print-table">
            ${locationInfo}
            ${areaHtml}
            ${attrRows}
        </table>
    `;

    // मैप लोड होने के लिए थोड़ा समय देकर प्रिंट डायलॉग खोलें
    setTimeout(() => {
        window.print();
    }, 500);
});

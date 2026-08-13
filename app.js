// =====================================================
// REAL-TIME REPOSITORY DISCOVERY (AUTO-DETECT GEOJSON)
// =====================================================
async function fetchRepoFoldersRealTime() {
    districtSelect.innerHTML = `<option value="">Loading districts...</option>`;

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
            const pathParts = item.path.split("/");
            
            // Check for path format: data/maps/District/Taluka/Village/filename.geojson
            if (pathParts.length >= 5 && pathParts[0].toLowerCase() === "data" && pathParts[1].toLowerCase() === "maps") {
                const district = pathParts[2];
                const taluka = pathParts[3];
                const village = pathParts[4];
                const fileName = pathParts[pathParts.length - 1];

                if (fileName.toLowerCase().endsWith(".geojson")) {
                    if (!locationData[district]) locationData[district] = {};
                    if (!locationData[district][taluka]) locationData[district][taluka] = {};
                    if (!locationData[district][taluka][village]) {
                        locationData[district][taluka][village] = { polygonFile: null, lineFile: null };
                    }

                    const lowerName = fileName.toLowerCase();
                    if (lowerName.includes("line") || lowerName.includes("road") || lowerName.includes("rasta")) {
                        locationData[district][taluka][village].lineFile = fileName;
                    } else {
                        // अगर फ़ाइल में polygon नहीं भी लिखा है, तब भी इसे मेन नक्शे की तरह लोड करो
                        if (!locationData[district][taluka][village].polygonFile) {
                            locationData[district][taluka][village].polygonFile = fileName;
                        }
                    }
                }
            }
        });

        populateDistricts();

    } catch (err) {
        console.error("Error fetching repository tree:", err);
        districtSelect.innerHTML = `<option value="">Failed to load folders</option>`;
        alert("Failed to load map folders from GitHub. Check GitHub username and repo settings.");
    }
}

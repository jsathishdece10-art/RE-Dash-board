const themeToggle = document.getElementById("themeToggle");
const trackingBody = document.getElementById("trackingBody");
const searchInput = document.getElementById("searchInput");
const excelStatus = document.getElementById("excelStatus");
const stageName = (document.body.dataset.stage || "").toLowerCase();

let usnData = [];

// THEME
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        themeToggle.textContent =
            document.body.classList.contains("dark-mode") ? "☀️ Light" : "🌙 Dark";
    });
}

// STATUS
function getStatusClass(status) {
    const value = (status || "").toLowerCase();

    if (value.includes("completed") || value.includes("pass")) return "completed";
    if (value.includes("pending") || value.includes("waiting") || value.includes("hold")) return "pending";
    return "progress";
}

// CSV PARSE
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(",");

    return lines.slice(1).map(line => {
        const values = line.split(",");
        let obj = {};
        headers.forEach((h, i) => obj[h.trim()] = (values[i] || "").trim());
        return obj;
    });
}

// GROUP
function groupCSVData(rows) {
    const grouped = {};

    rows.forEach(row => {
        const usn = row.USN;
        if (!usn) return;

        if (!grouped[usn]) {
            grouped[usn] = {
                usn,
                id: row.ID,
                model: row.Model,
                stage: row["Current Stage"],
                status: row.Status,
                inTime: row["In Time"],
                outTime: row["Out Time"],
                operator: row.Operator,
                result: row.Result,
                remarks: row.Remarks,
                history: []
            };
        }

        grouped[usn].history.push({
            stage: row["History Stage"],
            time: row["History Time"],
            status: row["History Status"]
        });
    });

    return Object.values(grouped);
}

// LOAD CSV
async function loadCSVData() {
    const res = await fetch("data/usn_tracking.csv?v=" + Date.now());
    const text = await res.text();

    const raw = parseCSV(text);
    usnData = groupCSVData(raw);

    initPage();
    renderCharts();
}

// TABLE
function renderTrackingTable(data) {
    if (!trackingBody) return;
    const filter = getFilter();
    let filteredData = data;
    if (filter === "completed") {
        filteredData = data.filter(x =>
            (x.status || "").toLowerCase().includes("completed") ||
            (x.result || "").toLowerCase().includes("pass")
        );
    }
    else if (filter === "progress") {
        filteredData = data.filter(x =>
            (x.status || "").toLowerCase().includes("progress")
        );
    }
    else if (filter === "pending") {
        filteredData = data.filter(x =>
            (x.status || "").toLowerCase().includes("pending") ||
            (x.status || "").toLowerCase().includes("hold")
        );
    }
    trackingBody.innerHTML = "";

    filteredData.forEach((item, i) => {
        trackingBody.innerHTML += `
<tr>
<td><button onclick="toggleHistory(${i})" id="btn-${i}">+</button></td>
<td>${item.usn}</td>
<td>${item.id}</td>
<td>${item.model}</td>
<td>${item.stage}</td>
<td><span class="${getStatusClass(item.status)}">${item.status}</span></td>
<td>${item.inTime}</td>
<td>${item.outTime}</td>
<td>${item.operator}</td>
<td>${item.result}</td>
<td>${item.remarks}</td>
</tr>

<tr id="history-${i}" style="display:none;">
<td colspan="11">
${item.history.map(h => `
<div>${h.stage} | ${h.time} | ${h.status}</div>
`).join("")}
</td>
</tr>
`;
    });
}

// TOGGLE
function toggleHistory(i) {
    const row = document.getElementById("history-" + i);
    const btn = document.getElementById("btn-" + i);

    if (row.style.display === "none") {
        row.style.display = "table-row";
        btn.textContent = "-";
    } else {
        row.style.display = "none";
        btn.textContent = "+";
    }
}
window.toggleHistory = toggleHistory;

// HOME
function renderHomeDashboard() {
    const totalEl = document.getElementById("totalUnits");
    const completedEl = document.getElementById("completedUnits");
    const progressEl = document.getElementById("progressUnits");
    const pendingEl = document.getElementById("pendingUnits");

    const total = usnData.length;

    console.log("DATA:", usnData);

    const completed = usnData.filter(x =>
        (x.status || "").toLowerCase().includes("completed") ||
        (x.result || "").toLowerCase().includes("pass")
    ).length;

    const pending = usnData.filter(x =>
        (x.status || "").toLowerCase().includes("pending") ||
        (x.status || "").toLowerCase().includes("waiting") ||
        (x.status || "").toLowerCase().includes("hold")
    ).length;

    const progress = total - completed -
        pending;

    totalEl.textContent = total;
    completedEl.textContent = completed;
    progressEl.textContent = progress;
    pendingEl.textContent = pending;
    const body = document.getElementById("homeTableBody");
    if (!body) return;

    body.innerHTML = "";
    usnData.slice(0, 5).forEach(item => {
        const row = `
<tr>
<td>${item.usn || ""}</td>
<td>${item.id || ""}</td>
<td>${item.model || ""}</td>
<td>${item.currentStage || ""}</td>
<td>${item.status || ""}</td>
<td>${item.operator || ""}</td>
</tr>
`;
        body.innerHTML += row;
    });
    // TOTAL CLICK
    totalEl.onclick = () => {
        window.location.href = "tracking.html?filter=all";
    };

    // COMPLETED CLICK
    completedEl.onclick = () => {
        window.location.href = "tracking.html?filter=completed";
    };

    // IN PROGRESS CLICK
    progressEl.onclick = () => {
        window.location.href = "tracking.html?filter=progress";
    };

    // PENDING CLICK
    pendingEl.onclick = () => {
        window.location.href = "tracking.html?filter=pending";
    };

    
}

       
    usnData.slice(0, 10).forEach(item => {
        body.innerHTML += `
<tr>
<td>${item.usn}</td>
<td>${item.id}</td>
<td>${item.model}</td>
<td>${item.stage}</td>
<td>${item.status}</td>
<td>${item.operator}</td>
</tr>
`;
    });

// SET TEXT
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// CHARTS
function renderCharts() {

    const bar = document.getElementById("barChart");
    const pie = document.getElementById("pieChart");

    if (!bar || !pie) return;

    let count = {};

    usnData.forEach(item => {
        let stage = item.stage || "Unknown";
        count[stage] = (count[stage] || 0) + 1;
    });

    new Chart(bar, {
        type: "bar",
        data: {
            labels: Object.keys(count),
            datasets: [{
                label: "Stage Count",
                data: Object.values(count),
                backgroundColor: "#16a34a"
            }]
        }
    });

    new Chart(pie, {
        type: "pie",
        data: {
            labels: Object.keys(count),
            datasets: [{
                data: Object.values(count),
                backgroundColor: [
                    "#16a34a",
                    "#2563eb",
                    "#f59e0b",
                    "#ef4444",
                    "#9333ea"
                ]
            }]
        }
    });
}
const pageType = window.location.pathname.includes("home") ? "home" : "tracking";
// ROUTER
function initPage() {
    if (pageType === "tracking") {
        renderTrackingTable(usnData);
    } else if (pageType === "home") {
        renderHomeDashboard();
    }
}

// START
document.addEventListener("DOMContentLoaded", loadCSVData);
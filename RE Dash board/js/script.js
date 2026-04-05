// GLOBAL
const trackingBody = document.getElementById("trackingBody");
const stageBody = document.getElementById("stageTableBody");

let usnData = [];
let statusFilter = "all";

// =======================
// CSV PARSE
// =======================
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(",");

    return lines.slice(1).map(line => {
        const values = line.split(",");
        let obj = {};
        headers.forEach((h, i) => {
            obj[h.trim().toLowerCase().replace(/\s+/g, "")] = (values[i] || "").trim();
        });
        return obj;
    });
}

// =======================
// GROUP DATA (USN BASE)
// =======================
function groupCSVData(rows) {
    const grouped = {};

    rows.forEach(row => {
        const usn = row.usn;
        if (!usn) return;

        if (!grouped[usn]) {
            grouped[usn] = {
                usn: row.usn,
                id: row.id,
                model: row.model,
                stage: row.currentstage || "",
                status: row.status || "",
                intime: row.intime || "",
                outtime: row.outtime || "",
                operator: row.operator || "",
                result: row.result || "",
                remarks: row.remarks || "",
                history: []
            };
        }

        // update latest stage
        grouped[usn].stage = row.currentstage || "";
        grouped[usn].status = row.status || "";
        grouped[usn].intime = row.intime || "";
        grouped[usn].outtime = row.outtime || "";
        grouped[usn].operator = row.operator || "";

        // history
        grouped[usn].history.push({
            stage: row.currentstage || "",
            time: row.intime || "",
            status: row.status || ""
        });
    });

    return Object.values(grouped);
}

// =======================
// LOAD CSV
// =======================
async function loadCSVData() {
    const res = await fetch("data/usn_tracking.csv?v=" + Date.now());
    const text = await res.text();

    const raw = parseCSV(text);
    usnData = groupCSVData(raw);

    initPage();
}

// =======================
// STATUS STYLE
// =======================
function getStatusClass(status) {
    const s = (status || "").toLowerCase();

    if (s.includes("complete") || s.includes("pass")) return "completed";
    if (s.includes("pending") || s.includes("hold")) return "pending";
    return "progress";
}

// =======================
// MAIN TABLE RENDER
// =======================
function renderTrackingTable(data) {

    const body =
        document.getElementById("trackingBody") ||
        document.getElementById("stageTableBody");

    if (!body) return;

    body.innerHTML = "";

    data.forEach((item, i) => {

        body.innerHTML += `
<tr>
<td><button onclick="toggleHistory(${i})">+</button></td>
<td>${item.usn}</td>
<td>${item.id}</td>
<td>${item.model}</td>
<td>${item.stage}</td>
<td><span class="${getStatusClass(item.status)}">${item.status}</span></td>
<td>${item.intime}</td>
<td>${item.outtime}</td>
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

// =======================
// TOGGLE HISTORY
// =======================
function toggleHistory(i) {
    const row = document.getElementById("history-" + i);

    if (row.style.display === "none") {
        row.style.display = "table-row";
    } else {
        row.style.display = "none";
    }
}
window.toggleHistory = toggleHistory;

// =======================
// HOME DASHBOARD
// =======================
function renderHomeDashboard() {
    const total = usnData.length;
    const completed = usnData.filter(x => x.status.toLowerCase().includes("completed")).length;
    const pending = usnData.filter(x => x.status.toLowerCase().includes("pending")).length;
    const progress = total - completed - pending;

    document.getElementById("totalUnits").innerText = total;
    document.getElementById("completedUnits").innerText = completed;
    document.getElementById("pendingUnits").innerText = pending;
    document.getElementById("progressUnits").innerText = progress;

    // 🔥 LATEST 5 UNITS (IMPORTANT)
    const latest = [...usnData].reverse().slice(0, 5);

    let html = "";
    latest.forEach(item => {
        html += `
<tr>
<td>${item.usn}</td>
<td>${item.id}</td>
<td>${item.model}</td>
<td>${item.stage || ""}</td>
<td>${item.status}</td>
<td>${item.operator}</td>
</tr>
`;
    });

    document.getElementById("latestBody").innerHTML = html;
}

// =======================
// ROUTER
// =======================
function initPage() {

    const path = window.location.pathname.toLowerCase();

    if (path.includes("tracking")) {
        renderTrackingTable(usnData);
    }
    else if (path.includes("fa")) {
        const faData = usnData.filter(x =>
            (x.stage || "").toLowerCase().includes("fa")
        );
        let filtered = faData;

        if (currentFilter !== "all") {
            filtered = faData.filter(item =>
                (item.status || "").toLowerCase().includes(currentFilter)
            );
        }

        renderTrackingTable(filtered);
    }
    else if (path.includes("rework")) {
        const reworkData = usnData.filter(x =>
            (x.stage || "").toLowerCase().includes("rework")
        );
        let filtered = reworkData;

        if (currentFilter !== "all") {
            filtered = reworkData.filter(item =>
                (item.status || "").toLowerCase().includes(currentFilter)
            );
        }

        renderTrackingTable(filtered);
    }
    else if (path.includes("warehouse")) {
        const data = usnData.filter(x =>
            (x.stage || "").toLowerCase().includes("warehouse")
        );
        let filtered = data;

        if (currentFilter !== "all") {
            filtered = data.filter(item =>
                (item.status || "").toLowerCase().includes(currentFilter)
            );
        }

        renderTrackingTable(filtered);
    }

    else if (path.includes("vi")) {
        const data = usnData.filter(x =>
            (x.stage || "").toLowerCase().includes("vi")
        );
        let filtered = data;

        if (currentFilter !== "all") {
            filtered = data.filter(item =>
                (item.status || "").toLowerCase().includes(currentFilter)
            );
        }

        renderTrackingTable(filtered);
    }

    else if (path.includes("sma")) {
        const data = usnData.filter(x =>
            (x.stage || "").toLowerCase().includes("sma")
        );
        let filtered = data;

        if (currentFilter !== "all") {
            filtered = data.filter(item =>
                (item.status || "").toLowerCase().includes(currentFilter)
            );
        }

        renderTrackingTable(filtered);
    }

    else if (path.includes("testing")) {
        const data = usnData.filter(x =>
            (x.stage || "").toLowerCase().includes("testing")
        );
        let filtered = data;

        if (currentFilter !== "all") {
            filtered = data.filter(item =>
                (item.status || "").toLowerCase().includes(currentFilter)
            );
        }

        renderTrackingTable(filtered);
    }
    else if (path.includes("home")) {
        renderHomeDashboard();
        renderTrackingTable(usnData);
        renderCharts(usnData);
    }
}
function renderCharts(data) {

    const stageCount = {};

    data.forEach(item => {
        const stage = item.stage || "Unknown";
        stageCount[stage] = (stageCount[stage] || 0) + 1;
    });

    // TOP 5
    const topStages = Object.entries(stageCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = topStages.map(x => x[0]);
    const values = topStages.map(x => x[1]);

    // BAR
    new Chart(document.getElementById("barChart"), {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Stage Count",
                data: values
            }]
        }
    });

    // PIE
    new Chart(document.getElementById("pieChart"), {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: values
            }]
        }
    });
}
let currentFilter = "all";

function applyFilter() {
currentFilter = document.getElementById("statusFilter").value;
initPage(); // reload current page
}
// =======================
// START
// =======================
document.addEventListener("DOMContentLoaded", loadCSVData);
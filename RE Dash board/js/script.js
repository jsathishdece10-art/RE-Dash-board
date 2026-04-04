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
function getFilter() {
    const params = new URLSearchParams(window.location.search);
    return params.get("filter") || "all";
}
// CSV PARSE
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(",");

    return lines.slice(1).map(line => {
        const values = line.split(",");
        let obj = {};
        headers.forEach((h, i) => obj[h.trim().toLowerCase()] = (values[i] || "").trim());
        return obj;
    });
}

// GROUP
function groupCSVData(rows) {
    const grouped = {};

    rows.forEach(row => {
        const usn = row.usn
        if (!usn) {
            console.warn("MISSING USN:", row);
            return;
        }
        if (!grouped[usn]) {
            grouped[usn] = {
usn: row.usn,
id: row.id,
model: row.model,
stage: (row["current stage"] || "").trim(),
status: row.status,
inTime: row["in time"],
outTime: row["out time"],
operator: row.operator,
result: row.result,
remarks: row.remarks,
history: []
};
        }

        grouped[usn].history.push({
            stage: row["History stage"],
            time: row["History Time"],
            status: row["History status"]
        });
    });

    return Object.values(grouped);
}
let statusFilter = "all";

function setStatusFilter(type) {
    statusFilter = type;
    renderTrackingTable(usnData);
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
    const filter = statusFilter;
    let filteredData = data;

    // Stage filter
    const pageStage = document.body.dataset.stage;

    if (pageStage) {
        filteredData = filteredData.filter(x =>
            (x.stage || "").toLowerCase().includes(pageStage)
        );
    }

    // Status filter
    if (filter === "completed") {
        filteredData = filteredData.filter(x =>
            (x["Status"] || "").toLowerCase().includes("completed") ||
            (x["result"] || "").toLowerCase().includes("pass")
        );
    }
    else if (filter === "progress") {
        filteredData = filteredData.filter(x =>
            (x["Status"] || "").toLowerCase().includes("progress")
        );
    }
    else if (filter === "pending") {
        filteredData = filteredData.filter(x =>
            (x["Status"] || "").toLowerCase().includes("pending") ||
            (x["Status"] || "").toLowerCase().includes("hold")
        );
    }
    else if (filter === "fg") {
        filteredData = filteredData.filter(x =>
            (x["result"] || "").toLowerCase().includes("fg")
        );
    }
    else if (filter === "scrap") {
        filteredData = filteredData.filter(x =>
            (x["result"] || "").toLowerCase().includes("scrap")
        );
    }
    function getTrackingBody() {
        return document.getElementById("trackingBody");
    }
    if (!trackingBody) return;
    trackingBody.innerHTML = "";
    const groupedData = {};

    data.forEach(row => {

        // If USN not exists → create new entry
        if (!groupedData[row.usn]) {
            groupedData[row.usn] = {
                usn: row.usn,
                id: row.id,
                model: row.model,
                stage: row["current stage"], // ✅ correct
                status: row["status"],
                inTime: row["in Time"],
                outTime: row["out Time"],
                operator: row["Operator"], // ✅ OK (if CSV same)
                result: row["result"], // ✅ correct
                remarks: row["remarks"], // 🔥 FIX (capital R)
                history: []
            };
        }

        // Add every row to history
        groupedData[row.usn].history.push({
            stage: row["current stage"] || "",
            time: row["in Time"] || "",
            status: row["status"] || ""
        });

        // Always update latest stage (last row wins)
        groupedData[row.usn].stage = row["current stage"];
        groupedData[row.usn].status = row["status"];
        groupedData[row.usn].inTime = row["inTime"];
        groupedData[row.usn].outTime = row["outTime"];
        groupedData[row.usn].operator = row["operator"];    });
    const finalData = Object.values(groupedData).filter((item, i) => {
        if (filter === "all") return true;
        if (filter === "progress") return item.status.toLowerCase().includes("progress");
        if (filter === "pending") return item.status.toLowerCase().includes("pending") || item.status.toLowerCase().includes("hold");
        if (filter === "completed") return item.status.toLowerCase().includes("completed");
    })
    finalData.reverse();
        finalData.forEach((item, i) => {

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
${item.history.map(function (h) {
            return `<div>${h.stage} | ${h.time} | ${h.status}</div>`;
        }).join("")}
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
            const body =
                document.getElementById("homeTableBody") ||
                document.getElementById("trackingBody") ||
                document.getElementById("stageTableBody");
            if (!body) return;

            body.innerHTML = "";
            usnData
                .filter(item =>
                    (item.stage || "").toLowerCase().includes("fa")
                )
                .forEach(item => {
                const row = `
<tr>
<td>${item.usn || ""}</td>
<td>${item.id || ""}</td>
<td>${item.model || ""}</td>
<td>${item.stage || ""}</td>
<td>${item["status"] || ""}</td>
<td>${item["operator"] || ""}</td>
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


//        usnData.slice(0, 10).forEach(item => {
//            body.innerHTML += `
//<tr>
//<td>${item.usn}</td>
//<td>${item.id}</td>
//<td>${item.model}</td>
//<td>${item.stage}</td>
//<td>${item.status}</td>
//<td>${item.operator}</td>
//</tr>
//`;
//        });

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
const path = window.location.pathname.toLowerCase();

let pageType = "tracking";

if (path.includes("home")) pageType = "home";
else if (path.includes("fa")) pageType = "fa";
else if (path.includes("rework")) pageType = "rework";
else if (path.includes("warehouse")) pageType = "warehouse";
else if (path.includes("vi")) pageType = "vi";
else if (path.includes("sma")) pageType = "sma";
else if (path.includes("testing")) pageType = "testing";
        // ROUTER
function initPage() {
    if (pageType === "tracking") {
        renderTrackingTable(usnData);
    }
    else if (pageType === "home") {
        renderHomeDashboard();
    }
    else if (pageType === "fa") {
        renderTrackingTable(
            usnData.filter(x =>
                (x.stage || "").toLowerCase().includes("fa")
            )
        );
    }
    else {
        renderTrackingTable(usnData);
    }
}

        // START
        document.addEventListener("DOMContentLoaded", loadCSVData);
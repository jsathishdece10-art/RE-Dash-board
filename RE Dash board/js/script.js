const themeToggle = document.getElementById("themeToggle");
const trackingBody = document.getElementById("trackingBody");
const searchInput = document.getElementById("searchInput");
const excelStatus = document.getElementById("excelStatus");
const pageType = document.body.dataset.page;
const stageName = (document.body.dataset.stage || "").toLowerCase();

let usnData = [];

// -----------------------------
// THEME TOGGLE
// -----------------------------
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        themeToggle.textContent = document.body.classList.contains("dark-mode")
            ? "☀️ Light"
            : "🌙 Dark";
    });
}

// -----------------------------
// STATUS COLOR
// -----------------------------
function getStatusClass(status) {
    const value = (status || "").toLowerCase();

    if (value.includes("completed") || value.includes("pass")) return "sold";
    if (value.includes("waiting") || value.includes("hold") || value.includes("pending")) return "pending";
    return "active";
}

// -----------------------------
// SAFE CSV PARSER
// -----------------------------
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]);

    return lines.slice(1).map(line => {
        const values = splitCSVLine(line);
        let obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = (values[i] || "").trim();
        });
        return obj;
    });
}

// Handles commas inside quoted CSV
function splitCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current);
    return result.map(v => v.replace(/^"|"$/g, ""));
}

// -----------------------------
// GROUP DATA BY USN
// -----------------------------
function groupCSVData(rows) {
    const grouped = {};

    rows.forEach(row => {
        const usn = (row.USN || "").trim();
        if (!usn) return;

        if (!grouped[usn]) {
            grouped[usn] = {
                usn: usn,
                id: row.ID || "",
                model: row.Model || "",
                stage: row["Current Stage"] || row.Stage || "",
                status: row.Status || "",
                inTime: row["In Time"] || "",
                outTime: row["Out Time"] || "",
                operator: row.Operator || "",
                result: row.Result || "",
                remarks: row.Remarks || "",
                history: []
            };
        }

        grouped[usn].history.push({
            stage: row["History Stage"] || row.Stage || "",
            time: row["History Time"] || row["In Time"] || "",
            status: row["History Status"] || row.Status || ""
        });

        grouped[usn].stage = row["Current Stage"] || row.Stage || grouped[usn].stage;
        grouped[usn].status = row.Status || grouped[usn].status;
        grouped[usn].inTime = row["In Time"] || grouped[usn].inTime;
        grouped[usn].outTime = row["Out Time"] || grouped[usn].outTime;
        grouped[usn].operator = row.Operator || grouped[usn].operator;
        grouped[usn].result = row.Result || grouped[usn].result;
        grouped[usn].remarks = row.Remarks || grouped[usn].remarks;
    });

    return Object.values(grouped);
}

// -----------------------------
// LOAD CSV AUTOMATICALLY
// -----------------------------
async function loadCSVData() {
    try {
        const response = await fetch("data/usn_tracking.csv?v=" + new Date().getTime());
        const text = await response.text();

        const rawData = parseCSV(text);
        usnData = groupCSVData(rawData);

        if (excelStatus) {
            excelStatus.textContent = `CSV loaded successfully (${usnData.length} USNs)`;
        }

        initPage();
    } catch (error) {
        console.error("CSV Load Error:", error);

        if (excelStatus) {
            excelStatus.textContent = "Error loading CSV file. Check data/usn_tracking.csv";
        }

        if (trackingBody) {
            trackingBody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align:center; padding:20px; color:red;">
            Failed to load CSV file.<br>
            Make sure file exists in: <b>data/usn_tracking.csv</b>
          </td>
        </tr>
      `;
        }
    }
}

// -----------------------------
// TRACKING TABLE
// -----------------------------
function renderTrackingTable(data) {
    if (!trackingBody) return;

    trackingBody.innerHTML = "";

    if (data.length === 0) {
        trackingBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center; padding:20px;">No records found</td>
      </tr>
    `;
        return;
    }

    data.forEach((item, index) => {
        trackingBody.innerHTML += `
      <tr>
        <td><button class="expand-btn" onclick="toggleHistory(${index})" id="btn-${index}">+</button></td>
        <td>${item.usn || "-"}</td>
        <td>${item.id || "-"}</td>
        <td>${item.model || "-"}</td>
        <td>${item.stage || "-"}</td>
        <td><span class="status ${getStatusClass(item.status)}">${item.status || "-"}</span></td>
        <td>${item.inTime || "-"}</td>
        <td>${item.outTime || "-"}</td>
        <td>${item.operator || "-"}</td>
        <td>${item.result || "-"}</td>
        <td>${item.remarks || "-"}</td>
      </tr>

      <tr id="history-${index}" class="history-row" style="display:none;">
        <td colspan="11">
          <div class="history-box">
            <div class="history-title">${item.usn} - Travel History</div>
            <div class="history-list">
              ${item.history.map(step => `
                <div class="history-item">
                  <strong>${step.stage || "-"}</strong>
                  <span>Time: ${step.time || "-"}</span><br>
                  <span>Status: ${step.status || "-"}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </td>
      </tr>
    `;
    });
}

// -----------------------------
// TOGGLE HISTORY
// -----------------------------
function toggleHistory(index) {
    const row = document.getElementById(`history-${index}`);
    const btn = document.getElementById(`btn-${index}`);

    if (!row || !btn) return;

    if (row.style.display === "none") {
        row.style.display = "table-row";
        btn.textContent = "−";
    } else {
        row.style.display = "none";
        btn.textContent = "+";
    }
}
window.toggleHistory = toggleHistory;

// -----------------------------
// SEARCH
// -----------------------------
if (searchInput) {
    searchInput.addEventListener("keyup", function () {
        const filter = searchInput.value.toLowerCase();

        const filteredData = usnData.filter(item =>
            (item.usn || "").toLowerCase().includes(filter) ||
            (item.id || "").toLowerCase().includes(filter) ||
            (item.model || "").toLowerCase().includes(filter) ||
            (item.stage || "").toLowerCase().includes(filter) ||
            (item.status || "").toLowerCase().includes(filter) ||
            (item.operator || "").toLowerCase().includes(filter) ||
            (item.result || "").toLowerCase().includes(filter) ||
            (item.remarks || "").toLowerCase().includes(filter)
        );

        renderTrackingTable(filteredData);
    });
}

// -----------------------------
// HOME PAGE
// -----------------------------
function renderHomeDashboard() {
    const totalUnitsEl = document.getElementById("totalUnits");
    const completedUnitsEl = document.getElementById("completedUnits");
    const progressUnitsEl = document.getElementById("progressUnits");
    const pendingUnitsEl = document.getElementById("pendingUnits");
    const homeTableBody = document.getElementById("homeTableBody");

    if (!totalUnitsEl || !completedUnitsEl || !progressUnitsEl || !pendingUnitsEl || !homeTableBody) return;

    const total = usnData.length;
    const completed = usnData.filter(item =>
        (item.status || "").toLowerCase().includes("completed") ||
        (item.result || "").toLowerCase().includes("pass")
    ).length;

    const pending = usnData.filter(item =>
        (item.status || "").toLowerCase().includes("pending") ||
        (item.status || "").toLowerCase().includes("waiting") ||
        (item.status || "").toLowerCase().includes("hold")
    ).length;

    const inProgress = total - completed - pending;

    totalUnitsEl.textContent = total;
    completedUnitsEl.textContent = completed;
    progressUnitsEl.textContent = inProgress;
    pendingUnitsEl.textContent = pending;

    homeTableBody.innerHTML = "";
    usnData.slice(0, 10).forEach(item => {
        homeTableBody.innerHTML += `
      <tr>
        <td>${item.usn}</td>
        <td>${item.id}</td>
        <td>${item.model}</td>
        <td>${item.stage}</td>
        <td><span class="status ${getStatusClass(item.status)}">${item.status}</span></td>
        <td>${item.operator}</td>
      </tr>
    `;
    });
}

// -----------------------------
// STAGE PAGE
// -----------------------------
function renderStagePage() {
    const stageTableBody = document.getElementById("stageTableBody");
    if (!stageTableBody) return;

    const filtered = usnData.filter(item => {
        const stage = (item.stage || "").toLowerCase();

        if (stageName === "fa") return stage.includes("fa");
        if (stageName === "rework") return stage.includes("rework");
        if (stageName === "warehouse") return stage.includes("warehouse") || stage.includes("wh");
        if (stageName === "vi") return stage.includes("vi");
        if (stageName === "sma") return stage.includes("sma");
        if (stageName === "testing") return stage.includes("test");
        return false;
    });

    stageTableBody.innerHTML = "";

    if (filtered.length === 0) {
        stageTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:20px;">No units in this stage</td>
      </tr>
    `;
        return;
    }

    filtered.forEach(item => {
        stageTableBody.innerHTML += `
      <tr>
        <td>${item.usn}</td>
        <td>${item.id}</td>
        <td>${item.model}</td>
        <td>${item.stage}</td>
        <td><span class="status ${getStatusClass(item.status)}">${item.status}</span></td>
        <td>${item.operator}</td>
        <td>${item.remarks}</td>
      </tr>
    `;
    });
}

// -----------------------------
// PAGE ROUTER
// -----------------------------
function initPage() {
    if (pageType === "tracking") {
        renderTrackingTable(usnData);
    } else if (pageType === "home") {
        renderHomeDashboard();
    } else if (pageType === "stage") {
        renderStagePage();
    }
}

// -----------------------------
// AUTO REFRESH EVERY 10 SECONDS
// -----------------------------
document.addEventListener("DOMContentLoaded", function () {
    loadCSVData();

    setInterval(() => {
        loadCSVData();
    }, 10000); // every 10 sec
    function renderChartSafe() {

        const ctx = document.getElementById("stageChart");
        if (!ctx) return;

        let count = {};

        usnData.forEach(item => {
            let stage = item.stage || "Unknown";
            count[stage] = (count[stage] || 0) + 1;
        });

        new Chart(ctx, {
            type: "bar",
            data: {
                labels: Object.keys(count),
                datasets: [{
                    label: "Stage Count",
                    data: Object.values(count)
                }]
            }
        });
    }
    function processDataForChart(data) {
        let rows = data.split("\n").slice(1); // header skip

        let stageCount = {};

        rows.forEach(row => {
            let cols = row.split(",");

            let stage = cols[5]; // Current Stage column index

            if (stage) {
                stage = stage.trim();

                if (!stageCount[stage]) {
                    stageCount[stage] = 0;
                }

                stageCount[stage]++;
            }
        });

        return stageCount;
    }
    function renderChart(stageCount) {
        let ctx = document.getElementById("stageChart");

        if (!ctx) return;

        new Chart(ctx, {
            type: "bar",
            data: {
                labels: Object.keys(stageCount),
                datasets: [{
                    label: "Stage Count",
                    data: Object.values(stageCount),
                    backgroundColor: [
                        "#4CAF50",
                        "#2196F3",
                        "#FF9800",
                        "#E91E63",
                        "#9C27B0",
                        "#00BCD4"
                    ]
                }]
            }
        });
    }
    function loadExcelData() {

        fetch("data.csv")
            .then(res => res.text())
            .then(data => {

                // 🔹 existing grid logic irukattum

                let stageCount = processDataForChart(data);

                renderChart(stageCount);

            });
    }
});
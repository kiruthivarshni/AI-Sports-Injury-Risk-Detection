/**
 * ExportButtons
 * Props:
 *   reportData  — full report object from GET /api/reports/{report_id}
 *   filename    — base filename without extension (default: "athenix-report")
 */
import * as XLSX from "xlsx";

// ─── Safe helpers ────────────────────────────────────────────────────────────
const safe = (v) => (v !== undefined && v !== null ? v : "—");
const safeNum = (v) => (typeof v === "number" ? v.toFixed(1) : v !== undefined && v !== null ? v : "—");
const arr = (v) => (Array.isArray(v) && v.length ? v : null);

/**
 * Resolve nested report shape.
 * Handles both:
 *   A) Full report_json: { movement_quality:{...}, injury_risk:{...},
 *        ai_findings:{...}, biomechanical_metrics:{...},
 *        recommendations:{...}, athlete:{...}, ... }
 *   B) Fallback DB shape: { movement_quality:{score,label},
 *        injury_risk:{score,category}, ... }
 */
function resolveFields(r) {
  // ── Athlete / header info ─────────────────────────────────────────────────
  const athlete        = r.athlete        || {};
  const athleteName    = r.athlete_name   || athlete.name      || "—";
  const athleteId      = r.athlete_id     || athlete.athlete_id|| "—";
  const sportType      = athlete.sport_type || r.sport_type    || "—";
  const athleteAge     = athlete.age       || r.age            || "—";

  // ── Movement quality ─────────────────────────────────────────────────────
  const mq             = r.movement_quality || {};
  const mqScore        = mq.movement_quality_score ?? mq.score ?? r.movement_quality_score ?? "—";
  const mqLabel        = mq.quality_label  ?? mq.label ?? r.quality_label  ?? "—";

  // ── Injury risk ──────────────────────────────────────────────────────────
  const ir             = r.injury_risk     || {};
  const irScore        = ir.injury_risk_score ?? ir.score ?? r.injury_risk_score ?? "—";
  const irCategory     = ir.risk_category  ?? ir.category ?? r.risk_category ?? "—";

  // ── Biomechanical metrics ────────────────────────────────────────────────
  const bm = r.biomechanical_metrics || {};

const bmRows = [
  ["Left Knee Angle", safeNum(bm.knee_angle?.left_avg), "°"],
  ["Right Knee Angle", safeNum(bm.knee_angle?.right_avg), "°"],
  ["Left Hip Angle", safeNum(bm.hip_angle?.left_avg), "°"],
  ["Right Hip Angle", safeNum(bm.hip_angle?.right_avg), "°"],
  ["Trunk Lean", safeNum(bm.trunk_lean_avg)],
  ["Knee Valgus Ratio", safeNum(bm.knee_valgus_ratio_avg)],
  ["Knee Symmetry Difference", safeNum(bm.knee_symmetry_diff_avg), "°"],
  ["Hip Symmetry Difference", safeNum(bm.hip_symmetry_diff_avg), "°"],
  ["Balance Offset", safeNum(bm.balance_offset_avg)],
].filter(([, v]) => v !== "—");

  // ── AI Findings ──────────────────────────────────────────────────────────
  const ai             = r.ai_findings    || r.findings       || {};
  const possibleInjuries = arr(ai.possible_injuries ?? r.possible_injuries);
  const movementFindings = arr(ai.movement_findings  ?? r.movement_findings);
  const anomalies        = arr(r.anomalies ?? ai.anomalies);

  // ── Recommendations ──────────────────────────────────────────────────────
  const rec             = r.recommendations || {};
  const correctiveEx    = arr(rec.corrective_exercises    ?? r.corrective_exercises);
  const strengthening   = arr(rec.strengthening           ?? rec.strengthening_recommendations ?? r.strengthening_recommendations);
  const mobility        = arr(rec.mobility_flexibility    ?? rec.mobility    ?? r.mobility_flexibility);
  const recovery        = arr(rec.recovery_planning       ?? rec.recovery    ?? r.recovery_planning);
  const trainingMods    = arr(rec.training_modifications  ?? rec.training    ?? r.training_modifications);

  // ── Performance summary ──────────────────────────────────────────────────
  const perf            = r.performance_summary || {};

  return {
    athleteName, athleteId, sportType, athleteAge,
    mqScore, mqLabel, irScore, irCategory,
    bmRows,
    possibleInjuries, movementFindings, anomalies,
    correctiveEx, strengthening, mobility, recovery, trainingMods,
    perf
  };
}

// ─── Excel builder ────────────────────────────────────────────────────────────
function buildExcelRows(r) {
  const f = resolveFields(r);
  const rows = [
    ["ATHENIX — SPORTS INJURY RISK REPORT"],
    [],
    ["Report ID",        safe(r.report_id)],
    ["Video File",       safe(r.video_filename)],
    ["Date", r.generated_at ? new Date(r.generated_at).toLocaleString() : "—"],
    ["Frames Analyzed", safe(r.analysis_details?.frames_analyzed)],
    [],
    ["ATHLETE INFORMATION"],
    ["Athlete Name",     f.athleteName],
    ["Athlete ID",       f.athleteId],
    ["Sport Type",       f.sportType],
    ["Age",              f.athleteAge],
    [],
    ["SCORES"],
    ["Movement Quality Score", safeNum(f.mqScore), f.mqLabel],
    ["Injury Risk Score",      safeNum(f.irScore), f.irCategory],
    [],
  ];

  // Biomechanical metrics table
  if (f.bmRows.length) {
    rows.push(["BIOMECHANICAL METRICS"]);
    rows.push(["Metric", "Value"]);
    f.bmRows.forEach(([k, v]) => rows.push([k, v]));
    rows.push([]);
  }

  // AI findings
  if (f.possibleInjuries) {
    rows.push(["POSSIBLE INJURIES / RISK FLAGS"]);
    f.possibleInjuries.forEach(i => rows.push(["•", i]));
    rows.push([]);
  }
  if (f.movementFindings) {
    rows.push(["MOVEMENT FINDINGS"]);
    f.movementFindings.forEach(i => rows.push(["•", i]));
    rows.push([]);
  }
  if (f.anomalies) {
    rows.push(["DETECTED ANOMALIES"]);
    f.anomalies.forEach(a => rows.push(["•", typeof a === "string" ? a : JSON.stringify(a)]));
    rows.push([]);
  }

  // Recommendations
  if (f.correctiveEx) {
    rows.push(["CORRECTIVE EXERCISES"]);
    f.correctiveEx.forEach(e => rows.push(["•", e]));
    rows.push([]);
  }
  if (f.strengthening) {
    rows.push(["STRENGTHENING RECOMMENDATIONS"]);
    f.strengthening.forEach(e => rows.push(["•", e]));
    rows.push([]);
  }
  if (f.mobility) {
    rows.push(["MOBILITY & FLEXIBILITY"]);
    f.mobility.forEach(e => rows.push(["•", e]));
    rows.push([]);
  }
  if (f.recovery) {
    rows.push(["RECOVERY PLANNING"]);
    f.recovery.forEach(e => rows.push(["•", e]));
    rows.push([]);
  }
  if (f.trainingMods) {
    rows.push(["TRAINING MODIFICATIONS"]);
    f.trainingMods.forEach(e => rows.push(["•", e]));
    rows.push([]);
  }

  rows.push(["— End of Report —"]);
  return rows;
}

// ─── Excel export ─────────────────────────────────────────────────────────────
function exportExcel(report, filename) {
  const rows = buildExcelRows(report);
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [{ wch: 32 }, { wch: 40 }, { wch: 22 }];

  // Bold + style header rows (cells in col A that are section headings)
  const headerRows = new Set();
  rows.forEach((row, i) => {
    if (row.length === 1 && typeof row[0] === "string" && row[0] === row[0].toUpperCase()) {
      headerRows.add(i);
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Athenix Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF export ───────────────────────────────────────────────────────────────
function getRiskColor(category) {
  if (!category) return { bg: "#1e3a5f", text: "#93c5fd" };
  const c = category.toLowerCase();
  if (c.includes("critical")) return { bg: "#450a0a", text: "#fca5a5" };
  if (c.includes("high"))     return { bg: "#431407", text: "#fdba74" };
  if (c.includes("moderate")) return { bg: "#422006", text: "#fcd34d" };
  return { bg: "#052e16", text: "#86efac" };
}

function exportPDF(report, filename) {
  const f = resolveFields(report);
  const riskColor = getRiskColor(f.irCategory);
  const now = report.generated_at
  ? new Date(report.generated_at).toLocaleString()
  : new Date().toLocaleString();

  const listItems = (items) =>
    items
      ? items.map(i => `<li>${String(i).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</li>`).join("")
      : "";

  const bmTable = f.bmRows.length
    ? `<table class="bm-table">
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
        <tbody>
          ${f.bmRows.map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
        </tbody>
       </table>`
    : `<p class="none">No biomechanical metrics recorded.</p>`;

  const section = (title, items, icon = "•") =>
    items
      ? `<div class="section">
           <h3>${icon} ${title}</h3>
           <ul>${listItems(items)}</ul>
         </div>`
      : "";

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Athenix Report — ${filename}</title>
  <style>
    /* ── Reset & base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #1e293b;
      background: #fff;
      padding: 0;
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0284c7 100%);
      color: #fff;
      padding: 28px 36px 20px;
      display: flex;
      align-items: center;
      gap: 20px;
      page-break-inside: avoid;
    }
    .header-logo {
      width: 52px; height: 52px;
      background: linear-gradient(135deg,#38bdf8,#0284c7);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; flex-shrink: 0;
    }
    .header-title { font-size: 22pt; font-weight: 700; letter-spacing: -0.5px; }
    .header-sub   { font-size: 10pt; color: #93c5fd; margin-top: 2px; }
    .header-right { margin-left: auto; text-align: right; font-size: 9pt; color: #93c5fd; line-height: 1.6; }

    /* ── Page body ── */
    .page { padding: 28px 36px; }

    /* ── Meta bar ── */
    .meta-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 22px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
    }
    .meta-item label { display: block; font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px; }
    .meta-item span  { font-size: 10.5pt; font-weight: 600; color: #1e293b; }

    /* ── Score cards ── */
    .score-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 22px;
    }
    .score-card {
      border-radius: 10px;
      padding: 16px 20px;
      border: 1px solid rgba(0,0,0,0.08);
    }
    .score-card.quality {
      background: linear-gradient(135deg, #0f172a, #1e3a5f);
      color: #fff;
    }
    .score-card.risk {
      background: linear-gradient(135deg, ${riskColor.bg}, ${riskColor.bg}cc);
      color: #fff;
      border-color: ${riskColor.text}44;
    }
    .score-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.7px; opacity: 0.75; }
    .score-value { font-size: 28pt; font-weight: 800; line-height: 1.1; margin: 4px 0 2px; }
    .score-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 600;
      background: rgba(255,255,255,0.18);
    }
    .score-card.risk .score-badge { color: ${riskColor.text}; background: ${riskColor.text}22; }

    /* ── Athlete card ── */
    .athlete-card {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 22px;
      border-left: 4px solid #0284c7;
    }
    .athlete-card h3 { font-size: 10pt; color: #0284c7; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .athlete-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .athlete-item label { display: block; font-size: 7.5pt; color: #64748b; }
    .athlete-item span  { font-size: 10pt; font-weight: 600; }

    /* ── Section headings ── */
    h2.section-heading {
      font-size: 12pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 5px;
      margin: 22px 0 14px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* ── Biomechanics table ── */
    .bm-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-bottom: 18px;
    }
    .bm-table thead tr { background: #1e3a5f; color: #fff; }
    .bm-table th { padding: 8px 12px; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.4px; }
    .bm-table td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; }
    .bm-table tbody tr:nth-child(even) { background: #f8fafc; }

    /* ── Findings & recommendations sections ── */
    .section {
      background: #f8fafc;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 14px;
      border: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .section h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 9px;
    }
    .section ul { padding-left: 20px; }
    .section li { margin-bottom: 5px; font-size: 10pt; line-height: 1.5; }

    /* Risk-specific section highlight */
    .section.risk-section { border-left: 3px solid ${riskColor.text}; background: ${riskColor.bg}18; }
    .section.risk-section h3 { color: ${riskColor.text === "#86efac" ? "#15803d" : "#b45309"}; }

    /* ── Clinical note ── */
    .clinical-note {
      background: #fefce8;
      border: 1px solid #fde047;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 22px 0;
      font-size: 9.5pt;
      color: #713f12;
      line-height: 1.55;
      page-break-inside: avoid;
    }
    .clinical-note strong { color: #92400e; }

    /* ── Footer ── */
    .footer {
      background: #0f172a;
      color: #64748b;
      text-align: center;
      padding: 14px 36px;
      font-size: 8.5pt;
      line-height: 1.6;
      page-break-inside: avoid;
    }
    .footer strong { color: #93c5fd; }

    /* ── Print ── */
    .none { color: #94a3b8; font-style: italic; font-size: 9.5pt; }
    @page { margin: 0; size: A4; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-logo">⚡</div>
  <div>
    <div class="header-title">ATHENIX</div>
    <div class="header-sub">Sports Injury Intelligence Platform</div>
  </div>
  <div class="header-right">
    <div><strong>INJURY RISK REPORT</strong></div>
    <div>Report ID: ${safe(report.report_id)}</div>
    <div>Generated: ${now}</div>
  </div>
</div>

<div class="page">

  <!-- META BAR -->
  <div class="meta-bar">
    <div class="meta-item">
      <label>Video File</label>
      <span>${safe(report.video_filename)}</span>
    </div>
    <div class="meta-item">
      <label>Frames Analyzed</label>
      <span>${safe(report.analysis_details?.frames_analyzed)}</span>
    </div>
    <div class="meta-item">
      <label>Analysis Date</label>
      <span>${now}</span>
    </div>
  </div>

  <!-- ATHLETE INFO -->
  <div class="athlete-card">
    <h3>👤 Athlete Information</h3>
    <div class="athlete-grid">
      <div class="athlete-item"><label>Name</label><span>${f.athleteName}</span></div>
      <div class="athlete-item"><label>ID</label><span>${f.athleteId}</span></div>
      <div class="athlete-item"><label>Sport</label><span>${f.sportType}</span></div>
      <div class="athlete-item"><label>Age</label><span>${f.athleteAge}</span></div>
    </div>
  </div>

  <!-- SCORE CARDS -->
  <div class="score-row">
    <div class="score-card quality">
      <div class="score-label">Movement Quality Score</div>
      <div class="score-value">${safeNum(f.mqScore)}</div>
      <div class="score-badge">${safe(f.mqLabel)}</div>
    </div>
    <div class="score-card risk">
      <div class="score-label">Injury Risk Score</div>
      <div class="score-value">${safeNum(f.irScore)}</div>
      <div class="score-badge" style="color:${riskColor.text}">${safe(f.irCategory)}</div>
    </div>
  </div>

  <!-- BIOMECHANICAL METRICS -->
  <h2 class="section-heading">📐 Biomechanical Metrics</h2>
  ${bmTable}

  <!-- INJURY PREDICTIONS -->
  ${f.possibleInjuries || f.movementFindings || f.anomalies ? `
  <h2 class="section-heading">🔍 Injury Predictions &amp; Findings</h2>
  ${section("Possible Injuries / Risk Flags", f.possibleInjuries, "⚠️")}
  ${section("Movement Findings", f.movementFindings, "📊")}
  ${section("Detected Anomalies", f.anomalies, "🔺")}
  ` : ""}

  <!-- RECOMMENDATIONS -->
  ${f.correctiveEx || f.strengthening || f.mobility || f.recovery || f.trainingMods ? `
  <h2 class="section-heading">💡 Corrective Recommendations</h2>
  ${section("Corrective Exercises", f.correctiveEx, "🏃")}
  ${section("Strengthening Recommendations", f.strengthening, "💪")}
  ${section("Mobility & Flexibility", f.mobility, "🧘")}
  ${section("Recovery Planning", f.recovery, "🛌")}
  ${section("Training Modifications", f.trainingMods, "⚙️")}
  ` : ""}

  <!-- CLINICAL NOTE -->
  <div class="clinical-note">
    <strong>⚕️ Clinical Note:</strong> This report is generated by AI-based biomechanical video analysis and is intended as a <strong>decision-support tool only</strong>. It does not constitute a medical diagnosis. All findings, risk scores, and recommendations should be reviewed and validated by a qualified physiotherapist, sports scientist, or medical professional before clinical action is taken.
  </div>

</div><!-- /page -->

<!-- FOOTER -->
<div class="footer">
  <strong>ATHENIX Sports Injury Intelligence Platform</strong> &nbsp;|&nbsp;
  Powered by Computer Vision &amp; Biomechanical AI &nbsp;|&nbsp;
  Report ID: ${safe(report.report_id)} &nbsp;|&nbsp;
  ${now}<br/>
  <em>Confidential — For authorized clinical and coaching use only</em>
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 400);
  };
</script>
</body>
</html>`);
  win.document.close();
}

// ─── Component ────────────────────────────────────────────────────────────────
function ExportButtons({ reportData, filename = "athenix-report" }) {
  if (!reportData) return null;
  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      <button
        className="btn btn-ghost"
        style={{ fontSize: "13px", padding: "7px 14px" }}
        onClick={() => exportExcel(reportData, filename)}
        title="Export report as Excel (.xlsx)"
      >
        📊 Export Excel
      </button>
      <button
        className="btn btn-ghost"
        style={{ fontSize: "13px", padding: "7px 14px" }}
        onClick={() => exportPDF(reportData, filename)}
        title="Print / Save as PDF"
      >
        📄 Export PDF
      </button>
    </div>
  );
}

export default ExportButtons;
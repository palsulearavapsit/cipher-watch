export function exportPDF(threat) {
  if (!threat) return;

  const score = threat.score ?? threat.risk_score ?? "N/A";
  const entityId = threat.entity_id ?? "N/A";
  const source = threat.source ?? threat.type ?? "N/A";
  const timestamp = threat.timestamp ? new Date(threat.timestamp).toLocaleString() : new Date().toLocaleString();
  const id = threat.id ?? "N/A";
  const status = threat.status ?? "active";
  const explanation = threat.explanation ?? "No additional threat explanation provided.";

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup blocker prevented opening the print report window. Please allow popups for this site.");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Forensic Incident Case File - ID ${id}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            background-color: #ffffff;
            color: #111111;
            font-family: ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            font-size: 12px;
          }
          .container {
            border: 2px solid #111111;
            padding: 30px;
            position: relative;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 60px;
            color: rgba(220, 50, 50, 0.08);
            font-weight: bold;
            letter-spacing: 5px;
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px double #111111;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .title-area h1 {
            margin: 0;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 3px;
            font-weight: 800;
          }
          .title-area p {
            margin: 4px 0 0 0;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #555555;
          }
          .stamp {
            border: 2px solid #ef4444;
            color: #ef4444;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            transform: rotate(-3deg);
          }
          .meta-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 15px;
            margin-bottom: 25px;
          }
          .meta-item {
            border-bottom: 1px dashed #cccccc;
            padding-bottom: 6px;
            display: flex;
            justify-content: space-between;
          }
          .meta-label {
            font-weight: bold;
            text-transform: uppercase;
            color: #555555;
            font-size: 10px;
            letter-spacing: 1px;
          }
          .meta-value {
            font-weight: 500;
          }
          .section-title {
            background-color: #111111;
            color: #ffffff;
            font-size: 10px;
            font-weight: bold;
            padding: 4px 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          .content-block {
            background-color: #f7f7f7;
            border: 1px solid #e3e3e3;
            padding: 15px;
            white-space: pre-wrap;
            font-size: 11px;
            color: #222222;
          }
          .audit-logs {
            font-size: 10px;
            color: #444444;
            margin-bottom: 20px;
          }
          .audit-row {
            margin-bottom: 6px;
            display: flex;
            gap: 10px;
          }
          .audit-time {
            color: #888888;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 9px;
            border-top: 1px solid #111111;
            padding-top: 15px;
            color: #666666;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="watermark">CONFIDENTIAL</div>

          <div class="header">
            <div class="title-area">
              <h1>CipherWatch Ops Center</h1>
              <p>Forensic Threat Intelligence & Incident Report</p>
            </div>
            <div class="stamp">
              ${score >= 80 ? "CRITICAL THREAT" : score >= 50 ? "WARNING SUSPICIOUS" : "MONITORED ANOMALY"}
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Incident ID</span>
              <span class="meta-value">${id}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Incident Status</span>
              <span class="meta-value" style="color: ${status === "active" ? "#ef4444" : "#10b981"}; text-transform: uppercase; font-weight: bold;">${status}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Target Entity</span>
              <span class="meta-value">${entityId}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Anomaly Source</span>
              <span class="meta-value" style="text-transform: uppercase;">${source}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Risk Rating</span>
              <span class="meta-value" style="font-weight: bold; color: #ef4444;">${score} / 100</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Logged Timestamp</span>
              <span class="meta-value">${timestamp}</span>
            </div>
          </div>

          <div class="section-title">AI Forensic Explanation & Investigation Verdict</div>
          <div class="content-block">${explanation}</div>

          <div class="section-title">Automated Incident Action Logs</div>
          <div class="audit-logs">
            <div class="audit-row">
              <span class="audit-time">[${timestamp}]</span>
              <span>Anomalous signals detected by the CipherWatch AI real-time threat monitor.</span>
            </div>
            <div class="audit-row">
              <span class="audit-time">[${timestamp}]</span>
              <span>Anomaly scored and mapped automatically: Risk Rating resolved as ${score}/100.</span>
            </div>
            <div class="audit-row">
              <span class="audit-time">[${timestamp}]</span>
              <span>Gemini explanation engine compiled investigation reports and reasoning tokens.</span>
            </div>
            <div class="audit-row">
              <span class="audit-time">[${timestamp}]</span>
              <span>Incident status set to: ${status}. Persisted to cloud datastore (Firebase).</span>
            </div>
          </div>

          <div class="footer">
            CLASSIFIED DOCUMENT // SYSTEM SECURED // CIPHERWATCH THREAT MONITOR
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

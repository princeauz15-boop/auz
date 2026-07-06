import * as XLSX from "xlsx";

interface ExportRecord {
  employee?: { name: string; employeeId: string; department: string; designation: string };
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workingHours: number | null;
  lateMinutes: number | null;
  overtime: number | null;
  status: string;
}

function formatTime(dt: string | null): string {
  if (!dt) return "-";
  return new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(dt: string): string {
  return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatHours(h: number | null): string {
  if (!h) return "0h 0m";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

function recordsToRows(records: ExportRecord[]) {
  return records.map((r) => ({
    Employee: r.employee?.name || "-",
    "Employee ID": r.employee?.employeeId || "-",
    Department: r.employee?.department || "-",
    Designation: r.employee?.designation || "-",
    Date: formatDate(r.date),
    "Clock In": formatTime(r.clockIn),
    "Clock Out": formatTime(r.clockOut),
    "Working Hours": formatHours(r.workingHours),
    "Late (min)": r.lateMinutes || 0,
    "Overtime": formatHours(r.overtime),
    Status: r.status,
  }));
}

export function exportToExcel(records: ExportRecord[], filename = "attendance_report") {
  const rows = recordsToRows(records);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

  // Auto column widths
  const cols = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key] || "").length)) + 2,
  }));
  ws["!cols"] = cols;

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSV(records: ExportRecord[], filename = "attendance_report") {
  const rows = recordsToRows(records);
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => `"${String((row as any)[h] || "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

export async function exportToPDF(
  records: ExportRecord[],
  title: string,
  filename = "attendance_report"
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  const rows = recordsToRows(records);
  if (!rows.length) {
    doc.setFontSize(12);
    doc.text("No records found.", 14, 40);
  } else {
    const headers = Object.keys(rows[0]);
    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: rows.map((r) => headers.map((h) => String((r as any)[h] || ""))),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  doc.save(`${filename}.pdf`);
}

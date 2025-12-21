import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  VerticalAlign,
} from "docx";
import type { DailyLog } from "../types/dailyLog.ts";

export async function exportLogsToWord(logs: DailyLog[]) {
  if (!logs.length) {
    alert("No logs available to export");
    return;
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // HEADER
      new TableRow({
        children: [
          headerCell("Date"),
          headerCell("Work Summary"),
          headerCell("Key Learnings"),
          headerCell("Issues Faced"),
        ],
      }),

      // DATA
      ...logs.map((log) =>
        new TableRow({
          children: [
            bodyCell(log.date),
            richTextCell(log.workSummary),
            richTextCell((log.keyLearnings || []).join("\n")),
            richTextCell(log.issuesFaced),
          ],
        })
      ),
    ],
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Daily Log Report",
                bold: true,
                size: 28,
              }),
            ],
            spacing: { after: 300 },
          }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  download(blob, "DailyLogs.docx");
}

/* =======================
   CELL HELPERS
======================= */

function headerCell(text: string) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: cellMargins(),
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
          }),
        ],
      }),
    ],
  });
}

/**
 * Creates a readable, wrapped, spaced cell
 * Supports:
 * - line breaks
 * - bullet points
 */
function richTextCell(text?: string) {
  if (!text) return bodyCell("");

  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const paragraphs = lines.map((line) => {
    // Bullet detection
    if (line.startsWith("-")) {
      return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: line.replace(/^-\s*/, ""),
            size: 22,
          }),
        ],
      });
    }

    // Normal text line
    return new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: line,
          size: 22,
        }),
      ],
    });
  });

  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    margins: cellMargins(),
    children: paragraphs,
  });
}

function bodyCell(text?: string) {
  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    margins: cellMargins(),
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text || "",
            size: 22,
          }),
        ],
      }),
    ],
  });
}

function cellMargins() {
  return {
    top: 200,
    bottom: 200,
    left: 150,
    right: 150,
  };
}

/* =======================
   DOWNLOAD
======================= */
function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

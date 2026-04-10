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
import type { DailyLog } from "../types/dailyLog.js";
import { formatDateToDDMMYYYY } from "../utils/dateFormatter.js";


function mdToPlainText(md?: string): string {
  if (!md) return "";

  return md
    // Bold / italic / underline / strike
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")

    // Headings
    .replace(/^#{1,6}\s*/gm, "")

    // Links [text](url)
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")

    // Inline code
    .replace(/`([^`]*)`/g, "$1")

    // Blockquotes
    .replace(/^>\s*/gm, "")

    // Trim extra newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const sortLogsAscending = (logs: DailyLog[]) => {
  return [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

/* =======================
   EXPORT
======================= */
export async function exportLogsToWord(logs: DailyLog[]) {
  if (!logs.length) {
    alert("No logs available to export");
    return;
  }

  const sortedLogs = sortLogsAscending(logs);

 
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      
      new TableRow({
        children: [
          headerCell("Date"),
          headerCell("Work Summary"),
          headerCell("Key Learnings"),
          headerCell("Issues Faced"),
        ],
      }),

    
      ...sortedLogs.map((log) =>
        new TableRow({
          children: [
            bodyCell(formatDateToDDMMYYYY(log.date)),
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


function richTextCell(text?: string) {
  if (!text) return bodyCell("");

  const clean = mdToPlainText(text);

  const lines = clean
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const paragraphs = lines.map((line) => {
    
    if (/^[-*+]\s+/.test(line)) {
      return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: line.replace(/^[-*+]\s+/, ""),
            size: 22,
          }),
        ],
      });
    }

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

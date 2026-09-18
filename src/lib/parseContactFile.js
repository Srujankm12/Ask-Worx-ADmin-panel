import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — enough for a few thousand rows

export class ImportFileError extends Error {}

const NO_TABLE_IN_PDF =
  'Could not detect a contact table in this PDF. Please upload a PDF containing structured contact information.';

function getExtension(file) {
  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

export function validateFile(file) {
  const ext = getExtension(file);
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new ImportFileError(
      `"${file.name}" is not a supported file. Upload a CSV, Excel (.xlsx/.xls) or PDF file.`,
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ImportFileError('This file is larger than 5 MB. Split it into smaller files and try again.');
  }
  return ext;
}

/** Drops blank rows, trims every cell, and pads short rows to a common width. */
function toTable(rawRows) {
  const cleaned = rawRows
    .map((row) => (row || []).map((cell) => (cell == null ? '' : String(cell).trim())))
    .filter((row) => row.some((cell) => cell !== ''));

  if (cleaned.length === 0) return null;

  const width = Math.max(...cleaned.map((row) => row.length));
  const columns = cleaned[0];
  const rows = cleaned.slice(1).map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push('');
    return padded;
  });

  return { columns, rows };
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (result) => {
        const table = toTable(result.data);
        if (!table) {
          reject(new ImportFileError('This CSV file has no rows to import.'));
          return;
        }
        resolve(table);
      },
      error: (err) => reject(new ImportFileError(`Could not read this CSV file: ${err.message}`)),
    });
  });
}

async function parseExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Multiple sheets are common in exports (a summary tab plus the real data)
  // — use the first sheet that actually has rows rather than asking the user
  // to pick one.
  const sheetName = workbook.SheetNames.find((name) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, blankrows: false });
    return rows.length > 0;
  });

  if (!sheetName) {
    throw new ImportFileError('This spreadsheet has no rows to import.');
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const table = toTable(rawRows);
  if (!table) {
    throw new ImportFileError('This spreadsheet has no rows to import.');
  }
  return table;
}

async function parsePdf(file) {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const lines = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const lineMap = new Map();
    content.items.forEach((item) => {
      const str = (item.str || '').trim();
      if (!str) return;
      const y = item.transform[5];
      const key = Math.round(y / 4); // small tolerance for sub-pixel baseline jitter
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key).push({ x: item.transform[4], str });
    });

    [...lineMap.entries()]
      .sort((a, b) => b[0] - a[0]) // PDF y grows upward — top of page first
      .forEach(([, items]) => lines.push(items.sort((a, b) => a.x - b.x)));
  }

  const headerLineIndex = lines.findIndex((line) => line.length >= 2);
  if (headerLineIndex === -1) {
    throw new ImportFileError(NO_TABLE_IN_PDF);
  }

  const headerLine = lines[headerLineIndex];
  const columns = headerLine.map((item) => item.str);
  const colStarts = headerLine.map((item) => item.x);

  const rows = lines
    .slice(headerLineIndex + 1)
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells = new Array(columns.length).fill('');
      line.forEach((item) => {
        let bestIdx = 0;
        let bestDist = Infinity;
        colStarts.forEach((start, idx) => {
          const dist = Math.abs(start - item.x);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = idx;
          }
        });
        cells[bestIdx] = cells[bestIdx] ? `${cells[bestIdx]} ${item.str}` : item.str;
      });
      return cells;
    })
    .filter((row) => row.filter(Boolean).length >= 2);

  if (columns.length < 2 || rows.length === 0) {
    throw new ImportFileError(NO_TABLE_IN_PDF);
  }

  return { columns, rows };
}

export async function parseContactFile(file) {
  const ext = validateFile(file);
  if (ext === '.csv') return parseCsv(file);
  if (ext === '.xlsx' || ext === '.xls') return parseExcel(file);
  return parsePdf(file);
}

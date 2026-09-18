import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { importContacts } from '../api';
import { cn } from '../lib/utils';
import { parseContactFile, validateFile, ImportFileError } from '../lib/parseContactFile';
import {
  MAPPING_OPTIONS,
  SKIP_FIELD,
  buildImportRows,
  suggestMapping,
} from '../lib/importContacts';

import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select } from './ui/select';
import { Input } from './ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';

const STEP_LABELS = ['Upload', 'Map fields', 'Preview'];
const PAGE_SIZE = 25;

const stepIndex = (step) => {
  if (step === 'upload') return 0;
  if (step === 'mapping') return 1;
  return 2; // preview | importing | done
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIconFor = (name = '') => {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (ext === '.csv') return FileText;
  if (ext === '.xlsx' || ext === '.xls') return FileSpreadsheet;
  return FileIcon;
};


const STATUS_BADGE = {
  valid: { variant: 'success', label: 'Import' },
  invalid: { variant: 'danger', label: 'Exists' },
  duplicate: { variant: 'danger', label: 'Exists' },
};

const RESULT_STATUS_BADGE = {
  imported: { variant: 'success', label: 'Imported' },
  invalid: { variant: 'danger', label: 'Not Imported' },
  duplicate: { variant: 'danger', label: 'Duplicate' },
  failed: { variant: 'danger', label: 'Failed' },
};

const FIELD_LABELS = { name: 'Name', phone: 'Phone', company: 'Company' };

const ImportContactsDialog = ({ open, onClose, existingContacts, onImported }) => {
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null); // { columns, rows }
  const [mapping, setMapping] = useState([]);
  const [overrides, setOverrides] = useState({}); // { [rowIndex]: { name?, phone?, company? } }
  const [page, setPage] = useState(0); // Preview table pagination — resets whenever a new file is parsed
  const [importError, setImportError] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStep('upload');
    setDragActive(false);
    setFile(null);
    setFileError('');
    setParsing(false);
    setParsed(null);
    setMapping([]);
    setOverrides({});
    setPage(0);
    setImportError('');
    setResults(null);
  }, [open]);

  const importRows = useMemo(() => {
    if (!parsed) return [];
    return buildImportRows({
      rows: parsed.rows,
      mapping,
      existingPhones: (existingContacts || []).map((c) => c.phone),
      overrides,
    });
  }, [parsed, mapping, existingContacts, overrides]);

  const counts = useMemo(
    () => ({
      total: importRows.length,
      valid: importRows.filter((r) => r.status === 'valid').length,
      invalid: importRows.filter((r) => r.status === 'invalid').length,
      duplicate: importRows.filter((r) => r.status === 'duplicate').length,
    }),
    [importRows],
  );

  const canPreview = mapping.includes('phone');
  const visibleFields = useMemo(
    () => Object.keys(FIELD_LABELS).filter((field) => field === 'phone' || mapping.includes(field)),
    [mapping],
  );

  const pageCount = Math.max(1, Math.ceil(importRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const pageRows = importRows.slice(pageStart, pageStart + PAGE_SIZE);

  // ── Step 1: upload ────────────────────────────────────────────────────

  const handleFileSelected = (selected) => {
    if (!selected) return;
    try {
      // Also re-checked inside parseContactFile, but validating here gives an
      // instant error before the user even clicks Next.
      validateFile(selected);
      setFile(selected);
      setFileError('');
    } catch (err) {
      setFile(null);
      setFileError(err.message || 'This file could not be used.');
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) handleFileSelected(dropped);
  };

  const handleContinueFromUpload = async () => {
    if (!file) return;
    setParsing(true);
    setFileError('');
    try {
      const table = await parseContactFile(file);
      setParsed(table);
      setMapping(suggestMapping(table.columns));
      setOverrides({});
      setPage(0);
      setStep('mapping');
    } catch (err) {
      setFileError(
        err instanceof ImportFileError
          ? err.message
          : 'This file could not be read. Check that it is not corrupted and try again.',
      );
    } finally {
      setParsing(false);
    }
  };

  // ── Step 2: mapping ───────────────────────────────────────────────────

  const updateMapping = (colIndex, value) => {
    setMapping((current) => current.map((field, idx) => (idx === colIndex ? value : field)));
  };

  // ── Step 3: preview (admin corrects a mapped value in place) ───────────

  const updateOverride = (rowIndex, field, value) => {
    setOverrides((current) => ({
      ...current,
      [rowIndex]: { ...current[rowIndex], [field]: value },
    }));
  };

  // ── Preview footer: only fires on the "Import Contacts" click ──────────

  const handleImport = async () => {
    setImportError('');
    setStep('importing');

    try {
      const payload = importRows.map((row) => ({
        row: row.rowNumber,
        name: row.data.name,
        phone: row.data.phone,
        company: row.data.company,
      }));
      const { data } = await importContacts(payload);

      // One entry per uploaded row — imported, invalid, duplicate, or failed
      // — exactly as the backend judged it, so the completed screen shows
      // the full, authoritative record-by-record result.
      const rows = (data.results || []).map((r) => ({
        rowNumber: r.row,
        data: { name: r.name || '', phone: r.phone || '', company: r.company || '' },
        status: r.status,
        reason: r.reason || '—',
      }));

      setResults({
        total: data.total,
        imported: data.imported,
        skipped: data.skipped,
        failed: data.failed,
        rows,
      });
      setPage(0);
      setStep('done');
    } catch (err) {
      console.error('Import request failed', {
        status: err?.response?.status,
        message: err?.message,
      });
      setImportError(
        err?.response?.data?.error || 'Could not import contacts. Check your connection and try again.',
      );
      setStep('preview');
    }
  };

  const handleDone = () => {
    onImported?.();
    onClose?.();
  };

  const guardedClose = () => {
    if (step === 'importing') return;
    onClose?.();
  };

  const FileIconComp = file ? fileIconFor(file.name) : UploadCloud;

  return (
    <Dialog open={open} onClose={guardedClose} size="xl" labelledBy="import-contacts">
      <DialogHeader
        id="import-contacts"
        eyebrow="Customers"
        title="Import contacts"
        description="Bring in contacts from a CSV, Excel or PDF file — each one is saved the same way as adding a contact by hand."
        onClose={step === 'importing' ? undefined : guardedClose}
      />

      <div className="border-b border-border bg-paper px-6 py-3">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-titanium-700">
          {STEP_LABELS.map((label, idx) => (
            <React.Fragment key={label}>
              {idx > 0 && <span aria-hidden="true" className="h-px w-4 bg-line-strong" />}
              <span className={cn('flex items-center gap-1.5', idx <= stepIndex(step) && 'text-ink')}>
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full border text-[9px] normal-case',
                    idx < stepIndex(step)
                      ? 'border-ink bg-ink text-white'
                      : idx === stepIndex(step)
                        ? 'border-ink text-ink'
                        : 'border-line-strong text-titanium-700',
                  )}
                >
                  {idx + 1}
                </span>
                {label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
      {step === 'upload' && (
        <>
          <DialogBody className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
                dragActive ? 'border-ink bg-paper' : 'border-line-strong bg-white',
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-champagne-100 text-graphite-700">
                <FileIconComp className="size-6" />
              </div>

              {file ? (
                <div className="w-full max-w-sm">
                  <p className="font-medium text-ink">{file.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-titanium-700">
                    {formatBytes(file.size)}
                  </p>
                </div>
              ) : (
                <>
                  <p className="font-medium text-ink">Drag &amp; drop your file here</p>
                  <p className="text-[13px] text-text-secondary">or</p>
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Browse file
                  </Button>
                  <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-titanium-700">
                    Supported: CSV, XLSX, XLS, PDF
                  </p>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(event) => handleFileSelected(event.target.files?.[0])}
              />
            </div>

            {fileError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-light px-4 py-3"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
                <p className="text-[13px] font-medium text-danger">{fileError}</p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            {file ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={parsing}
                  onClick={() => {
                    setFile(null);
                    setFileError('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Remove
                </Button>
                <Button type="button" onClick={handleContinueFromUpload} disabled={parsing}>
                  {parsing && <Loader2 className="animate-spin" />}
                  {parsing ? 'Reading file…' : 'Next'}
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={guardedClose}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </>
      )}

      {/* ── Step 2: Map fields ─────────────────────────────────────────── */}
      {step === 'mapping' && parsed && (
        <>
          <DialogBody className="space-y-4">
            <p className="text-[13px] leading-relaxed text-text-secondary">
              We matched columns we recognised. Change any of them, or set a column to “Don’t
              import” to leave it out.
            </p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <tr className="divide-x divide-border">
                    <TableHead className="w-16 text-center">S.No</TableHead>
                    <TableHead className="text-center">Uploaded Field</TableHead>
                    <TableHead className="text-center"></TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {parsed.columns.map((column, colIndex) => (
                    <TableRow key={colIndex} className="divide-x divide-border">
                      <TableCell className="text-center font-mono text-[12px] text-titanium-700">
                        {colIndex + 1}
                      </TableCell>
                      <TableCell className="text-center font-medium text-ink">
                        {column || `Column ${colIndex + 1}`}
                      </TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={mapping[colIndex] ?? SKIP_FIELD}
                          onChange={(event) => updateMapping(colIndex, event.target.value)}
                          aria-label={`Contact field for ${column || `column ${colIndex + 1}`}`}
                          className="sm:w-52 text-center"
                          hideIcon
                        >
                          {MAPPING_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {!canPreview && (
              <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning-light px-4 py-3">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-[13px] font-medium text-warning">
                  Map at least one column to Phone to continue — every contact needs a number.
                </p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep('preview')} disabled={!canPreview}>
              Next
            </Button>
          </DialogFooter>
        </>
      )}

      {/* ── Step 3: Preview ────────────────────────────────────────────── */}
      {step === 'preview' && (
        <>
          <DialogBody className="space-y-4">
            <div className="hairline-grid grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-4">
              {[
                ['Total records', counts.total],
                ['Import', counts.valid],
                ['Invalid', counts.invalid],
                ['Duplicates', counts.duplicate],
              ].map(([label, value]) => (
                <div key={label} className="bg-white px-4 py-4">
                  <p className="spec-label">{label}</p>
                  <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums text-ink">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <tr className="divide-x divide-border">
                    <TableHead className="w-12 text-center">S.No</TableHead>
                    {visibleFields.map((field) => (
                      <TableHead key={field} className="text-center">{FIELD_LABELS[field]}</TableHead>
                    ))}
                    <TableHead className="text-center">Status</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const badge = STATUS_BADGE[row.status];
                    const rowIndex = row.rowNumber - 1;
                    return (
                      <TableRow
                        key={row.rowNumber}
                        className={cn(
                          'divide-x divide-border',
                          row.status === 'invalid' && 'bg-danger-light/40',
                          row.status === 'duplicate' && 'bg-warning-light/40',
                        )}
                      >
                        <TableCell className="text-center font-mono text-[12px] text-titanium-700">
                          {row.rowNumber}
                        </TableCell>
                        {visibleFields.map((field) => (
                          <TableCell key={field} className="p-0">
                            <Input
                              value={row.data[field]}
                              onChange={(event) => updateOverride(rowIndex, field, event.target.value)}
                              aria-label={`${FIELD_LABELS[field]}, row ${row.rowNumber}`}
                              aria-invalid={field === 'phone' && row.status === 'invalid' ? 'true' : undefined}
                              placeholder={field === 'phone' ? 'Required' : 'Not provided'}
                              className={cn(
                                'h-full min-h-[2.75rem] rounded-none border-none bg-transparent px-5 py-3.5 text-center focus-visible:bg-white focus-visible:ring-inset',
                                field === 'phone' ? 'font-mono text-[12px]' : 'text-[13px]',
                              )}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {importRows.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-text-secondary">
                  Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, importRows.length)} of{' '}
                  {importRows.length} records
                </p>
                {pageCount > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={currentPage === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft />
                      Previous
                    </Button>
                    <span className="font-mono text-[11px] tracking-[0.08em] text-titanium-700">
                      Page {currentPage + 1} of {pageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={currentPage >= pageCount - 1}
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    >
                      Next
                      <ChevronRight />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <p className="text-[13px] leading-relaxed text-text-secondary">
              Click any Name, Phone or Company value above to correct it — an invalid or duplicate
              row updates its status as soon as it's fixed. Every row is sent to the server when you
              click Import Contacts; it makes the final call on what gets saved, and invalid or
              duplicate rows are skipped there.
            </p>

            {importError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-light px-4 py-3"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
                <p className="text-[13px] font-medium text-danger">{importError}</p>
              </div>
            )}

            {counts.valid === 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning-light px-4 py-3">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-[13px] font-medium text-warning">
                  No valid records yet — correct a row above or go back and check the column
                  mapping.
                </p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStep('mapping')}>
              Back
            </Button>
            <Button type="button" onClick={handleImport} disabled={counts.valid === 0}>
              Import Contacts
            </Button>
          </DialogFooter>
        </>
      )}

      {/* ── Importing ──────────────────────────────────────────────────── */}
      {step === 'importing' && (
        <DialogBody className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <Loader2 className="size-8 animate-spin text-ink" />
          <p className="font-heading text-lg font-bold uppercase tracking-tight text-ink">
            Importing contacts…
          </p>
          <p className="font-mono text-[13px] tabular-nums text-titanium-700">
            Validating and saving {importRows.length}{' '}
            {importRows.length === 1 ? 'record' : 'records'}
          </p>
        </DialogBody>
      )}

      {/* ── Done ───────────────────────────────────────────────────────── */}
      {step === 'done' && results && (
        <>
          <DialogBody className="space-y-5">
            <div className="flex flex-col items-center gap-3 pt-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-success-light text-success">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="eyebrow">Import complete</p>
                <p className="mt-2 font-heading text-2xl font-extrabold uppercase tracking-tight text-ink">
                  {results.imported} {results.imported === 1 ? 'contact' : 'contacts'} imported
                </p>
              </div>
            </div>

            <div className="hairline-grid grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-4">
              {[
                ['Total records', results.total],
                ['Imported', results.imported],
                ['Skipped', results.skipped],
                ['Failed', results.failed],
              ].map(([label, value]) => (
                <div key={label} className="bg-white px-4 py-4 text-center sm:text-left">
                  <p className="spec-label">{label}</p>
                  <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums text-ink">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink">Import results</p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <tr className="divide-x divide-border">
                      <TableHead className="w-12 text-center">S.No</TableHead>
                      {visibleFields.map((field) => (
                        <TableHead key={field} className="text-center">{FIELD_LABELS[field]}</TableHead>
                      ))}
                      <TableHead className="text-center">Status</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {results.rows.slice(pageStart, pageStart + PAGE_SIZE).map((row) => {
                      const badge = RESULT_STATUS_BADGE[row.status];
                      return (
                        <TableRow
                          key={row.rowNumber}
                          className={cn(
                            'divide-x divide-border',
                            row.status !== 'imported' && 'bg-danger-light/40',
                          )}
                        >
                          <TableCell className="font-mono text-[12px] text-titanium-700">
                            {row.rowNumber}
                          </TableCell>
                          {visibleFields.map((field) => (
                            <TableCell
                              key={field}
                              className={field === 'phone' ? 'font-mono text-[12px]' : undefined}
                            >
                              {row.data[field] || '—'}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {results.rows.length > 0 && (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[12px] text-text-secondary">
                    Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, results.rows.length)} of{' '}
                    {results.rows.length} records
                  </p>
                  {pageCount > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={currentPage === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                      >
                        <ChevronLeft />
                        Previous
                      </Button>
                      <span className="font-mono text-[11px] tracking-[0.08em] text-titanium-700">
                        Page {currentPage + 1} of {pageCount}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={currentPage >= pageCount - 1}
                        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      >
                        Next
                        <ChevronRight />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter className="justify-center">
            <Button type="button" onClick={handleDone} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
};

export default ImportContactsDialog;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Upload a PDF and optional dates, returning the .ics blob.
 */
export async function generateEvents(file, { startDate, endDate } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (endDate) form.append('endDate', endDate);
  if (startDate) form.append('startDate', startDate);

  const res = await fetch(`${API_URL}/api/generate-events`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Server error (${res.status})`);
  }

  return res.blob();
}

/**
 * Trigger a browser download of a Blob.
 */
export function downloadBlob(blob, filename = 'timetable.ics') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

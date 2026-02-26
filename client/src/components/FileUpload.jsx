import { useRef, useState } from 'react';
import './FileUpload.css';

export default function FileUpload({ file, onFileSelect }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (files) => {
    const selected = files?.[0];
    if (selected && selected.type === 'application/pdf') {
      onFileSelect(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div
      className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF timetable"
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="dropzone__input"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {file ? (
        <div className="dropzone__file">
          <span className="dropzone__icon">&#128196;</span>
          <p className="dropzone__filename">{file.name}</p>
          <p className="dropzone__size">{formatSize(file.size)}</p>
        </div>
      ) : (
        <div className="dropzone__placeholder">
          <span className="dropzone__icon">&#128228;</span>
          <p className="dropzone__text">
            Drop your timetable PDF here, or <strong>browse</strong>
          </p>
          <p className="dropzone__hint">PDF files only, up to 5 MB</p>
        </div>
      )}
    </div>
  );
}

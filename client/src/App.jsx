import { useState } from 'react';
import FileUpload from './components/FileUpload';
import DatePicker from './components/DatePicker';
import StatusMessage from './components/StatusMessage';
import { useFileUpload } from './hooks/useFileUpload';
import './App.css';

const DEFAULT_END_DATE = '2026-03-31';

export default function App() {
  const { file, status, message, setFile, reset, submit } = useFileUpload();
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE);
  const [startDate, setStartDate] = useState('');

  const handleGenerate = () => {
    submit({ startDate: startDate || undefined, endDate });
  };

  return (
    <main className="card">
      <header className="card__header">
        <h1 className="card__title">Calendar Event Generator</h1>
        <p className="card__subtitle">
          Upload your timetable PDF and generate calendar events instantly.
        </p>
      </header>

      <section className="card__body">
        <FileUpload file={file} onFileSelect={setFile} />

        <div className="card__dates">
          <DatePicker
            id="start-date"
            label="Start date (optional)"
            value={startDate}
            onChange={setStartDate}
          />
          <DatePicker
            id="end-date"
            label="End date"
            value={endDate}
            onChange={setEndDate}
          />
        </div>

        <StatusMessage status={status} message={message} />

        <div className="card__actions">
          {file && status !== 'loading' && (
            <button className="btn btn--secondary" type="button" onClick={reset}>
              Clear
            </button>
          )}
          <button
            className="btn btn--primary"
            type="button"
            disabled={!file || status === 'loading'}
            onClick={handleGenerate}
          >
            {status === 'loading' ? 'Generating...' : 'Generate Events'}
          </button>
        </div>
      </section>
    </main>
  );
}

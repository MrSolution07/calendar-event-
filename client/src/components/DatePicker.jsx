import './DatePicker.css';

export default function DatePicker({ label, value, onChange, id }) {
  return (
    <div className="date-picker">
      <label className="date-picker__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        className="date-picker__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

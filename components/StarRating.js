"use client";

// A simple 1-5 dot-rating input (mirrors the wireframes, which use filled
// circles instead of unicode star characters for reliable rendering).
export default function StarRating({ value, onChange, readOnly = false }) {
  const dots = [1, 2, 3, 4, 5];
  return (
    <span className="dot-rating">
      {dots.map((n) => (
        <button
          key={n}
          type="button"
          className={`dot ${n <= (value || 0) ? "filled" : ""}`}
          disabled={readOnly}
          onClick={() => onChange && onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        />
      ))}
    </span>
  );
}

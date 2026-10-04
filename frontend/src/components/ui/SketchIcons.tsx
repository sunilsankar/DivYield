import React from "react";

export const SketchWavyLine: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 120 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="none"
  >
    <path
      d="M2 7C15 2 25 11 38 6C51 1 63 10 76 6C89 2 101 10 118 5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SketchCircle: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M20 4C30 3 37 12 36 22C35 32 26 37 16 36C6 35 3 26 4 16C5 8 13 4 22 4"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const SketchPin: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="7" r="4.5" fill="#f59e0b" stroke="#18181b" strokeWidth="2" />
    <path d="M12 11.5L12 21" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const SketchTape: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`h-4 bg-amber-100/80 border border-dashed border-amber-300 transform -rotate-2 ${className}`}
    style={{ backdropFilter: "blur(2px)" }}
  />
);

export const SketchSparkle: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 2L11.5 7.5L17 9L11.5 10.5L10 16L8.5 10.5L3 9L8.5 7.5L10 2Z"
      fill="#f59e0b"
      stroke="#18181b"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

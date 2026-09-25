import React from "react";
export function Icon({ size = 16, children, className = "", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      className={`g-svg-icon ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
export function Scale(props) {
  return (
    <Icon {...props}>
      <path d="M12 2v3" />
      <path d="M5 7h14" />
      <path d="M5 7l-2.6 6.2a3.4 3.4 0 0 0 6.8 0L6.8 7" />
      <path d="M19 7l-2.6 6.2a3.4 3.4 0 0 0 6.8 0L20.8 7" />
      <path d="M12 5v16" />
      <path d="M8 21h8" />
    </Icon>
  );
}
export function Plus(props) {
  return (
    <Icon {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  );
}
export function Minus(props) {
  return (
    <Icon {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  );
}
export function X(props) {
  return (
    <Icon {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  );
}
export function ChevronLeft(props) {
  return (
    <Icon {...props}>
      <polyline points="15 18 9 12 15 6" />
    </Icon>
  );
}
export function ChevronRight(props) {
  return (
    <Icon {...props}>
      <polyline points="9 18 15 12 9 6" />
    </Icon>
  );
}
export function Clock(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </Icon>
  );
}
export function History(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 4.5v5h5" />
      <path d="M4 9.5A8.5 8.5 0 1 0 6 4.6" />
      <polyline points="12 8 12 12.5 15.5 14.5" />
    </Icon>
  );
}
export function TrendingUp(props) {
  return (
    <Icon {...props}>
      <polyline points="4 17 10 11 14 15 20 7" />
      <polyline points="14 7 20 7 20 13" />
    </Icon>
  );
}
export function TrendingDown(props) {
  return (
    <Icon {...props}>
      <polyline points="4 7 10 13 14 9 20 17" />
      <polyline points="20 11 20 17 14 17" />
    </Icon>
  );
}
export function LayoutGrid(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.2" />
      <rect x="14" y="3" width="7" height="7" rx="1.2" />
      <rect x="3" y="14" width="7" height="7" rx="1.2" />
      <rect x="14" y="14" width="7" height="7" rx="1.2" />
    </Icon>
  );
}
export function Archive(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </Icon>
  );
}
export function Boxes(props) {
  return (
    <Icon {...props}>
      <rect x="2" y="7" width="10" height="10" rx="1.2" />
      <rect x="12" y="4" width="10" height="10" rx="1.2" />
    </Icon>
  );
}
export function Layers(props) {
  return (
    <Icon {...props}>
      <polygon points="12 3 21 8 12 13 3 8" />
      <polyline points="3 13 12 18 21 13" />
      <polyline points="3 17 12 22 21 17" />
    </Icon>
  );
}
export function Trash2(props) {
  return (
    <Icon {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <path d="M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Icon>
  );
}
export function Pencil(props) {
  return (
    <Icon {...props}>
      <path d="M17 3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      <path d="M15 5l3 3" />
    </Icon>
  );
}
export function Wifi(props) {
  return (
    <Icon {...props}>
      <path d="M2 8.5a16 16 0 0 1 20 0" />
      <path d="M5 12a11 11 0 0 1 14 0" />
      <path d="M8.5 15.5a6 6 0 0 1 7 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}
export function WifiOff(props) {
  return (
    <Icon {...props}>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M8.5 15.5a6 6 0 0 1 7 0" />
      <path d="M5 12a10.9 10.9 0 0 1 5-2.7" />
      <path d="M19 12a10.9 10.9 0 0 0 -2.7-2.2" />
      <path d="M2 8.5a16 16 0 0 1 5-3.3" />
      <path d="M22 8.5a16 16 0 0 0 -6-3.6" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}
export function BarChart3(props) {
  return (
    <Icon {...props}>
      <line x1="4" y1="20" x2="4" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="20" y1="20" x2="20" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </Icon>
  );
}

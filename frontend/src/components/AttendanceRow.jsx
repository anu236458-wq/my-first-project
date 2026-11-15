import React from 'react';

// Generates 2-letter initials from student name (e.g. "Aman Roy" -> "AR")
export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Palette of pastel avatar styles matching the user's reference mockup
const AVATAR_STYLES = [
  { bg: '#fef3c7', text: '#92400e' }, // Amber (Aman Roy)
  { bg: '#ede9fe', text: '#5b21b6' }, // Purple / Lilac (Riya Das)
  { bg: '#d1fae5', text: '#065f46' }, // Mint / Emerald (Karan Singh)
  { bg: '#ecfccb', text: '#3f6212' }, // Lime (Neha Verma)
  { bg: '#e0e7ff', text: '#3730a3' }, // Indigo / Blue (Pooja Gupta)
  { bg: '#ffe4e6', text: '#9f1239' }, // Rose
  { bg: '#cffafe', text: '#155e75' }  // Cyan
];

export function getAvatarStyle(id = 0) {
  return AVATAR_STYLES[id % AVATAR_STYLES.length];
}

export default function AttendanceRow({ student, status, onMark }) {
  const initials = getInitials(student.name);
  const avatarStyle = getAvatarStyle(student.id || 1);

  const isPresent = status === 'P';
  const isAbsent = status === 'A';

  return (
    <div className="student-row-card">
      {/* Left: Pastel Avatar with Initials */}
      <div
        className="student-avatar"
        style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}
      >
        {initials}
      </div>

      {/* Center: Student Name & Roll Number */}
      <div className="student-meta">
        <h4 className="student-title">{student.name}</h4>
        <div className="student-subtitle">
          <span>Roll {student.roll_no}</span>
          {student.parent_name && (
            <span className="student-parent-hint"> • 👨‍👧 {student.parent_name}</span>
          )}
        </div>
      </div>

      {/* Right: Modern P & A Squircle Buttons */}
      <div className="action-button-group">
        <button
          type="button"
          className={`btn-pa-squircle btn-p ${isPresent ? 'active-p' : ''}`}
          onClick={() => onMark(student.id, 'P')}
          aria-label={`Mark ${student.name} Present`}
        >
          P
        </button>

        <button
          type="button"
          className={`btn-pa-squircle btn-a ${isAbsent ? 'active-a' : ''}`}
          onClick={() => onMark(student.id, 'A')}
          aria-label={`Mark ${student.name} Absent`}
        >
          A
        </button>
      </div>
    </div>
  );
}

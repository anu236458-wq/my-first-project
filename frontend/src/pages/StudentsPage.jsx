import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { getInitials, getAvatarStyle } from '../components/AttendanceRow';

// ─── Subject map per class / stream ────────────────────────────
const SUBJECT_MAP = {
  '9':        ['Maths', 'Science', 'English', 'Hindi', 'Social Science'],
  '10':       ['Maths', 'Science'],
  'PCM':      ['Physics', 'Chemistry', 'Maths'],
  'PCB':      ['Physics', 'Chemistry', 'Biology'],
  'Commerce': ['Accountancy', 'Business Studies', 'Economics'],
};

function getSubjects(cls, stream) {
  if (cls === '9')  return SUBJECT_MAP['9'];
  if (cls === '10') return SUBJECT_MAP['10'];
  if ((cls === '11' || cls === '12') && stream) return SUBJECT_MAP[stream] || [];
  return [];
}

const STREAM_COLORS = {
  PCM:      { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', dot: '#3B82F6' },
  PCB:      { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', dot: '#22C55E' },
  Commerce: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', dot: '#F97316' },
};

const BOARD_OPTIONS = ['UP Board', 'CBSE'];

// ─── Empty form state ───────────────────────────────────────────
const EMPTY_FORM = {
  name:        '',
  address:     '',
  parentName:  '',
  parentPhone: '+91',
  rollNo:      '',
  studentClass:'',
  stream:      '',
  board:       '',
  batchId:     '',
  subjectFees: {},   // { Physics: '2000', Chemistry: '1800', … }
};

export default function StudentsPage() {
  const [students,     setStudents]     = useState([]);
  const [batches,      setBatches]      = useState([]);
  const [selectedBatch,setSelectedBatch]= useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [loading,      setLoading]      = useState(true);
  const [removingId,   setRemovingId]   = useState(null);
  const [confirmStudent,setConfirmStudent]=useState(null);

  // Form
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // ── computed ──────────────────────────────────────────────────
  const subjects = getSubjects(form.studentClass, form.stream);
  const needsStream  = form.studentClass === '11' || form.studentClass === '12';
  const showBoard    = !!form.studentClass;   // board for all classes
  const showSubjects = subjects.length > 0;

  // ── loaders ───────────────────────────────────────────────────
  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBatch)  params.batch_id = selectedBatch;
      if (searchQuery)    params.search   = searchQuery;
      const [studRes, batchRes] = await Promise.all([api.getStudents(params), api.getBatches()]);
      if (studRes.success)  setStudents(studRes.data);
      if (batchRes.success) {
        setBatches(batchRes.data);
        if (!form.batchId && batchRes.data.length > 0)
          setForm(f => ({ ...f, batchId: String(batchRes.data[0].id) }));
      }
    } catch (err) { alert(`Error loading students: ${err.message}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStudents(); }, [selectedBatch, searchQuery]);

  // ── form helpers ──────────────────────────────────────────────
  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleClassChange = (cls) => {
    // reset stream + subjectFees when class changes
    setForm(f => ({ ...f, studentClass: cls, stream: '', subjectFees: {} }));
  };

  const handleStreamChange = (stream) => {
    setForm(f => ({ ...f, stream, subjectFees: {} }));
  };

  const handleSubjectFee = (subject, fee) => {
    setForm(f => ({ ...f, subjectFees: { ...f.subjectFees, [subject]: fee } }));
  };

  // ── validation ────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.name.trim())        errs.name        = 'Student name is required';
    if (!form.address.trim())     errs.address     = 'Address is required';
    if (!form.parentName.trim())  errs.parentName  = 'Parent name is required';
    if (!form.parentPhone || form.parentPhone.length < 10) errs.parentPhone = 'Valid phone number is required';
    if (!form.rollNo.trim())      errs.rollNo      = 'Roll number is required';
    if (!form.studentClass)       errs.studentClass= 'Please select a class';
    if (!form.board)              errs.board       = 'Please select a board';
    if (!form.batchId)            errs.batchId     = 'Please assign a batch';
    if (needsStream && !form.stream) errs.stream   = 'Please select a stream';
    return errs;
  };

  // ── submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setSaving(true);
    try {
      const payload = {
        name:          form.name.trim(),
        address:       form.address.trim(),
        parent_name:   form.parentName.trim(),
        parent_phone:  form.parentPhone,
        roll_no:       form.rollNo.trim(),
        batch_id:      form.batchId,
        student_class: form.studentClass,
        stream:        form.stream || null,
        board:         form.board,
        subject_fees:  subjects.map(s => ({
          subject: s,
          fee: parseFloat(form.subjectFees[s] || 0)
        })),
      };
      const res = await api.createStudent(payload);
      if (res.success) {
        setShowModal(false);
        setForm(EMPTY_FORM);
        loadStudents();
      }
    } catch (err) { alert(`Failed to save student: ${err.message}`); }
    finally { setSaving(false); }
  };

  // ── remove ────────────────────────────────────────────────────
  const handleRemove = async (student) => {
    setRemovingId(student.id);
    try {
      const res = await api.deleteStudent(student.id);
      if (res.success) {
        setStudents(prev => prev.filter(s => s.id !== student.id));
        setConfirmStudent(null);
      }
    } catch (err) { alert(`Failed to remove student: ${err.message}`); }
    finally { setRemovingId(null); }
  };

  // ── UI helpers ────────────────────────────────────────────────
  const err = (key) => formErrors[key] && (
    <span style={{ color: 'var(--danger-rose)', fontSize: '0.74rem', fontWeight: 600, marginTop: '3px', display: 'block' }}>
      {formErrors[key]}
    </span>
  );

  const totalFee = subjects.reduce((acc, s) => acc + parseFloat(form.subjectFees[s] || 0), 0);

  // ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ── */}
      <div className="card" style={{ padding: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--electric-blue)' }}>Students Directory</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage student enrollment and parent contacts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setShowModal(true); }}>
          + Add Student
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ padding: '12px', marginBottom: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <input type="text" className="form-control" placeholder="Search student name, roll no, or phone..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div style={{ width: '220px' }}>
          <select className="form-control" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
            <option value="">All Batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Count label ── */}
      {!loading && students.length > 0 && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px', paddingLeft: '2px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
          {students.length} Student{students.length !== 1 ? 's' : ''} Enrolled
        </div>
      )}

      {/* ── Student List ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading students...</div>
      ) : students.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No students found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {students.map((s, idx) => {
            const initials    = getInitials(s.name);
            const avatarStyle = getAvatarStyle(s.id || idx);
            const isRemoving  = removingId === s.id;
            const totalSubFee = Array.isArray(s.subject_fees)
              ? s.subject_fees.reduce((a, x) => a + Number(x.fee || 0), 0) : 0;

            return (
              <div key={s.id} className="student-row-card"
                style={{ padding: '13px 16px', opacity: isRemoving ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                <div className="student-avatar" style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}>
                  {initials}
                </div>

                <div className="student-meta" style={{ flex: 1, minWidth: 0 }}>
                  {/* Row 1: name + badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                    <span className="student-title">{s.name}</span>
                    <span className="roll-badge">Roll {s.roll_no}</span>
                    {s.student_class && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '7px', background: '#EFF6FF', color: '#1D4ED8' }}>
                        Class {s.student_class}
                      </span>
                    )}
                    {s.stream && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '7px',
                        background: STREAM_COLORS[s.stream]?.bg || '#F1F5F9',
                        color: STREAM_COLORS[s.stream]?.text || '#475569' }}>
                        {s.stream}
                      </span>
                    )}
                    {s.board && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '7px', background: '#F5F3FF', color: '#6D28D9' }}>
                        {s.board}
                      </span>
                    )}
                    <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-neutral'}`}
                      style={{ fontSize: '0.68rem', padding: '2px 7px' }}>{s.status}</span>
                  </div>

                  {/* Row 2: batch + parent + subjects */}
                  <div className="student-subtitle" style={{ marginTop: '3px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--electric-blue)' }}>{s.batch_name}</span>
                    <span style={{ margin: '0 5px', color: 'var(--text-soft)' }}>•</span>
                    <span>Parent: {s.parent_name}</span>
                    <span style={{ margin: '0 5px', color: 'var(--text-soft)' }}>•</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.parent_phone}</span>
                  </div>

                  {/* Row 3: subject fees pills */}
                  {Array.isArray(s.subject_fees) && s.subject_fees.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {s.subject_fees.map(sf => (
                        <span key={sf.subject} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '7px', background: 'rgba(53,169,255,0.1)', color: 'var(--electric-blue)' }}>
                          {sf.subject}: ₹{Number(sf.fee).toLocaleString('en-IN')}
                        </span>
                      ))}
                      {totalSubFee > 0 && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '7px', background: '#FEF3C7', color: '#92400E' }}>
                          Total: ₹{totalSubFee.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Remove button */}
                <button type="button" onClick={() => setConfirmStudent(s)} disabled={isRemoving}
                  style={{ width: '36px', height: '36px', borderRadius: '11px', flexShrink: 0,
                    border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(254,242,242,0.9)',
                    color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 700, lineHeight: 1, fontFamily: 'inherit',
                    transition: 'all 0.16s ease',
                    boxShadow: '0 3px 8px rgba(239,68,68,.12),inset 0 1px 2px rgba(255,255,255,.8)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.92)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(254,242,242,.9)'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.transform = 'scale(1)'; }}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ADD STUDENT MODAL — Dynamic Multi-Section Form
      ══════════════════════════════════════════════════════════= */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}
            style={{ maxHeight: '92vh', overflow: 'auto', borderRadius: '28px 28px 0 0' }}>
            <div className="modal-handle"></div>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: '1.15rem', letterSpacing: '-0.3px' }}>Enroll New Student</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Fill in all required details below</p>
              </div>
              <button onClick={() => setShowModal(false)}
                style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: '#F1F5F9', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>

              {/* ── SECTION 1: Student Details ── */}
              <SectionHeader icon="👤" label="Student Details" />

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-control" placeholder="e.g. Aarav Sharma"
                  value={form.name} onChange={e => setField('name', e.target.value)} />
                {err('name')}
              </div>

              <div className="form-group">
                <label className="form-label">Address *</label>
                <textarea className="form-control" rows="2" placeholder="e.g. 12 Gandhi Nagar, Lucknow, UP"
                  value={form.address} onChange={e => setField('address', e.target.value)}
                  style={{ resize: 'none' }} />
                {err('address')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Roll Number *</label>
                  <input type="text" className="form-control" placeholder="e.g. 101"
                    value={form.rollNo} onChange={e => setField('rollNo', e.target.value)} />
                  {err('rollNo')}
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Batch *</label>
                  <select className="form-control" value={form.batchId} onChange={e => setField('batchId', e.target.value)}>
                    <option value="">Select batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {err('batchId')}
                </div>
              </div>

              {/* ── SECTION 2: Parent Details ── */}
              <SectionHeader icon="👨‍👧" label="Parent / Guardian Details" />

              <div className="form-group">
                <label className="form-label">Parent / Guardian Name *</label>
                <input type="text" className="form-control" placeholder="e.g. Ramesh Verma"
                  value={form.parentName} onChange={e => setField('parentName', e.target.value)} />
                {err('parentName')}
              </div>

              <div className="form-group">
                <label className="form-label">Parent WhatsApp Number *</label>
                <input type="tel" className="form-control" placeholder="+919876543210"
                  value={form.parentPhone} onChange={e => setField('parentPhone', e.target.value)} />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '4px', display: 'block' }}>
                  E.164 format (+91XXXXXXXXXX). Used for absence alerts.
                </small>
                {err('parentPhone')}
              </div>

              {/* ── SECTION 3: Class & Board ── */}
              <SectionHeader icon="🏫" label="Class & Board" />

              {/* Class picker — 4 big pill buttons */}
              <div className="form-group">
                <label className="form-label">Class *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {['9', '10', '11', '12'].map(cls => (
                    <button key={cls} type="button"
                      onClick={() => handleClassChange(cls)}
                      style={{
                        height: '44px', border: '1.5px solid', borderRadius: '12px',
                        fontWeight: 800, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.16s ease',
                        borderColor: form.studentClass === cls ? 'var(--sky-blue)' : 'rgba(226,232,240,.9)',
                        background: form.studentClass === cls
                          ? 'linear-gradient(135deg,var(--sky-blue),var(--electric-blue))'
                          : 'rgba(255,255,255,.95)',
                        color: form.studentClass === cls ? '#fff' : 'var(--text-main)',
                        boxShadow: form.studentClass === cls
                          ? '0 6px 16px rgba(21,85,217,.35),inset 0 1px 2px rgba(255,255,255,.5)'
                          : '0 2px 6px rgba(15,23,42,.04),inset 0 1px 2px #fff',
                        transform: form.studentClass === cls ? 'translateY(-1px)' : 'none',
                      }}>
                      {cls}th
                    </button>
                  ))}
                </div>
                {err('studentClass')}
              </div>

              {/* Board picker */}
              {showBoard && (
                <div className="form-group">
                  <label className="form-label">Board *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {BOARD_OPTIONS.map(b => (
                      <button key={b} type="button" onClick={() => setField('board', b)}
                        style={{
                          height: '42px', border: '1.5px solid', borderRadius: '12px',
                          fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.16s ease',
                          borderColor: form.board === b ? '#7C3AED' : 'rgba(226,232,240,.9)',
                          background: form.board === b ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' : 'rgba(255,255,255,.95)',
                          color: form.board === b ? '#fff' : 'var(--text-main)',
                          boxShadow: form.board === b
                            ? '0 6px 16px rgba(124,58,237,.3),inset 0 1px 2px rgba(255,255,255,.5)'
                            : '0 2px 6px rgba(15,23,42,.04)',
                        }}>
                        {b}
                      </button>
                    ))}
                  </div>
                  {err('board')}
                </div>
              )}

              {/* ── SECTION 4: Stream (Class 11 / 12 only) ── */}
              {needsStream && (
                <>
                  <SectionHeader icon="📚" label="Stream Selection" />
                  <div className="form-group">
                    <label className="form-label">Select Stream *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {['PCM', 'PCB', 'Commerce'].map(st => {
                        const sc = STREAM_COLORS[st];
                        const active = form.stream === st;
                        return (
                          <button key={st} type="button" onClick={() => handleStreamChange(st)}
                            style={{
                              padding: '10px 6px', border: '1.5px solid', borderRadius: '13px',
                              fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
                              transition: 'all 0.16s ease', textAlign: 'center',
                              borderColor: active ? sc.dot : 'rgba(226,232,240,.9)',
                              background: active ? sc.bg : 'rgba(255,255,255,.95)',
                              color: active ? sc.text : 'var(--text-muted)',
                              boxShadow: active
                                ? `0 6px 14px ${sc.dot}30,inset 0 1px 2px rgba(255,255,255,.8)`
                                : '0 2px 6px rgba(15,23,42,.04)',
                              transform: active ? 'translateY(-1px)' : 'none',
                            }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px', opacity: 0.75 }}>
                              {st === 'PCM' ? 'Sci Math' : st === 'PCB' ? 'Sci Bio' : 'Commerce'}
                            </div>
                            {st}
                          </button>
                        );
                      })}
                    </div>
                    {err('stream')}
                  </div>

                  {/* Stream subject list preview */}
                  {form.stream && (
                    <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '12px',
                      background: STREAM_COLORS[form.stream]?.bg, border: `1px solid ${STREAM_COLORS[form.stream]?.border}`,
                      fontSize: '0.8rem', fontWeight: 600, color: STREAM_COLORS[form.stream]?.text }}>
                      Subjects: {(SUBJECT_MAP[form.stream] || []).join(' • ')}
                    </div>
                  )}
                </>
              )}

              {/* ── SECTION 5: Subject-wise Fees ── */}
              {showSubjects && subjects.length > 0 && (
                <>
                  <SectionHeader icon="₹" label="Subject-wise Fees (per month / as applicable)" />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                    {subjects.map(subject => (
                      <div key={subject} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        background: 'rgba(255,255,255,.95)', border: '1.5px solid rgba(226,232,240,.9)',
                        borderRadius: '14px', padding: '10px 14px',
                        boxShadow: 'inset 0 2px 4px rgba(15,23,42,.04)',
                      }}>
                        {/* Subject dot + name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                            background: form.stream ? STREAM_COLORS[form.stream]?.dot : '#35A9FF',
                          }} />
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{subject}</span>
                        </div>

                        {/* Fee input */}
                        <div style={{ position: 'relative', width: '130px', flexShrink: 0 }}>
                          <span style={{
                            position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)',
                            fontWeight: 800, color: 'var(--electric-blue)', fontSize: '0.9rem', pointerEvents: 'none',
                          }}>₹</span>
                          <input type="number" min="0" placeholder="0"
                            value={form.subjectFees[subject] || ''}
                            onChange={e => handleSubjectFee(subject, e.target.value)}
                            style={{
                              width: '100%', padding: '8px 10px 8px 26px', borderRadius: '10px',
                              border: '1.5px solid rgba(53,169,255,.35)', background: 'rgba(240,247,255,.7)',
                              fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)',
                              fontFamily: 'inherit', outline: 'none',
                              boxShadow: 'inset 0 1px 3px rgba(15,23,42,.05)',
                            }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total fee summary */}
                  {totalFee > 0 && (
                    <div style={{
                      padding: '12px 16px', borderRadius: '14px', marginBottom: '14px',
                      background: 'linear-gradient(135deg,rgba(53,169,255,.08),rgba(21,85,217,.05))',
                      border: '1.5px solid rgba(53,169,255,.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        Total Fee ({subjects.length} subjects)
                      </span>
                      <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--electric-blue)', letterSpacing: '-0.5px' }}>
                        ₹{totalFee.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* ── Submit ── */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '48px', fontSize: '0.95rem' }} disabled={saving}>
                  {saving ? 'Enrolling...' : 'Enroll Student'}
                </button>
                <button type="button" className="btn btn-outline" style={{ height: '48px', padding: '0 20px' }}
                  onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Remove Modal ── */}
      {confirmStudent && (
        <div className="modal-overlay" onClick={() => setConfirmStudent(null)} style={{ alignItems: 'center' }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}
            style={{ borderRadius: '24px', maxWidth: '360px', margin: '0 16px', padding: '26px 22px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '18px', background: 'rgba(254,242,242,.9)',
              border: '1.5px solid rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', boxShadow: '0 6px 16px rgba(239,68,68,.15)', fontSize: '1.4rem', color: '#DC2626', fontWeight: 800 }}>
              ✕
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, textAlign: 'center', marginBottom: '6px' }}>Remove Student?</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '20px' }}>
              Are you sure you want to remove <strong>{confirmStudent.name}</strong> (Roll {confirmStudent.roll_no})?
              Attendance history will be preserved.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" style={{ flex: 1, height: '44px' }} onClick={() => setConfirmStudent(null)}>
                Cancel
              </button>
              <button style={{ flex: 1, height: '44px', border: 'none', borderRadius: '14px', cursor: 'pointer',
                fontWeight: 800, fontSize: '0.9rem', color: '#fff', fontFamily: 'inherit',
                background: 'linear-gradient(180deg,#F87171 0%,#DC2626 100%)',
                boxShadow: '0 10px 22px -3px rgba(220,38,38,.42),inset 0 2px 4px rgba(255,255,255,.75),inset 0 -3px 5px rgba(150,20,20,.4)' }}
                onClick={() => handleRemove(confirmStudent)} disabled={removingId === confirmStudent.id}>
                {removingId === confirmStudent.id ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable section divider ─────────────────────────────────────
function SectionHeader({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0 12px' }}>
      <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg,transparent,rgba(226,232,240,.8))' }} />
      <span style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
        color: 'var(--text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {label}
      </span>
      <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg,rgba(226,232,240,.8),transparent)' }} />
    </div>
  );
}

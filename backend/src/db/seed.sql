-- Default Seed Data for Coaching Institute
-- Passwords:
-- admin@apex.com -> admin123
-- rahul@apex.com -> teacher123
-- priya@apex.com -> teacher123

INSERT INTO users (id, name, email, phone, password_hash, role, status) VALUES
(1, 'Admin Director', 'admin@apex.com', '+919876543200', '$2a$10$iMh.Oa8TspmXk/v9VlS10.gH9cW59fomUfV8WqP4V1kO0N0v8bWfW', 'ADMIN', 'active'),
(2, 'Rahul Sharma (Physics)', 'rahul@apex.com', '+919876543201', '$2a$10$iMh.Oa8TspmXk/v9VlS10.gH9cW59fomUfV8WqP4V1kO0N0v8bWfW', 'TEACHER', 'active'),
(3, 'Priya Singh (Chemistry)', 'priya@apex.com', '+919876543202', '$2a$10$iMh.Oa8TspmXk/v9VlS10.gH9cW59fomUfV8WqP4V1kO0N0v8bWfW', 'TEACHER', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO batches (id, name, subject, timing, teacher_id, status) VALUES
(1, 'Class 10 - Morning Physics', 'Physics', '07:30 AM - 09:00 AM', 2, 'active'),
(2, 'Class 10 - Evening Physics', 'Physics', '04:00 PM - 05:30 PM', 2, 'active'),
(3, 'Class 11 - Chemistry JEE', 'Chemistry', '05:30 PM - 07:00 PM', 3, 'active'),
(4, 'Class 12 - Advanced Chemistry', 'Chemistry', '07:00 PM - 08:30 PM', 3, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, name, roll_no, parent_name, parent_phone, batch_id, joining_date, status) VALUES
(1, 'Aman Roy', '01', 'Sunil Roy', '+919876543210', 1, '2026-04-01', 'active'),
(2, 'Riya Das', '02', 'Subhash Das', '+919876543211', 1, '2026-04-01', 'active'),
(3, 'Karan Singh', '03', 'Gurpreet Singh', '+919876543212', 1, '2026-04-05', 'active'),
(4, 'Neha Verma', '04', 'Ramesh Verma', '+919876543213', 1, '2026-04-07', 'active'),
(5, 'Pooja Gupta', '05', 'Manoj Gupta', '+919876543214', 1, '2026-04-10', 'active'),
(6, 'Aarav Sharma', '06', 'Rajesh Sharma', '+919876543215', 1, '2026-04-10', 'active'),
(7, 'Diya Kapoor', '07', 'Vikram Kapoor', '+919876543216', 1, '2026-04-12', 'active'),
(8, 'Ishaan Gupta', '08', 'Alok Gupta', '+919876543217', 1, '2026-04-15', 'active'),
(9, 'Pranav Rao', '09', 'Naveen Rao', '+919876543218', 2, '2026-04-15', 'active'),
(10, 'Rhea Sen', '10', 'Amit Sen', '+919876543219', 2, '2026-04-18', 'active'),
(11, 'Tanmay Kulkarni', '11', 'Anand Kulkarni', '+919876543220', 2, '2026-04-20', 'active'),
(12, 'Zoya Khan', '12', 'Farhan Khan', '+919876543221', 3, '2026-04-22', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO institute_settings (key, value, description) VALUES
('institute_name', 'Apex Coaching Institute', 'Display name on parent notifications'),
('whatsapp_template_name', 'student_absence_alert', 'Approved Meta WhatsApp template identifier'),
('whatsapp_template_text', 'Dear {{parent_name}}, {{student_name}} was absent from {{batch}} on {{date}}. - {{institute_name}}', 'Standard template format for notifications'),
('whatsapp_provider', 'mock', 'Active provider: meta, mock, gupshup, wati, interakt, aisensy')
ON CONFLICT (key) DO NOTHING;

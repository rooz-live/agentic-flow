import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data for the Employer Dashboard
const INITIAL_JOBS = [
  { id: 'job_1', title: 'Senior Software Engineer', department: 'Engineering', status: 'Active', applications: 24, posted: '2d ago' },
  { id: 'job_2', title: 'Product Designer', department: 'Design', status: 'Active', applications: 12, posted: '5d ago' },
  { id: 'job_3', title: 'Marketing Lead', department: 'Growth', status: 'Closed', applications: 45, posted: '14d ago' },
];

export const JobBoardEmployer: React.FC = () => {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [isPosting, setIsPosting] = useState(false);

  // Stats derived from jobs
  const activeJobsCount = jobs.filter(j => j.status === 'Active').length;
  const totalApplications = jobs.reduce((sum, j) => sum + j.applications, 0);

  return (
    <div className="employer-dashboard-container">
      {/* Dashboard Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-header"
      >
        <div>
          <h2>Employer Portal</h2>
          <p>SummerJobSwap Talent Matrix</p>
        </div>
        <button 
          className="post-job-btn"
          onClick={() => setIsPosting(true)}
        >
          <span className="icon">+</span> Post New Job
        </button>
      </motion.div>

      {/* Metrics Row */}
      <div className="metrics-row">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="metric-card glass-panel"
        >
          <h3>Active Listings</h3>
          <div className="metric-value">{activeJobsCount}</div>
          <div className="metric-trend positive">↑ 2 from last week</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="metric-card glass-panel"
        >
          <h3>Total Applications</h3>
          <div className="metric-value">{totalApplications}</div>
          <div className="metric-trend positive">↑ 14% response rate</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="metric-card glass-panel"
        >
          <h3>Time to Hire</h3>
          <div className="metric-value">14d</div>
          <div className="metric-trend neutral">- Stable</div>
        </motion.div>
      </div>

      {/* Job Listings Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="jobs-table-container glass-panel"
      >
        <div className="table-header">
          <h3>Recent Postings</h3>
          <input type="text" placeholder="Search postings..." className="search-input" />
        </div>
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Applications</th>
              <th>Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, idx) => (
              <motion.tr 
                key={job.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + (idx * 0.1) }}
              >
                <td className="job-title">{job.title}</td>
                <td>{job.department}</td>
                <td>
                  <span className={`status-badge ${job.status.toLowerCase()}`}>
                    {job.status}
                  </span>
                </td>
                <td className="applications-count">{job.applications}</td>
                <td className="posted-time">{job.posted}</td>
                <td>
                  <button className="action-btn view">Review</button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Post Job Modal (AnimatePresence allows exit animations) */}
      <AnimatePresence>
        {isPosting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="modal-content glass-panel"
            >
              <h3>Draft New Posting</h3>
              <div className="form-group">
                <label>Job Title</label>
                <input type="text" placeholder="e.g. Full Stack Engineer" />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input type="text" placeholder="e.g. Engineering" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={4} placeholder="Describe the role..."></textarea>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setIsPosting(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => {
                  setJobs([{ id: `job_${Date.now()}`, title: 'New Role', department: 'TBD', status: 'Active', applications: 0, posted: 'Just now' }, ...jobs]);
                  setIsPosting(false);
                }}>Publish Job</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .employer-dashboard-container {
          padding: 2rem;
          color: #e2e8f0;
          font-family: 'Inter', sans-serif;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .dashboard-header h2 {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(90deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.5rem 0;
        }

        .dashboard-header p {
          color: #94a3b8;
          margin: 0;
        }

        .post-job-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 9999px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .post-job-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.4);
        }

        .glass-panel {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
        }

        .metrics-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .metric-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metric-card h3 {
          margin: 0;
          font-size: 0.9rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #f8fafc;
        }

        .metric-trend {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .metric-trend.positive { color: #34d399; }
        .metric-trend.neutral { color: #94a3b8; }

        .jobs-table-container {
          padding: 1.5rem;
          overflow-x: auto;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .table-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #f8fafc;
        }

        .search-input {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #60a5fa;
        }

        .jobs-table {
          width: 100%;
          border-collapse: collapse;
        }

        .jobs-table th {
          text-align: left;
          padding: 1rem;
          color: #94a3b8;
          font-weight: 500;
          font-size: 0.875rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .jobs-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
        }

        .job-title {
          font-weight: 600;
          color: #f8fafc;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.active {
          background: rgba(52, 211, 153, 0.2);
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.3);
        }

        .status-badge.closed {
          background: rgba(148, 163, 184, 0.2);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .applications-count {
          font-weight: 600;
          color: #60a5fa;
        }

        .action-btn {
          background: transparent;
          border: 1px solid #60a5fa;
          color: #60a5fa;
          padding: 0.4rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #60a5fa;
          color: #0f172a;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          width: 100%;
          max-width: 500px;
          padding: 2rem;
          background: rgba(15, 23, 42, 0.95);
        }

        .modal-content h3 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          color: #f8fafc;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .form-group input, .form-group textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.75rem;
          border-radius: 8px;
          color: white;
          font-family: inherit;
        }

        .form-group input:focus, .form-group textarea:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #cbd5e1;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-primary {
          background: #8b5cf6;
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import axios from 'axios';

function AdminVideoUpload({ adminToken, onUpload }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const inputRef = useRef(null);

  const accept = 'video/mp4,video/webm';
  const pick = () => inputRef.current?.click();

  const onFiles = (files) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!accept.split(',').includes(f.type)) {
      setMessage('Unsupported format. Please upload MP4 or WebM.');
      return;
    }
    setFile(f);
    setMessage('Ready to upload');
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    onFiles(e.dataTransfer.files);
  };

  const handleUpload = async (e) => {
    e?.preventDefault?.();
    if (!file || uploading) return;
    const formData = new FormData();
    formData.append('video', file);
    setUploading(true);
    setProgress(1);
    setMessage('Uploading...');
    try {
      const res = await axios.post('/api/upload/video', formData, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setProgress(pct);
        },
      });
      setMessage('Upload successful!');
      setVideoUrl(res.data.videoUrl);
      if (onUpload) onUpload(res.data.videoUrl);
    } catch (err) {
      setMessage('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ margin: '1.25rem 0' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>Upload Promotional Video</h3>
      <p style={{ margin: '0 0 10px 0', color: '#6b7280', fontSize: 13 }}>MP4 or WebM up to ~50MB. Drag & drop or click to pick a file.</p>

      <div
        onClick={pick}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        role="button"
        aria-label="Video upload dropzone"
        tabIndex={0}
        style={{
          border: `2px dashed ${isDragging ? 'var(--color-primary)' : '#cbd5e1'}`,
          background: isDragging ? 'rgba(59,130,246,0.06)' : '#f9fafb',
          padding: 16,
          borderRadius: 12,
          cursor: 'pointer',
          display: 'grid',
          gap: 8,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => onFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <div style={{ color: '#111827', fontWeight: 600 }}>{file ? file.name : 'Drag & drop your video here'}</div>
        <div style={{ color: '#6b7280', fontSize: 12 }}>{file ? `${Math.round(file.size / 1024 / 1024)} MB selected` : 'or click to choose a file'}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <button onClick={handleUpload} disabled={!file || uploading} style={{
          background: 'var(--color-primary)', color: '#fff', border: 0, padding: '8px 12px', borderRadius: 8, cursor: (!file || uploading) ? 'not-allowed' : 'pointer', fontWeight: 700
        }}>Upload</button>
        {uploading && (
          <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 999 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#10b981', borderRadius: 999 }} />
          </div>
        )}
        {message && <span style={{ color: message.startsWith('Upload successful') ? '#10b981' : message.startsWith('Upload failed') ? '#ef4444' : '#6b7280', fontSize: 12 }}>{message}</span>}
      </div>

      {videoUrl && (
        <div style={{ marginTop: 12 }}>
          <video controls width="420" src={videoUrl} aria-label="Promotional Video" />
        </div>
      )}
    </div>
  );
}

export default AdminVideoUpload;

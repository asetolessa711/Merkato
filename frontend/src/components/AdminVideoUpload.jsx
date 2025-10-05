import React, { useState } from 'react';
import axios from 'axios';

function AdminVideoUpload({ adminToken, onUpload }) {
  const [video, setVideo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const handleFileChange = (e) => {
    setVideo(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!video) return;
    const formData = new FormData();
    formData.append('video', video);
    try {
      const res = await axios.post('/api/upload/video', formData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadStatus('Upload successful!');
      setVideoUrl(res.data.videoUrl);
      if (onUpload) onUpload(res.data.videoUrl);
    } catch (err) {
      setUploadStatus('Upload failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ margin: '2rem 0' }}>
      <h3>Upload Promotional Video (Admin Only)</h3>
      <form onSubmit={handleUpload}>
        <input type="file" accept="video/mp4,video/webm" onChange={handleFileChange} />
        <button type="submit">Upload</button>
      </form>
      {uploadStatus && <p>{uploadStatus}</p>}
      {videoUrl && (
        <video controls width="400" src={videoUrl} style={{ marginTop: 10 }} />
      )}
    </div>
  );
}

export default AdminVideoUpload;

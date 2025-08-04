import axios from 'axios';

export const uploadProductImage = async (files, token) => {
  const formData = new FormData();
  // Accepts array or single file
  if (Array.isArray(files)) {
    files.forEach(file => formData.append('images', file));
  } else {
    formData.append('images', files);
  }

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  };

  const { data } = await axios.post('/api/upload', formData, config);
  // Return array of URLs (backend returns { imageUrls })
  return data.imageUrls || (data.imageUrl ? [data.imageUrl] : []);
};

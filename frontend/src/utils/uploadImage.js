import axios from 'axios';

export const uploadProductImage = async (file, token) => {
  const formData = new FormData();
  formData.append('image', file);

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  };

  const { data } = await axios.post('/api/upload', formData, config);
  return data.imageUrl;
};

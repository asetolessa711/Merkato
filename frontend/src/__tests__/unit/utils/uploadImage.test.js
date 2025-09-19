import axios from 'axios';
import { uploadProductImage } from '../../../utils/uploadImage';

describe('uploadImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uploads single file and returns array', async () => {
    axios.post.mockResolvedValueOnce({ data: { imageUrl: 'u1' } });
    const file = new Blob(['x'], { type: 'image/png' });
    const res = await uploadProductImage(file, 'tok');
    expect(Array.isArray(res)).toBe(true);
    expect(res).toEqual(['u1']);
    const [, , config] = axios.post.mock.calls[0];
    expect(config.headers.Authorization).toBe('Bearer tok');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });

  test('uploads multiple files and reads imageUrls array', async () => {
    axios.post.mockResolvedValueOnce({ data: { imageUrls: ['a', 'b'] } });
    const files = [new Blob(['a']), new Blob(['b'])];
    const res = await uploadProductImage(files, 'tok');
    expect(res).toEqual(['a', 'b']);
  });
});

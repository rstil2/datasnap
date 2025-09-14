import api from './api';

interface File {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  content_type: string;
  user_id: string;
  created_at: string;
  updated_at: string | null;
}

export const filesService = {
  async uploadFile(file: Blob): Promise<File> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<File>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async listFiles(): Promise<File[]> {
    const response = await api.get<File[]>('/files');
    return response.data;
  },

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/files/${fileId}`);
  },
};
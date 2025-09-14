import api from './api';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData extends LoginData {
  full_name: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('username', data.email);
    formData.append('password', data.password);
    
    const response = await api.post<AuthResponse>('/auth/login/access-token', formData);
    localStorage.setItem('accessToken', response.data.access_token);
    return response.data;
  },

  async loginWithGoogle(token: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login/google', { token });
    localStorage.setItem('accessToken', response.data.access_token);
    return response.data;
  },

  async register(data: RegisterData): Promise<void> {
    await api.post('/auth/register', data);
  },

  logout(): void {
    localStorage.removeItem('accessToken');
  },

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export enum MesaStatus {
    LIVRE = "LIVRE",
    OCUPADA = "OCUPADA",
    RESERVADA = "RESERVADA",
    MANUTENCAO = "MANUTENCAO"
}

export interface Mesa {
    id: string;
    status: MesaStatus;
    qr_code: string;
    tipo_cardapio_id: string; //UUID
    ativo: boolean;
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const createMesa = async (data: Mesa): Promise<Mesa> => {
    const response = await api.post('/mesas/', data);
    return response.data;
};

export const getMesas = async (): Promise<Mesa[]> => {
    const response = await api.get('/mesas/');
    return response.data;
};

export const getMesaById = async (id: string): Promise<Mesa> => {
    const response = await api.get(`/mesas/${id}`);
    return response.data;
};

export const updateMesa = async (id: string, data: Partial<Mesa>): Promise<Mesa> => {
    const response = await api.put(`/mesas/${id}`, data);
    return response.data;
};

export const deleteMesa = async (id: string): Promise<void> => {
    await api.delete(`/mesas/${id}`);
};


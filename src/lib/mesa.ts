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
    ativa: boolean; // Campo correto esperado pelo backend
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const createMesa = async (data: Mesa): Promise<Mesa> => {
    try {
        console.log(`Enviando requisição POST para: ${API_URL}/mesas/`);
        console.log('Dados enviados:', JSON.stringify(data));
        console.log('Headers:', {
            'Content-Type': 'application/json',
        });
        
        // Mostrar a URL completa para debug
        const url = `${API_URL}/mesas/`;
        console.log('URL completa:', url);
        
        const response = await api.post('/mesas/', data);
        console.log('Resposta da API:', response.data);
        return response.data;
    } catch (error: unknown) {
        console.error('Erro na requisição POST para criar mesa:');
        
        if (error instanceof Error) {
            console.error('Mensagem:', error.message);
        }
        
        // Verificar se é um erro do Axios
        if (axios.isAxiosError(error) && error.response) {
            console.error('Status:', error.response.status);
            console.error('Dados:', error.response.data);
            console.error('Headers:', error.response.headers);
        }
        
        throw error;
    }
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


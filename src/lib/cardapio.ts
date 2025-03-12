import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Interfaces alinhadas com o backend
export interface TipoCardapio {
    id?: string; // UUID
    nome: string;
    descricao?: string;
    ativo: boolean;
}

export interface Categoria {
    id?: string; // UUID
    nome: string;
    descricao?: string;
    ordem?: number;
    ativo: boolean;
    tipo_cardapio_id: string; // UUID
}

export interface Produto {
    id?: string; // UUID
    nome: string;
    descricao?: string;
    preco: number;
    imagem_url?: string;
    ativo: boolean;
    categoria_id: string; // UUID
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getTiposCardapio = async (): Promise<TipoCardapio[]> => {
    const response = await api.get('/cardapio/tipos');
    return response.data;
};

export const getTipoCardapioById = async (id: string): Promise<TipoCardapio> => {
    const response = await api.get(`/cardapio/tipos/${id}`);
    return response.data;
};

export const createTipoCardapio = async (data: Omit<TipoCardapio, 'id'>): Promise<TipoCardapio> => {
    const response = await api.post('/cardapio/tipos', data);
    return response.data;
};

export const updateTipoCardapio = async (id: string, data: Partial<TipoCardapio>): Promise<TipoCardapio> => {
    const response = await api.put(`/cardapio/tipos/${id}`, data);
    return response.data;
};

export const deleteTipoCardapio = async (id: string): Promise<void> => {
    await api.delete(`/cardapio/tipos/${id}`);
};

// Funções para Categoria
export const getCategorias = async (): Promise<Categoria[]> => {
    const response = await api.get('/cardapio/categorias');
    return response.data;
};

export const getCategoriaById = async (id: string): Promise<Categoria> => {
    const response = await api.get(`/cardapio/categorias/${id}`);
    return response.data;
};

export const createCategoria = async (data: Omit<Categoria, 'id'>): Promise<Categoria> => {
    const response = await api.post('/cardapio/categorias', data);
    return response.data;
};

export const updateCategoria = async (id: string, data: Partial<Categoria>): Promise<Categoria> => {
    const response = await api.put(`/cardapio/categorias/${id}`, data);
    return response.data;
};

export const deleteCategoria = async (id: string): Promise<void> => {
    await api.delete(`/cardapio/categorias/${id}`);
};

// Funções para Produto
export const getProdutos = async (): Promise<Produto[]> => {
    const response = await api.get('/cardapio/produtos');
    return response.data;
};

export const getProdutoById = async (id: string): Promise<Produto> => {
    const response = await api.get(`/cardapio/produtos/${id}`);
    return response.data;
};

export const createProduto = async (data: Omit<Produto, 'id'>): Promise<Produto> => {
    const response = await api.post('/cardapio/produtos', data);
    return response.data;
};

export const updateProduto = async (id: string, data: Partial<Produto>): Promise<Produto> => {
    const response = await api.put(`/cardapio/produtos/${id}`, data);
    return response.data;
};

export const deleteProduto = async (id: string): Promise<void> => {
    await api.delete(`/cardapio/produtos/${id}`);
};
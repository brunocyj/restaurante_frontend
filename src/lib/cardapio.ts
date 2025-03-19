import api from './api';

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

// Funções para TipoCardapio
export const getTiposCardapio = async (): Promise<TipoCardapio[]> => {
    try {
        const response = await api.get('/cardapio/tipos');
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar tipos de cardápio:', error);
        throw error;
    }
};

export const getTipoCardapioById = async (id: string): Promise<TipoCardapio> => {
    try {
        const response = await api.get(`/cardapio/tipos/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Erro ao buscar tipo de cardápio ${id}:`, error);
        throw error;
    }
};

export const createTipoCardapio = async (data: Omit<TipoCardapio, 'id'>): Promise<TipoCardapio> => {
    try {
        const response = await api.post('/cardapio/tipos', data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar tipo de cardápio:', error);
        throw error;
    }
};

export const updateTipoCardapio = async (id: string, data: Partial<TipoCardapio>): Promise<TipoCardapio> => {
    try {
        const response = await api.put(`/cardapio/tipos/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar tipo de cardápio ${id}:`, error);
        throw error;
    }
};

export const deleteTipoCardapio = async (id: string): Promise<void> => {
    try {
        await api.delete(`/cardapio/tipos/${id}`);
    } catch (error) {
        console.error(`Erro ao excluir tipo de cardápio ${id}:`, error);
        throw error;
    }
};

// Funções para Categoria
export const getCategorias = async (): Promise<Categoria[]> => {
    try {
        const response = await api.get('/cardapio/categorias');
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        throw error;
    }
};

export const getCategoriaById = async (id: string): Promise<Categoria> => {
    try {
        const response = await api.get(`/cardapio/categorias/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Erro ao buscar categoria ${id}:`, error);
        throw error;
    }
};

export const createCategoria = async (data: Omit<Categoria, 'id'>): Promise<Categoria> => {
    try {
        const response = await api.post('/cardapio/categorias', data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        throw error;
    }
};

export const updateCategoria = async (id: string, data: Partial<Categoria>): Promise<Categoria> => {
    try {
        const response = await api.put(`/cardapio/categorias/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar categoria ${id}:`, error);
        throw error;
    }
};

export const deleteCategoria = async (id: string): Promise<void> => {
    try {
        await api.delete(`/cardapio/categorias/${id}`);
    } catch (error) {
        console.error(`Erro ao excluir categoria ${id}:`, error);
        throw error;
    }
};

// Funções para Produto
export const getProdutos = async (): Promise<Produto[]> => {
    try {
        const response = await api.get('/cardapio/produtos');
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        throw error;
    }
};

export const getProdutoById = async (id: string): Promise<Produto> => {
    try {
        const response = await api.get(`/cardapio/produtos/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Erro ao buscar produto ${id}:`, error);
        throw error;
    }
};

export const createProduto = async (data: Omit<Produto, 'id'>): Promise<Produto> => {
    try {
        const response = await api.post('/cardapio/produtos', data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        throw error;
    }
};

export const updateProduto = async (id: string, data: Partial<Produto>): Promise<Produto> => {
    try {
        const response = await api.put(`/cardapio/produtos/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar produto ${id}:`, error);
        throw error;
    }
};

export const deleteProduto = async (id: string): Promise<void> => {
    try {
        await api.delete(`/cardapio/produtos/${id}`);
    } catch (error) {
        console.error(`Erro ao excluir produto ${id}:`, error);
        throw error;
    }
};
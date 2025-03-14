import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// URL do backend para comunicação interna no Railway
const BACKEND_URL = process.env.INTERNAL_API_URL || 'http://restaurante_backend:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Construir o caminho completo
    const path = params.path.join('/');
    console.log(`[API Proxy] Redirecionando GET para: ${BACKEND_URL}/${path}`);
    
    // Obter os parâmetros de consulta da URL original
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/${path}${queryString ? `?${queryString}` : ''}`;
    
    // Obter os headers da requisição original
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Não copiar o header host
      if (key !== 'host') {
        headers[key] = value;
      }
    });
    
    // Fazer a requisição para o backend
    const response = await axios.get(url, { headers });
    
    // Retornar a resposta
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`[API Proxy] Erro ao redirecionar GET:`, error);
    
    // Retornar o erro com o status correto
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Construir o caminho completo
    const path = params.path.join('/');
    console.log(`[API Proxy] Redirecionando POST para: ${BACKEND_URL}/${path}`);
    
    // Obter o corpo da requisição
    const body = await request.json().catch(() => ({}));
    
    // Obter os headers da requisição original
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Não copiar o header host
      if (key !== 'host') {
        headers[key] = value;
      }
    });
    
    // Fazer a requisição para o backend
    const response = await axios.post(`${BACKEND_URL}/${path}`, body, { headers });
    
    // Retornar a resposta
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`[API Proxy] Erro ao redirecionar POST:`, error);
    
    // Retornar o erro com o status correto
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status || 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Construir o caminho completo
    const path = params.path.join('/');
    console.log(`[API Proxy] Redirecionando PUT para: ${BACKEND_URL}/${path}`);
    
    // Obter o corpo da requisição
    const body = await request.json().catch(() => ({}));
    
    // Obter os headers da requisição original
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Não copiar o header host
      if (key !== 'host') {
        headers[key] = value;
      }
    });
    
    // Fazer a requisição para o backend
    const response = await axios.put(`${BACKEND_URL}/${path}`, body, { headers });
    
    // Retornar a resposta
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`[API Proxy] Erro ao redirecionar PUT:`, error);
    
    // Retornar o erro com o status correto
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Construir o caminho completo
    const path = params.path.join('/');
    console.log(`[API Proxy] Redirecionando DELETE para: ${BACKEND_URL}/${path}`);
    
    // Obter os headers da requisição original
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Não copiar o header host
      if (key !== 'host') {
        headers[key] = value;
      }
    });
    
    // Fazer a requisição para o backend
    const response = await axios.delete(`${BACKEND_URL}/${path}`, { headers });
    
    // Retornar a resposta
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`[API Proxy] Erro ao redirecionar DELETE:`, error);
    
    // Retornar o erro com o status correto
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status || 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Construir o caminho completo
    const path = params.path.join('/');
    console.log(`[API Proxy] Redirecionando PATCH para: ${BACKEND_URL}/${path}`);
    
    // Obter o corpo da requisição
    const body = await request.json().catch(() => ({}));
    
    // Obter os headers da requisição original
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Não copiar o header host
      if (key !== 'host') {
        headers[key] = value;
      }
    });
    
    // Fazer a requisição para o backend
    const response = await axios.patch(`${BACKEND_URL}/${path}`, body, { headers });
    
    // Retornar a resposta
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`[API Proxy] Erro ao redirecionar PATCH:`, error);
    
    // Retornar o erro com o status correto
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status || 500 }
    );
  }
} 
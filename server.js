require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança e performance
app.use(helmet({
    contentSecurityPolicy: false // Permitir recursos externos
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração da API do Google Sheets
const SPREADSHEET_ID = '1HdIWJt0fcZf_SFo16wawpkQ3NwiAnxs4fvkp9FYdZjQ';
const RANGE = 'A:Z'; // Ajuste conforme necessário

// Cache em memória para reduzir chamadas à API
let memoryCache = {
    data: null,
    timestamp: null,
    maxAge: 5000 // 5 segundos de cache em memória
};

// Função para obter dados da planilha usando API Key (planilha pública)
async function getSheetData() {
    // Verifica cache em memória
    if (memoryCache.data && memoryCache.timestamp) {
        const age = Date.now() - memoryCache.timestamp;
        if (age < memoryCache.maxAge) {
            console.log('Retornando dados do cache em memória');
            return memoryCache.data;
        }
    }

    try {
        console.log('Buscando dados frescos da planilha...');
        const sheets = google.sheets({ 
            version: 'v4',
            auth: process.env.GOOGLE_API_KEY 
        });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE
        });

        const rows = response.data.values;
        
        if (!rows || rows.length === 0) {
            return { headers: [], data: [] };
        }

        // Primeira linha como cabeçalhos
        const headers = rows[0];
        const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });

        const result = { headers, data };
        
        // Atualiza cache em memória
        memoryCache.data = result;
        memoryCache.timestamp = Date.now();
        
        return result;
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        // Se houver erro, retorna cache se disponível
        if (memoryCache.data) {
            console.log('Erro na API, retornando cache anterior');
            return memoryCache.data;
        }
        throw error;
    }
}

// Rota API para obter dados da planilha
app.get('/api/data', async (req, res) => {
    try {
        const sheetData = await getSheetData();
        
        // SEM CACHE no navegador - sempre busca dados frescos
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.json({
            success: true,
            data: sheetData.data,
            headers: sheetData.headers,
            timestamp: new Date().toISOString(),
            cached: memoryCache.timestamp ? 
                (Date.now() - memoryCache.timestamp < memoryCache.maxAge) : false
        });
    } catch (error) {
        console.error('Erro na API:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar dados da planilha',
            message: error.message
        });
    }
});

// Rota para limpar cache (útil para forçar atualização)
app.post('/api/clear-cache', (req, res) => {
    memoryCache.data = null;
    memoryCache.timestamp = null;
    res.json({ 
        success: true, 
        message: 'Cache limpo com sucesso' 
    });
});

// Rota para verificar status da API e cache
app.get('/api/health', (req, res) => {
    const cacheAge = memoryCache.timestamp ? 
        Math.floor((Date.now() - memoryCache.timestamp) / 1000) : null;
    
    res.json({ 
        status: 'online',
        timestamp: new Date().toISOString(),
        cache: {
            hasData: !!memoryCache.data,
            ageSeconds: cacheAge,
            maxAgeSeconds: memoryCache.maxAge / 1000
        }
    });
});

// Webhook para receber notificações de mudança (opcional)
app.post('/api/webhook', async (req, res) => {
    console.log('Webhook recebido - planilha atualizada:', req.body);
    
    // Limpa cache para forçar busca de dados novos
    memoryCache.data = null;
    memoryCache.timestamp = null;
    
    res.json({ 
        received: true,
        message: 'Cache limpo, próxima requisição buscará dados novos' 
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
    🚀 Servidor rodando em http://localhost:${PORT}
    📊 API de dados: http://localhost:${PORT}/api/data
    ❤️  Health check: http://localhost:${PORT}/api/health
    🔄 Clear cache: POST http://localhost:${PORT}/api/clear-cache
    
    ⚡ Configurações de Performance:
    - Cache em memória: ${memoryCache.maxAge/1000}s
    - Cache HTTP: Desabilitado (tempo real)
    - Compressão: Ativada
    
    💡 Dica: Para atualização instantânea, configure
    o cliente para buscar a cada 10-30 segundos
    `);
});
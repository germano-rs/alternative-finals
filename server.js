require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
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

// Função para inicializar autenticação
function initializeAuth() {
    if (process.env.GOOGLE_CREDENTIALS) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            return new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });
        } catch (error) {
            console.error('Erro ao parsear GOOGLE_CREDENTIALS:', error);
            return process.env.GOOGLE_API_KEY;
        }
    } else if (fs.existsSync(path.join(__dirname, 'credentials.json'))) {
        return new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
    } else {
        console.log('Usando API Key (apenas leitura). Para escrita, configure Service Account.');
        return process.env.GOOGLE_API_KEY;
    }
}

const auth = initializeAuth();

// Função para obter dados da planilha
// Usa Service Account se credentials.json ou GOOGLE_CREDENTIALS estiverem configurados
// Caso contrário, usa API Key (apenas leitura)
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
            auth: auth
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

// Função para adicionar jogo na planilha
async function addGameToSheet(gameData) {
    try {
        const sheetData = await getSheetData();
        const headers = sheetData.headers;
        
        if (!headers || headers.length === 0) {
            throw new Error('Não foi possível obter os cabeçalhos da planilha');
        }

        const sheets = google.sheets({ 
            version: 'v4',
            auth: auth
        });

        const values = headers.map(header => {
            const headerLower = header ? header.toLowerCase().trim() : '';
            
            if (headerLower.includes('fase')) {
                return gameData.fase || '';
            } else if (headerLower.includes('jogo')) {
                return gameData.jogo || '';
            } else if (headerLower.includes('confronto')) {
                return gameData.confronto || '';
            } else if (headerLower.includes('data') && !headerLower.includes('hora')) {
                return gameData.data || '';
            } else if (headerLower.includes('dia')) {
                return gameData.dia || '';
            } else if (headerLower.includes('horário') || headerLower.includes('horario')) {
                return gameData.horario || '';
            } else if (headerLower.includes('quadra')) {
                return gameData.quadra || '';
            } else {
                return '';
            }
        });

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A:Z',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [values]
            }
        });

        memoryCache.data = null;
        memoryCache.timestamp = null;

        return {
            success: true,
            updatedCells: response.data.updates?.updatedCells || 0
        };
    } catch (error) {
        console.error('Erro ao adicionar jogo:', error);
        throw error;
    }
}

// Rota para adicionar jogo
app.post('/api/add-game', async (req, res) => {
    try {
        const { fase, jogo, confronto, data, dia, horario, quadra } = req.body;

        if (!fase || !jogo || !confronto || !data || !dia || !horario || !quadra) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
        }

        const gameData = {
            fase: String(fase).trim(),
            jogo: String(jogo).trim(),
            confronto: String(confronto).trim(),
            data: String(data).trim(),
            dia: String(dia).trim(),
            horario: String(horario).trim(),
            quadra: String(quadra).trim()
        };

        const result = await addGameToSheet(gameData);

        res.json({
            success: true,
            message: 'Jogo adicionado com sucesso',
            data: result
        });
    } catch (error) {
        console.error('Erro na API ao adicionar jogo:', error);
        
        let errorMessage = 'Erro ao adicionar jogo na planilha';
        
        if (error.code === 403) {
            errorMessage = 'Permissão negada. Verifique as credenciais da API.';
        } else if (error.code === 400) {
            errorMessage = 'Dados inválidos. Verifique os campos enviados.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            message: error.message
        });
    }
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
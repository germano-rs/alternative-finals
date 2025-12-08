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

// Função para obter dados da planilha usando API Key (planilha pública)
async function getSheetData() {
    try {
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

        return { headers, data };
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        throw error;
    }
}

// Rota API para obter dados da planilha
app.get('/api/data', async (req, res) => {
    try {
        const sheetData = await getSheetData();
        
        // Cache de 5 minutos
        res.set('Cache-Control', 'public, max-age=300');
        res.json({
            success: true,
            data: sheetData.data,
            headers: sheetData.headers,
            timestamp: new Date().toISOString()
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

// Rota para verificar status da API
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online',
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
    🚀 Servidor rodando em http://localhost:${PORT}
    📊 API de dados: http://localhost:${PORT}/api/data
    ❤️  Health check: http://localhost:${PORT}/api/health
    `);
});

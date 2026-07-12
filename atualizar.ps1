param(
    [string]$Mensagem = "Atualiza projeto Dropshipping"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================"
Write-Host " ATUALIZANDO DROPSHIPPING BOT"
Write-Host "========================================"
Write-Host ""

# Confere se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "ERRO: package.json não encontrado."
    Write-Host "Execute este script dentro da pasta principal do projeto."
    exit 1
}

# Confere se o Git está instalado
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Git não está instalado ou não está no PATH."
    exit 1
}

Write-Host "[1/7] Instalando dependências..."
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao instalar dependências."
    exit 1
}

Write-Host ""
Write-Host "[2/7] Verificando sintaxe..."
npm run check

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO de sintaxe encontrado. Upload cancelado."
    exit 1
}

Write-Host ""
Write-Host "[3/7] Executando testes..."
npm test

if ($LASTEXITCODE -ne 0) {
    Write-Host "Os testes falharam. Upload cancelado."
    exit 1
}

Write-Host ""
Write-Host "[4/7] Verificando alterações no Git..."
git status --short

$alteracoes = git status --porcelain

if (-not $alteracoes) {
    Write-Host ""
    Write-Host "Nenhuma alteração encontrada."
    Write-Host "O projeto já está atualizado."
    exit 0
}

Write-Host ""
Write-Host "[5/7] Adicionando arquivos..."
git add .

Write-Host ""
Write-Host "[6/7] Criando commit..."
git commit -m $Mensagem

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao criar o commit."
    exit 1
}

Write-Host ""
Write-Host "[7/7] Enviando para o GitHub..."
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao enviar para o GitHub."
    exit 1
}

Write-Host ""
Write-Host "========================================"
Write-Host " ATUALIZAÇÃO CONCLUÍDA"
Write-Host "========================================"
Write-Host ""
Write-Host "GitHub atualizado."
Write-Host "O Render deve iniciar o deploy automaticamente."
Write-Host ""
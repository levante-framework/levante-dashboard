#!/bin/bash

# Script para build e execução do container Docker para testes E2E

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Nome da imagem
IMAGE_NAME="levante-e2e"
CONTAINER_NAME="levante-e2e-container"

# Função para limpar containers e imagens antigas
cleanup() {
    print_message "Limpando containers e imagens antigas..."
    
    # Para e remove container se existir
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    
    # Remove imagem se existir
    docker rmi $IMAGE_NAME 2>/dev/null || true
}

# Função para build da imagem
build_image() {
    print_message "Construindo imagem Docker..."
    docker build -t $IMAGE_NAME .
    
    if [ $? -eq 0 ]; then
        print_message "Imagem construída com sucesso!"
    else
        print_error "Falha na construção da imagem"
        exit 1
    fi
}

# Função para executar testes
run_tests() {
    print_message "Executando testes E2E..."
    
    docker run --rm \
        --name $CONTAINER_NAME \
        -e CI=true \
        -e NODE_ENV=development \
        -e VITE_EMULATOR=TRUE \
        -e VITE_FIREBASE_PROJECT=DEV \
        -e VITE_LEVANTE=TRUE \
        -e VITE_QUERY_DEVTOOLS_ENABLED=false \
        -v "$(pwd)/cypress/screenshots:/app/cypress/screenshots" \
        -v "$(pwd)/cypress/videos:/app/cypress/videos" \
        $IMAGE_NAME
    
    if [ $? -eq 0 ]; then
        print_message "Testes executados com sucesso!"
    else
        print_error "Falha na execução dos testes"
        exit 1
    fi
}

# Função para mostrar ajuda
show_help() {
    echo "Uso: $0 [OPÇÃO]"
    echo ""
    echo "Opções:"
    echo "  build     - Apenas construir a imagem Docker"
    echo "  run       - Executar testes (requer imagem já construída)"
    echo "  full      - Limpar, construir e executar testes (padrão)"
    echo "  clean     - Limpar containers e imagens"
    echo "  help      - Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0          # Executa o processo completo"
    echo "  $0 build    # Apenas constrói a imagem"
    echo "  $0 run      # Executa testes (imagem deve existir)"
}

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    print_error "Docker não está rodando. Inicie o Docker e tente novamente."
    exit 1
fi

# Processar argumentos
case "${1:-full}" in
    "build")
        cleanup
        build_image
        ;;
    "run")
        run_tests
        ;;
    "full")
        cleanup
        build_image
        run_tests
        ;;
    "clean")
        cleanup
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Opção inválida: $1"
        show_help
        exit 1
        ;;
esac 
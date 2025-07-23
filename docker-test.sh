#!/bin/bash

# Simple script to run E2E tests with Docker Compose

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! docker-compose --version >/dev/null 2>&1; then
    print_error "Docker Compose is not available. Install Docker Compose and try again."
    exit 1
fi

# Function to cleanup
cleanup() {
    print_message "Cleaning up containers..."
    docker-compose down --volumes --remove-orphans
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  build     - Build all Docker images"
    echo "  up        - Start all services"
    echo "  down      - Stop all services"
    echo "  test      - Run complete test suite (build + up + test + down)"
    echo "  logs      - Show logs from all services"
    echo "  clean     - Clean up everything"
    echo "  help      - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 test    # Run complete test suite"
    echo "  $0 build   # Build images only"
    echo "  $0 up      # Start services only"
}

# Process arguments
case "${1:-test}" in
    "build")
        print_message "Building Docker images..."
        docker-compose build
        ;;
    "up")
        print_message "Starting services..."
        docker-compose up -d
        print_message "Services started. Use '$0 logs' to see logs."
        ;;
    "down")
        print_message "Stopping services..."
        docker-compose down
        ;;
    "test")
        print_message "Running complete test suite..."
        cleanup
        docker-compose build
        docker-compose up -d
        print_message "Waiting for services to be ready..."
        docker-compose run --rm cypress
        print_message "Tests completed!"
        cleanup
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "clean")
        cleanup
        docker system prune -f
        print_message "Cleanup completed!"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Invalid option: $1"
        show_help
        exit 1
        ;;
esac 
#!/bin/bash

# Script for building and running Docker container for E2E tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Image name
IMAGE_NAME="levante-e2e"
CONTAINER_NAME="levante-e2e-container"

# Function to clean up old containers and images
cleanup() {
    print_message "Cleaning up old containers and images..."
    
    # Stop and remove container if exists
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    
    # Remove image if exists
    docker rmi $IMAGE_NAME 2>/dev/null || true
}

# Function to build image
build_image() {
    print_message "Building Docker image..."
    docker build -t $IMAGE_NAME .
    
    if [ $? -eq 0 ]; then
        print_message "Image built successfully!"
    else
        print_error "Failed to build image"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    print_message "Running E2E tests..."
    
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
        print_message "Tests executed successfully!"
    else
        print_error "Failed to execute tests"
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  build     - Only build Docker image"
    echo "  run       - Run tests (requires image to be built)"
    echo "  full      - Clean, build and run tests (default)"
    echo "  clean     - Clean containers and images"
    echo "  help      - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0          # Execute complete process"
    echo "  $0 build    # Only build image"
    echo "  $0 run      # Run tests (image must exist)"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Start Docker and try again."
    exit 1
fi

# Process arguments
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
        print_error "Invalid option: $1"
        show_help
        exit 1
        ;;
esac 
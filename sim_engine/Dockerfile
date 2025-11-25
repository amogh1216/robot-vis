# Sim Engine Dockerfile
# Multi-stage build for Go application

# Stage 1: Build
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install git (required for go mod download with some dependencies)
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server/main.go

# Stage 2: Production
FROM alpine:latest AS production

WORKDIR /app

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Copy binary from builder
COPY --from=builder /app/server .

# Expose port 3001
EXPOSE 3001

# Run the server
CMD ["./server"]

# Development stage with hot reload
FROM golang:1.23-alpine AS development

WORKDIR /app

# Install git (needed for some go dependencies)
RUN apk add --no-cache git

# Install air for hot reload (use v1.52.3 which supports Go 1.23)
RUN go install github.com/air-verse/air@v1.52.3

# Add Go bin to PATH
ENV PATH="/root/go/bin:${PATH}"

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Expose port 3001
EXPOSE 3001

# Run with air for hot reload
CMD ["air", "-c", ".air.toml"]

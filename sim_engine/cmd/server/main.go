package main

import (
	"log"
	"net/http"
	"os"

	"github.com/amogh1216/robot-vis/sim_engine/internal/api"
	"github.com/amogh1216/robot-vis/sim_engine/internal/websocket"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Set up router
	router := mux.NewRouter()

	// API routes
	apiHandler := api.NewHandler(hub)
	apiRouter := router.PathPrefix("/api").Subrouter()
	apiRouter.HandleFunc("/health", apiHandler.HealthCheck).Methods("GET")
	apiRouter.HandleFunc("/constants", apiHandler.UpdateConstants).Methods("POST")

	// WebSocket route
	router.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWs(hub, w, r)
	})

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	// Start server
	port := getEnv("PORT", "3001")
	log.Printf("Starting simulation engine on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

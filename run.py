from app import create_app, socketio

app = create_app()

print(f"SocketIO async_mode: {socketio.async_mode}")

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=8000, allow_unsafe_werkzeug=True)

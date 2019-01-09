import os

from flask import Flask, render_template, send_from_directory
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

channel_list = []

class Channel:
    def __init__(self, name):
        self.name = name
        self.messages = []
        self.messageId = 0

    def chat(self, message):
        # Create id for message
        self.messageId += 1
        message['id'] = self.messageId
        
        # Check if current list has stored 100 messages
        if len(self.messages) == 100:
            self.messages.pop(0)

        # Add message 
        self.messages.append(message)
    
    def deleteMessage(self, id):
        for i in range(len(self.messages)):
            if self.messages[i]['id'] == int(id):
                self.messages.pop(i)
                break

# Function to get index of individual channel in channel list based on channel name
def get_channel_index(channel_name):
    for i in range(len(channel_list)):
        if channel_list[i].name == channel_name:
            return i
    else:
        return None

@app.route("/")
def index():
    return render_template('index.html', channel_list=channel_list)

@socketio.on('new channel')
def create_channel(data):
    # Check if channel name already exists
    if get_channel_index(data['new_channel']) is not None:
        emit('failure')
    else:
        # Create channel
        channel = Channel(name = data['new_channel'])

        # Update channel list
        channel_list.append(channel)

        # Broadcast 'add channel' event
        emit('add channel', data, broadcast=True)

@socketio.on('join channel')
def join_channel(data):
    # Get index of channel in channel list
    index = get_channel_index(data['channel_name'])

    if index is not None:
        # Get message list of channel
        messages = channel_list[index].messages
        
        # Emit show messages event
        emit('show messages', {'messages': messages})
    else:
        return "Channel not found."
    
@socketio.on('send message')
def chat(data):
    # Get message
    message = {'message': data['message'], 'username': data['username'], 'time': data['time']}

    # Update message to channel
    index = get_channel_index(data['channel'])
    channel_list[index].chat(message)
    data['id'] = channel_list[index].messageId

    # Broadcast chat event
    emit('chat', data, broadcast=True)

@socketio.on('delete message')
def delete(data):
    # Get channel index
    index = get_channel_index(data['channel'])

    # Delete message
    channel_list[index].deleteMessage(data['id'])

    # Broadcast message deleted event
    emit('message deleted', data, broadcast=True)
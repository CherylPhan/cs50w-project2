document.addEventListener('DOMContentLoaded', () => {

    // Month list variable
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Function to add username to elements
    function add_username() {
        document.querySelectorAll('.username').forEach(e => {
            e.innerHTML = username;
        });
    };

    // Function to show message
    function show_message(m) {
        // Create message view
        const message_view = document.createElement('div');
        message_view.id = m.id;
        message_view.classList.add('message', 'mb-3');

        // Create first line (username + time)
        const first_line = document.createElement('p');
        first_line.classList.add('mb-0');
        const name = document.createElement('span');
        name.classList.add('text-warning');
        name.innerHTML = m.username;
        const time = document.createElement('small');
        time.classList.add('text-muted');
        time.innerHTML = ' ' + m.time;
        first_line.append(name);
        first_line.append(time);
        message_view.append(first_line);

        // If message is from current user
        if (localStorage.getItem('username') == m.username) {
            // Right align
            message_view.style.textAlign = 'right';

            // Add delete button to second line
            const i = document.createElement('i');
            i.classList.add('fas', 'fa-times-circle', 'delete-button', 'mr-2', 'text-danger');
            message_view.append(i);

            // DELETE MESSAGE
            i.onclick = () => {
                const id = i.parentNode.id;
                // Emit 'delete message' to server
                socket.emit('delete message', {'id': id, 'channel': localStorage.getItem('channel')});
            };
        };

        // Add message text
        const text = document.createElement('span');
        text.innerHTML = m.message;
        message_view.append(text);

        // Add message view to chat screen
        document.querySelector('#chat-screen').append(message_view);
    };

    // Function to bound join channel event to channel links
    function set_link_channel(ch) {
        ch.onclick = () => {

            var channel_name = ch.innerHTML;

            // Clear current chat screen (of previous channel)
            var chat_screen = document.querySelector('#chat-screen');
            while (chat_screen.firstChild) {
                chat_screen.removeChild(chat_screen.firstChild);
            };

            // Store channel name in local storage
            localStorage.setItem('channel', channel_name);

            // Show channel heading
            document.querySelector('#channel-heading').innerHTML = channel_name;

            // Enable chat button
            document.querySelector('#chat-box button').disabled = false;

            // Emit join channel event to server
            socket.emit('join channel', {'channel_name': channel_name});

            return false;
        };
    };

    // Function to show notification when create channel
    function show_notif(message) {
        document.querySelector('#failure-notif').innerHTML = message;
    };

    // SIGN-IN
    var username = localStorage.getItem('username');
    if ((username === undefined) || (username == null) || (username == "undefined")) {

        const main = document.querySelector('#main-wrapper');
        const sign_in = document.querySelector('#sign-in-section');

        // Hide main content
        main.classList.remove('d-flex');
        main.classList.add('d-none');

        // Show sign-in section
        sign_in.classList.remove('d-none');

        // Sign user in
        document.querySelector('#sign-in').onsubmit = () => {

            // Get username
            username = document.querySelector('#new-username').value;

            // Store username in local storage
            localStorage.setItem('username', username);

            // Hide sign-in section
            sign_in.classList.add('d-none');

            // Add username to view
            add_username();

            // Show main content
            main.classList.add('d-flex');

            return false;
        };
    };

    // Add username to view
    add_username();

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Configuration when connect
    socket.on('connect', () => {

        // REMEMBER CHANNEL
        var channel = localStorage.getItem('channel');
        if ((channel === undefined) || (channel == null) || (channel == "undefined")) {

            // Disable chat button
            document.querySelector('#chat-box button').disabled = true;
        } else {
            // Show channel heading
            document.querySelector('#channel-heading').innerHTML = channel;

            // Emit 'join channel' event to server
            socket.emit('join channel', {'channel_name': channel});
        };

        // CREATE NEW CHANNEL
        document.querySelector('#create-channel').onsubmit = () => {

            // Get new channel name
            const new_channel = document.querySelector('#new-channel').value;

            // Clear input field
            document.querySelector('#new-channel').value = '';

            // Check if channel name only uses numbers and letters
            var re = /^[a-zA-Z0-9]{1,20}$/;
            if (!re.test(new_channel)) {
                // Show failure notification
                show_notif("Only numbers and letters are allowed");

                // Stop form from submitting
                return false;
            }

            // Emit channel name to server
            socket.emit('new channel', {'new_channel': new_channel});

            // Clear previous notification (if any)
            document.querySelector('#failure-notif').innerHTML = '';

            // Stop form from submitting
            return false;
        };

        // If receives 'failure' event from server
        socket.on('failure', () => {

            // Show failure notification
            show_notif('This channel already exists.');
        });

        // If receives 'add channel' event from server
        socket.on('add channel', data => {

            // Add to channel list view
            const a = document.createElement('a');
            a.classList.add('channel-link');
            a.href = "#";
            a.innerHTML = data['new_channel'];
            const li = document.createElement('li');
            li.append(a);
            document.querySelector('#channel-list').append(li);
            set_link_channel(a);
        });

        // JOIN CHANNEL
        document.querySelectorAll('.channel-link').forEach(ch => {
            set_link_channel(ch);
        });

        // If receive 'show messages' event from server
        socket.on('show messages', data => {
            
            // Show messages in chat screen
            data['messages'].forEach(m => {
                show_message(m);
            });

            // Auto scroll down
            const screen = document.querySelector('#chat-screen');
            screen.scrollTop = screen.scrollHeight - screen.clientHeight;
        });

        // CHAT
        document.querySelector('#chat-box').onsubmit = () => {

            // Get message
            const message = document.querySelector('#message').value;

            // Check if message is empty
            if (message.length == 0) {
                return false;
            }

            // Get channel name
            channel = localStorage.getItem('channel');

            // Check if user is in a channel
            if ((channel == undefined) || (channel == null)) {
                return false;
            };

            // Get timestamp
            const now = new Date();
            const date = months[now.getMonth() - 1] + ' ' + now.getDate();
            const time = now.getHours() + ':' + now.getMinutes();
            const timestamp = date + ' at ' + time;

            // Clear input field
            document.querySelector('#message').value = '';

            // Emit send message event to server
            socket.emit('send message', {'username': username, 'time': timestamp, 'message': message, 'channel': channel});

            // Stop form from submitting
            return false;
        };

        // If receives chat event from server
        socket.on('chat', data => {

            // Check if message is of current channel
            if (localStorage.getItem('channel') == data['channel']) {
                // Show message in chat screen
                show_message(data);

                const screen = document.querySelector('#chat-screen');

                // Auto scroll to bottom of message screen when new messages is added 
                const is_bottom = screen.scrollHeight - screen.clientHeight <= screen.scrollTop + 74;

                if (is_bottom) {
                    screen.scrollTop = screen.scrollHeight - screen.clientHeight;
                };
            };
        });

        // If receive 'message deleted' from server
        socket.on('message deleted', data => {

            // Check if message is from current channel
            if (localStorage.getItem('channel') == data['channel']) {
                document.getElementById(data['id']).style.display = 'none';
            };
        });
    });
});
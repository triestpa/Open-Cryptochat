# Build An End-To-End Encrypted Messenger With Javascript

Cryptography is an important topic right now.  It is widely known that government intelligence agencies actively intercept a wide net of online communications and other data.  These disclosures would have likely been jeopardized if not for the use of strong encryption in communications between journalists and whistleblowers.  Policies on encryption have been a growing issue in US politics, with some figures calling for increased regulations on the types of encryption used in consumer products.

An understanding of the techniques for implementing encryption is essential for modern software development.  We will not be covering the underlying math and theory of encryption in-depth in this tutorial; instead, the focus will be on how to harness these techniques for your own applications.  In this tutorial, we will walk through the basic concepts and implementation of an end-to-end 256-bit RSA encrypted messenger.  We'll be using Vue.js for coordinating the frontend functionality, along with a Node.js backend using Socket.io for sending messages between users.

A fully-functional preview of the final product is hosted here  - https://chat.patricktriest.com

> Disclaimer - This is meant to be a primer in end-to-end encryption implementation, not a definitive guide to building the Fort Knox of browser chat applications. I've done my best to convey the most accurate information possible on adding cryptography to your Javascript applications, but I cannot 100% guarantee the security of the resulting app - there's a lot that can go wrong at all stages of the process, especially at the stages not covered by this tutorial such as setting up web hosting and securing the server(s).  If you are a security expert, and you find vulnerabilities in the tutorial code, please feel free to reach out to me over email (patrick.triest@gmail.com) or in the comments section below.

#### A Note on Browser-Based Encryption

Client-side Javascript encryption is a controversial topic among security experts due to the vulnerabilities present in web application delivery versus pre-packaged software distributions that run outside the browser.  Many of these issues can be largely mitigated by using HTTPS to prevent man-in-the-middle resource injection attacks, and by avoiding persistent storage of unencrypted sensitive data within the browser.  It is undeniable, however, that running an application within the browser represents a comprise of control for convenience, and that browser-based applications are more vulnerable to security breaches than native desktop/mobile applications.

The concepts that we are covering in this tutorial are platform-agnostic.  We'll be demonstrating these concepts using a traditional browser-based web app, but you can just as easily adapt this code to work within a pre-built desktop (using Electron) or mobile (React Native, Ionic, or Cordova) application binary if you are concerned about browser-based application security.

## 1 - Project Setup

### 1.0 - Install Dependencies

You'll need to have Node.js (version 6 or higher) installed in order to run the backend for this app.

Create an empty directory for the project, and add a `package.json` file with the following contents.

```json
{
  "name": "encrypted-chat-tutorial",
  "version": "1.0.0",
  "node":"8.1.4",
  "license": "MIT",
  "author": "patrick.triest@gmail.com",
  "description": "End-to-end RSA-256 encrypted chat application.",
  "main": "app.js",
  "engines": {
    "node": ">=7.6"
  },
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "4.15.3",
    "socket.io": "2.0.3"
  }
}
```

Next, run `npm install` on the command line to install the server NPM dependencies.

### 1.1 - Create Node.js App

Create a file called `/app.js`, and add the following contents.

```javascript
const express = require('express')

// Setup Express server
const app = express()
const http = require('http').Server(app)

// Attach Socket.io to server
const io = require('socket.io')(http)

// Serve web app directory
app.use(express.static('public'))

// INSERT SOCKET.IO CODE HERE

// Start server
const port = process.env.PORT || 3000
http.listen(port, () => {
  console.log(`Chat server listening on port ${port}.`)
})
```

The is the core server logic.  Right now, all it will do is start a server, and make all of the files in the local `/public` directory accessible to web clients.

> In production, I would strongly recommend hosting your frontend code separately from the Node.js app, using battle-hardened server software such Apache and Nginx, or hosting the website on file storage service such as AWS S3.  For this tutorial, however, using the Express static file server is the simplest way to get the app running.

### 1.2 - Add Styling

Create a new directory called `public`.  This is where we'll put all of the front-end web app code.

> For the sake of simplicity, we won't worry about adding a build system to our frontend.  A build system is just not really necessary for an app this simple.  You are very welcome (and encouraged) to add a build system such as Webpack, Gulp, or Rollup to the application if you decide to fork this code into your own project.

We'll go ahead and add all of the project CSS right now.  Create a new file, `/public/styles.css` and paste in the following stylesheet.

<style>
.language-css {
height: 500px;
}
</style>
```css
/* Global */
body {
  background: #111111;
  color: #d6d6d6;
  font-family: 'Roboto Mono', monospace;
  height: 100vh;
  display: flex;
  padding: 0;
  margin: 0;
}

div { box-sizing: border-box; }
input, textarea, select { font-family: inherit; font-size: small; }
textarea:focus, input:focus { outline: none; }

.full-width { width: 100%; }
.green { color: green; }
.red { color: red; }
.yellow { color: yellow; }
.center-x { margin: 0 auto; }
.center-text { width: 100%; text-align: center; }

h1, h2, h3 { font-family: 'Montserrat', sans-serif; }
h1 { font-size: medium; }
h2 { font-size: small; font-weight: 300; }
h3 { font-size: x-small; font-weight: 300; }
p { font-size: x-small; }

.clearfix:after {
   visibility: hidden;
   display: block;
   height: 0;
   clear: both;
}

#vue-instance {
  display: flex;
  flex-direction: row;
  flex: 1 0 100%;
  overflow-x: hidden;
}

/** Chat Window **/
.chat-container {
  flex: 0 0 60%;
  word-wrap: break-word;
  overflow-x: hidden;
  overflow-y: scroll;
  padding: 6px;
  margin-bottom: 50px;
}

.message > p { font-size: small; }

/* Info Panel */
.info-container {
  flex: 0 0 40%;
  border-left: solid 1px #d6d6d6;
  padding: 12px;
  overflow-x: hidden;
  overflow-y: scroll;
  margin-bottom: 50px;
  position: relative;
  justify-content: space-around;
  display: flex;
  flex-direction: column;
}

.divider {
  padding-top: 1px;
  max-height: 0px;
  min-width: 200%;
  background: #d6d6d6;
  margin: 12px -12px;
  flex: 1 0;
}

.notification-list {
  display: flex;
  flex-direction: column;
  overflow: scroll;
  padding-bottom: 24px;
  flex: 1 0 40%;
}

.notification {
  font-family: 'Montserrat', sans-serif;
  font-weight: 300;
  font-size: small;
}

.keys {
  display: block;
  font-size: xx-small;
  overflow-x: hidden;
  overflow-y: scroll;
}

.keys > .divider {
  width: 75%;
  min-width: 0;
  margin: 16px auto;
}

.key { overflow: scroll; }

.room-select {
  display: flex;
  min-height: 24px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 300;
}

#room-input {
    flex: 0 0 60%;
    background: none;
    border: none;
    border-bottom: 1px solid #d6d6d6;
    border-top: 1px solid #d6d6d6;
    border-left: 1px solid #d6d6d6;
    color: #d6d6d6;
    padding: 4px;
}

.yellow-button {
  flex: 0 0 30%;
  background: none;
  border: 1px solid yellow;
  color: yellow;
  cursor: pointer;
}

.yellow-button:hover {
  background: yellow;
  color: #111111;
}

.yellow > a { color: yellow; }

.loader {
    border: 4px solid black;
    border-top: 4px solid yellow;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    animation: spin 2s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Message Input Bar */
.message-input {
  background: none;
  border: none;
  color: #d6d6d6;
  width: 90%;
}

.bottom-bar {
  border-top: solid 1px #d6d6d6;
  background: #111111;
  position: fixed;
  bottom: 0;
  left: 0;
  padding: 12px;
  height: 48px;
}

.message-list {
  margin-bottom: 40px;
}
```

We won't really be going into the CSS, but I can assure you that it's all fairly straight-forward.

### 1.3 - Add Base HTML Template
Next create a new file, `/public/index.html`, and add these contents.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Open Crypto Chat</title>
    <meta name="description" content="Vue.js - Intuitive, Fast and Composable MVVM for building interactive interfaces.">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <link href="https://fonts.googleapis.com/css?family=Roboto+Mono" rel="stylesheet">
    <link href="/styles.css" rel="stylesheet">
  </head>
  <body>
    <div id="vue-instance">
      <!-- Add Chat Container Here -->
      <div class="info-container full-width">
          <!-- Add Chat Room UI Here -->
          <div class="notification-list" ref="notificationContainer">
            <h1>NOTIFICATION LOG</h1>
            <div class="notification full-width" v-for="notification in notifications">
              {{ notification }}
            </div>
          </div>
          <div class="flex-fill"></div>
          <!-- Add Encryption Key UI Here -->
      </div>
      <!-- Add Bottom Bar Here -->
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/vue/2.4.1/vue.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.3/socket.io.slim.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/immutable/3.8.1/immutable.min.js"></script>
    <script src="/page.js"></script>
  </body>
</html>
```

This template lays out the baseline HTML structure and downloads the client-side JS dependencies.  It will also display a simple list of notifications once we add the client-side JS code.

### 1.4 - Create Vue.js App

Add the following contents to a new file, `/public/page.js`.

```javascript
/** The core Vue instance controlling the UI */
const vm = new Vue ({
  el: '#vue-instance',
  data () {
    return {
      cryptWorker: null,
      socket: null,
      originPublicKey: null,
      destinationPublicKey: null,
      messages: null,
      notifications: [],
      currentRoom: null,
      pendingRoom: Math.floor(Math.random() * 1000),
      draft: ''
    }
  },
  created () {
    this.addNotification('Hello World')
  },
  methods: {
    /** Append a notification message in the UI */
    addNotification (notification) {
      console.log(notification)
      this.notifications.push(notification)
    }
  }
})
```

This script will initialize the Vue.js application and will add a "Hello World" notification to the UI.

Try running `npm start` on the command-line.  You should see the command-line output `Chat server listening on port 3000.`.  Open `http://localhost:3000` in your browser, and you should see a very dark, empty web app displaying "Hello World" on the right side of the page.

ADD SCREENSHOT

## 2 - Basic Messaging
Now that all of the baseline code is in place, we'll start adding basic (unencrypted) real-time messaging.

### 2.0 - Setup Server-Side Socket Listeners
In `/app.js`, add the follow code directly below the `// INSERT SOCKET.IO CODE HERE` marker.

```javascript
/** Manage behavior of each client socket connection */
io.on('connection', (socket) => {
  // Store the room that the socket is connected to
  let currentRoom = 'default'

  /** Process a room join request. */
  socket.on('JOIN', (roomName) => {
    socket.join(currentRoom)

    // Notify user of room join success
    io.to(socket.id).emit('ROOM_JOINED', null)

    // Notify room that user has joined
    socket.broadcast.to(currentRoom).emit('NEW_CONNECTION', null)
  })

  /** Broadcast a received message to the room */
  socket.on('MESSAGE', (msg) => {
    this.addNotification(msg.text)
    socket.broadcast.to(currentRoom).emit('MESSAGE', msg)
  })
})
```

This code-block will create a connection listener that will manage any clients who connect to the server from the front-end application.  Currently, it just adds them to a "default" chat room, and retransmits any message that it receives to the rest of the users in the room.

### 2.1 - Setup Client-Side Socket Listeners

Within the frontend, we'll add some code to connect to the server.  Replace the `created` function in `/public/page.js` with the following.

```javascript
created () {
  // Initialize socket.io
  this.socket = io()
  this.setupSocketListeners()
},
```

Next, we'll need to add a few custom functions to manage the client-side socket connection and to send/receive messages.  Add the following to `/public/page.js` inside the `methods` block of the Vue app object.

```javascript
/** Setup Socket.io event listeners */
setupSocketListeners () {
  // Automatically join default room on connect
  this.socket.on('connect', () => {
    this.addNotification('Connected To Server.')
  })

  // Display message when recieved
  this.socket.on('MESSAGE', (message) => {
    this.addMessage(message)
  })

  // Notify user that they have lost the socket connection
  this.socket.on('disconnect', () => this.addNotification('Lost Connection'))
},

/** Send the current draft message */
sendMessage () {
  // Don't send message if there is nothing to send
  if (!this.draft || this.draft === '') { return }

  const message = this.draft

  // Reset the UI input draft text
  this.draft = ''

  // Instantly add message to local UI
  this.addMessage(message)

  // Emit the message
  this.socket.emit('MESSAGE', message)
},

/** Add message to UI */
addMessage (message) {
  this.messages.push(message)
},
```

### 2.2 - Display Messages in UI
Finally, we'll need to provide a UI to send and display messages.

In order to display all messages in the current chat, add the following to `/public/index.html` after the `<!-- Add Chat Container Here -->` comment.

```html
<div class="chat-container full-width">
  <div class="message-list">
    <div class="message full-width" v-for="message in messages">
      <p>
      > {{ message }}
      </p>
    </div>
  </div>
</div>
```

To add a text input bar for the user to write messages in, add the following to `/public/index.html`, after the `<!-- Add Bottom Bar Here -->` comment.

```html
<div class="bottom-bar">
  <div class="full-width">
    > <input class="message-input" type="text" placeholder="Message" v-model="draft" @keyup.enter="sendMessage()">
  </div>
</div>
```

Now, restart the server and open `http://localhost:3000` in two separate tabs/windows.  Try sending messages back and forth between the tabs.  In the command-line, you should be able to see a server log of messages being sent.

ADD SCREENSHOTS

## How Does Encryption Work?

Cool, now we have a real-time messaging application.  Before adding end-to-end encryption, it's important to have a basic understanding of how asymmetric encryption works.

#### Symetric Encryption & Trust

Symetric encryption = shared key, external trust

Let's say we're trading numbers.  We're trading the numbers through a third party, but we don't want the third party to know which number we are exchanging.

In order to accomplish this, we'll have to exchange a shared secret first - let's use "5".

We'll use the "modulo" operation in order to transform an input number into an output.  We can write this simple equation as `x modulo s = y`, where `x` is the exposed (encrypted) message, `s` is the shared secret key (5), and `y` is the unencrypted result.

Let's say we want to exchange the number 2.  We can send 12 as a message since `12 modulo 5 = 2` (5 goes into 12 twice, leaving 2 remaining).  Since we both share the secret key (5), we'll both know that 2 was the exchanged number.

The true exchanged number (2), is effectively hidden from anyone listening in the middle, since the only message passed between us was 12.  Even if someone is able to retrieve both the unencrypted source (12) and the encrypted value (2), they will still not know what the secret key is.  In this example, "12 modulo 10" is also equal to 2, so an interceptor could not know for certain whether the secret key is 5 or 10, and thus could not dependably decrypt future messages.

Modulo is considered a "one-way" function, since it cannot be trivially reversed.

Modern encryption algorithms are, to vastly simplify and generalize, very complex applications of this general principle.  Through the use of large prime numbers (prime factorization is computationally expensive), long private keys, and multiple rounds of cipher transformation, these algorithms will take a very inconvenient amount a time (often over 1 million years) to crack.

> Quantum computers could, theoretically, crack these ciphers more quickly.  You can read more about this [here](INSERT LINK).  This technology is still in its infancy, so we probably don't need to worry about encrypted data being compromised in this manner just yet.

The above example assumes that both parties were able to exchange a secret (in this case "5") ahead of time.  This is called *symmetric encryption*, since the same secret key is used for both encrypting and decrypting the message.  On the internet, however, this is often not a viable option - we need a way to send encrypted messages without requiring offline coordination to decide on a shared secret.  This is where asymmetric encryption comes into play.

#### Asymmetric Encryption & Public Key Cryptography

In contrast to symmetric encryption, asymmetric encryption uses pairs of keys (one public, one private) instead of a single shared secret - *public keys* are for encrypting data, and *private keys* are for decrypting data.

A *public key* is like an open box with an unbreakable lock.  If someone wants to send you a message, they can place that message in your public box, and close the lid to lock it.  The message can now be sent, to be delivered by an untrusted party without needing to worry about the message being read.  Once I receive the box, I'll unlock it with my *private key* - the only existing key which can unlock that box.

Exchanging *public keys* is like exchanging those boxes - since each private key is kept safe with the original owner, so there's no reason to worry about the contents of each box being observed in transit.

This is, of course, a massive simplification of how public key crytography works.  If you're curious to learn more I'd strongly recommend this video.

<iframe width="560" height="315" src="https://www.youtube.com/embed/wXB-V_Keiu8" frameborder="0" gesture="media" allow="encrypted-media" allowfullscreen></iframe>

In our app, the first step will be generating a public-private keypair for each user.  Then, once the users are in the same chat, we will exchange *public keys* so that each user can encrypt messages that only the other user can decrypt.  Hence, we will always encrypt messages using the recipient's *public key*, and we will always decrypt messages using the recipient's *private key*.

## 3 - Crypto WebWorker

Encryption operations tend to be computationally intensive processes.  Since Javascript is single-threaded, doing these operations directly within the front-end UI controller will cause the browser to freeze for a few seconds.  Wrapping the operations in a promise will not help, since promises are for managing asynchronous operations on a single-thread, and do not provide any performance benefit for computationally intensive tasks.

In order to keep the application performant, we will use a WebWorker to perform computationally intensive tasks on a separate browser thread.

In order to perform strong asymmetric RSA encryption within the browser, we'll be using the jsencrypt, a reputable Javascript RSA implementation based on research at Stanford.  Using jsencrypt, we'll create a few helper functions for keypair generation, encryption, and decryption.

### 3.0 - Create WebWorker To Wrap the JSencrypt Methods

Add a new file called `crypto-worker.js` in the `public` directory.  This file will store our WebWorker code in order to perform encryption operations on a separate browser thread.

```javascript
self.window = self // This is required for the jsencrypt library to work within the webworker

// Import the jsencrypt library
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/jsencrypt/2.3.1/jsencrypt.min.js');

let crypt = null
let privateKey = null

/** Webworker onmessage listener */
onmessage = function(e) {
  const [ message_type, message_id, text, key ] = e.data
  let result
  switch (message_type) {
    case 'generate-keys':
      result = generateKeypair()
      break
    case 'encrypt':
      result = encrypt(text, key)
      break
    case 'decrypt':
      result = decrypt(text)
      break
  }

  // Return result to the UI thread
  postMessage([ message_id, result ]);
}

/** Generate and store keypair */
function generateKeypair () {
  crypt = new JSEncrypt({default_key_size: 2056})
  privateKey = crypt.getPrivateKey()

  // Only return the public key, keep the private key hidden
  return crypt.getPublicKey()
}

/** Encrypt the provided string with the destination public key */
function encrypt (content, publicKey) {
  crypt.setKey(publicKey)
  return crypt.encrypt(content)
}

/** Decrypt the provided string with the local private key */
function decrypt (content) {
  crypt.setKey(privateKey)
  return crypt.decrypt(content)
}
```

This WebWorker will receive messages from the UI thread in the `onmessage` listener, perform the requested operation, and post the result back to the UI thread.  The private encryption key is never directly exposed to the UI thread, which helps to mitigate the potential for key theft from a cross-site scripting (XSS) attack.

### 3.1 - Configure Vue App To Communicate with WebWorker

Next, we'll configure the Vue component to communicate with the WebWorker.  Handling sequential call/response communications using event listeners can be a pain.  To simplify this, we'll create a utility function that wraps the entire communication lifecycle in a promise.  Add the following code to the `functions` block in `/public/page.js`.

```javascript
/** Post a message to the webworker, and return a promise that will resolve with the response.  */
getWebWorkerResponse(messageType, messagePayload) {
  return new Promise((resolve, reject) => {
    // Generate a random message id to identify the corresponding event callback
    const messageId = Math.floor(Math.random() * 100000)

    // Post the message to the webworker
    this.cryptWorker.postMessage([messageType, message_id].concat(messagePayload))

    // Create a handler for the webworker message event
    const handler = function (e) {
      // Only handle messages with the matching message id
      if (e.data[0] === messageId) {
        // Remove the event listener once the listener has been called.
        e.currentTarget.removeEventListener(e.type, handler)

        // Resolve the promise with the message payload.
        resolve(e.data[1])
      }
    }

    // Assign the handler to the webworker 'MESSAGE' event.
    this.cryptWorker.addEventListener('MESSAGE', handler)
  })
}
```

This code will allow us to perform an operation on the WebWorker thread and receive the result with a single line of code.  This can be a very useful helper function in any project that outsources processing to WebWorkers.

## 4 - Key Exchange

Now that our WebWorker is in place, we'll configure the app to generate and exchange keys.

### 4.0 - Add Server-Side Socket Listener To Transmit Public Keys

On the server-side, we'll need a new socket listener that will receive a public-key from a client and re-broadcast this key to the rest of the room.  We'll also add a listener to let clients know when someone has disconnected from the current room.

Add the following to `/app.js` within the `io.on('connection', (socket) => { ... }` block.

```javascript
/** Broadcast a new publickey to the room */
socket.on('PUBLIC_KEY', (key) => {
  socket.broadcast.to(currentRoom).emit('PUBLIC_KEY', key)
})

/** Broadcast a disconnection notification to the room */
socket.on('disconnect', () => {
  socket.broadcast.to(currentRoom).emit('USER_DISCONNECTED', null)
})
```

### 4.1 - Generate Keypair In Vue App

Next, we'll replace the `created` function in `/public/page.js` to initialize the WebWorker and generate a new keypair.

```javascript
async created () {
  this.addNotification('Welcome! Generating a new keypair now.')

  // Initialize crypto webworker thread
  this.cryptWorker = new Worker("crypto-worker.js")

  // Generate keypair and join default room
  this.originPublicKey = await this.getWebWorkerResponse('generate-keys')
  this.addNotification('Keypair Generated')

  // Initialize socketio
  this.socket = io()
  this.setupSocketListeners()
},
```

We are using the async/await syntax to receive the WebWorker promise result with a single line of code.  This is a great new feature in Javascript ES8 and is natively compatible with all current mainstream browsers(see my blog post(ADD LINK) for more info).

### 4.2 - Add Public Key Helper Functions

We'll also add a few new functions to `/public/page.js` for sending the public key, and to trim down the key to a human-readable identifier.

```javascript
/** Emit the public key to all users in the chatroom */
async sendPublicKey () {
  if (this.originPublicKey) {
    this.socket.emit('PUBLIC_KEY', this.originPublicKey)
  }
},

/** Get key snippet for display purposes */
getKeySnippet (key) {
  return key.slice(400, 416)
},
```

### 4.3 - Send and Receive Public Key

Next, we'll add some listeners to the client-side socket code, in order to send the local public key whenever a new user joins the room, and to save the public key sent by the other user.

Add the following to `/public/page.js` within the `setupSocketListeners` function.

```javascript
// When a user joins the current room, send them your public key
this.socket.on('NEW_CONNECTION', () => {
  this.addNotification('Another user joined the room.')
  this.sendPublicKey()
})

// Notify user that they've joined a new room
this.socket.on('ROOM_JOINED', () => {
  this.currentRoom = this.pendingRoom
  this.addNotification(`Joined Room - ${this.currentRoom}`)
  this.sendPublicKey()
})

// Save publickey when received
this.socket.on('PUBLIC_KEY', (key) => {
  this.addNotification(`Public Key Received - ${this.getKeySnippet(key)}`)
  this.destinationPublicKey = key
})

// Notify user that the other user has left the room
this.socket.on('USER_DISCONNECTED', () => {
  this.addNotification(`User Disconnected - ${ this.destinationKeyShort }`, )
  this.destinationPublicKey = null
})
```

### 4.4 - Show Public Keys In UI

Finally, we'll add some HTML to display the two public keys.

Add the following to `/public/index.html`, directly below `<!-- Add Encryption Key UI Here -->`

```html
<div class="divider"></div>
<div class="keys full-width">
  <h1>KEYS</h1>
  <h2>THEIR PUBLIC KEY</h2>
  <div class="key red" v-if="destinationPublicKey">
    <h3>TRUNCATED IDENTIFIER - {{ getKeySnippet(destinationPublicKey) }}</h3>
    <p>{{ destinationPublicKey }}</p>
  </div>
  <h2 v-else>Waiting for second user to join room...</h2>
  <div class="divider"></div>
  <h2>YOUR PUBLIC KEY</h2>
  <div class="key green" v-if="originPublicKey">
    <h3>TRUNCATED IDENTIFIER - {{ getKeySnippet(originPublicKey) }}</h3>
    <p>{{ originPublicKey }}</p>
  </div>
  <div class="keypair-loader full-width" v-else>
    <div class="center-x loader"></div>
    <h2 class="center-text">Generating Keypair...</h2>
  </div>
</div>
```

Try restarting the app and reloading `http://localhost:3000`.  You should be able to simulate a successful key exchange by opening two browser tabs.

> Having more than two pages with web app running will break the key-exchange.  We'll fix this further down.

## 5 - Message Encryption

Now that the key-exchange is setup, encrypting and decrypting messages within the web app is rather straight-forward.

### 5.0 - Encrypt Message Before Sending

Replace the `sendMessage` function in `/public/page.js` with the following.

```javascript
/** Encrypt and emit the current draft message */
async sendMessage () {
  // Don't send message if there is nothing to send
  if (!this.draft || this.draft === '') { return }

  // Use immutable.js to avoid unintended side-effects.
  let message = Immutable.Map({
    text: this.draft,
    recipient: this.destinationPublicKey,
    sender: this.originPublicKey
  })

  // Reset the UI input draft text
  this.draft = ''

  // Instantly add (unencrypted) message to local UI
  this.messages.push(message.toObject())

  if (this.destinationPublicKey) {
    // Encrypt message with the public key of the other user
    const encryptedText = await this.getWebWorkerResponse(
      'encrypt', [ message.get('text'), this.destinationPublicKey ])
    const encryptedMsg = message.set('text', encryptedText)

    // Emit the encrypted message
    this.socket.emit('MESSAGE', encryptedMsg.toObject())
  }
},
```

###### Digression - Immutable.js

Note that we're using Immutable.js to work with the message object.  This prevents unintended side-effects from changing object data and references. For instance, can you infer what would happen if we did this instead?

```javascript
let message = {
  text: this.draft,
  recipient: this.destinationPublicKey,
  sender: this.originPublicKey
}
this.messages.push(message)

...

message.text = encryptedText
this.socket.emit('MESSAGE', message)
```

In the above example, the encryption operation would assign the encrypted text directly to the `text` field of the message object by *reference*.  As a result, the message text in the UI would suddenly transform into the unreadable encrypted version, which is not what we want.

There are other workarounds that do not require libraries (such as serializing the object to a JSON string and then parsing it back as a new object), but Immutable.js can be a very useful tool for simplifying state management on larger projects.

### 5.1 - Receive and Decrypt Message

Modify the client-side `message` listener in `/public/page.js` to decrypt the message once it is received.

```javascript
// Decrypt and display message when received
this.socket.on('MESSAGE', async (message) => {
  // Only decrypt messages that were encrypted with the user's public key
  if (message.recipient === this.originPublicKey) {
    // Decrypt the message text in the webworker thread
    message.text = await this.getWebWorkerResponse('decrypt', message.text)
    this.messages.push(message)
  }
})
```

### 5.2 - Display Decrypted Message List

Modify the message list UI in `/public/index.html` to display the decrypted message and the abbreviated public key of the sender.

```html
<div class="message full-width" v-for="message in messages">
  <p>
    <span v-if="message.sender == originPublicKey" class="green">{{ getKeySnippet(message.sender) }}</span>
    <span v-else class="red">{{ getKeySnippet(message.sender) }}</span>
    > {{ message.text }}
  </p>
</div>
```

### 5.3 - Try It Out

Try restarting the server and reloading the page at `http://localhost:3000`.  The UI should look mostly unchanged from how it was before, besides displaying the public key snippet of whoever sent each message.  If you check the command-line output, however, you'll see that instead of being able to read the messages being sent between tabs, the only output is now the garbled encrypted text.

Congrats! You've now built a (mostly) functional end-to-end messaging app.

ADD SCREENSHOTS

## 6 - Chatrooms

You may have noticed a massive flaw in the current app - if we open a third tab running the web app then the encryption system breaks.  Asymmetric-encryption is designed to work in one-to-one scenarios; there's no way to encrypt the message *once* and have it be decryptable by *two* separate users.

This leaves us with two options -

1. Encrypt and send a separate copy of the message to each user.
1. Restrict each chat room to only allow two users at a time.

### 6.0 - Server-side Room Join Logic

Since this tutorial is already quite long, we'll be going with second, simpler option.  To make this work, we'll modify the server-side socket `JOIN` listener in `/app.js`, at the top of socket connection listener block.

```javascript
// Store the room that the socket is connected to
// If you need to scale the app horizontally, you'll need to store this variable in a persistent store such as Redis.
// For more info, see here: https://github.com/socketio/socket.io-redis
let currentRoom = null

/** Process a room join request. */
socket.on('JOIN', (roomName) => {
  // Get chatroom info
  let room = io.sockets.adapter.rooms[roomName]

  // Reject join request if room already has more than 1 connection
  if (room && room.length > 1) {
    // Notify user that their join request was rejected
    io.to(socket.id).emit('ROOM_FULL', null)

    // Notify room that someone tried to join
    socket.broadcast.to(roomName).emit('INTRUSION_ATTEMPT', null)
  } else {
    // Leave current room
    socket.leave(currentRoom)

    // Notify room that user has left
    socket.broadcast.to(currentRoom).emit('USER_DISCONNECTED', null)

    // Join new room
    currentRoom = roomName
    socket.join(currentRoom)

    // Notify user of room join success
    io.to(socket.id).emit('ROOM_JOINED', null)

    // Notify room that user has joined
    socket.broadcast.to(currentRoom).emit('NEW_CONNECTION', null)
  }
})
```

This new logic will prevent a user from joining any room that already has two users.

### 6.1 - Join room from the client side

Next, we'll add a client-side `joinRoom` function to join a specified room from the client-side.

Add the following method to `/public/page.js`

```javascript
/** Join the specified chatroom */
async joinRoom () {
  if (this.pendingRoom !== this.currentRoom && this.originPublicKey) {
    this.notify(`Connecting to Room - ${this.pendingRoom}`)

    // Reset room state variables
    this.messages = []
    this.destinationPublicKey = null

    // Emit room join request.
    this.socket.emit('JOIN', this.pendingRoom)
  }
},
```

We'll modify the client-side socket `connect` listener (in `/public/page.js`) to immediately call the `joinRoom` function.

```javascript
this.socket.on('connect', () => {
  this.addNotification('Connected To Server.')
  this.joinRoom()
})
```

### 6.2 - Add notifications

We'll create two more client-side socket listeners to send notifications when the join request is rejected.

```javascript
// Notify user that the room they are attempting to join is full
this.socket.on('ROOM_FULL', () => {
  this.addNotification(`Cannot join ${ this.pendingRoom }, room is full`)

  // Join a random room as a fallback
  this.pendingRoom = Math.floor(Math.random() * 1000)
  this.joinRoom()
})

// Notify room that someone attempted to join
this.socket.on('INTRUSION_ATTEMPT', () => {
  this.addNotification('A third user attempted to join the room.')
})
```

### 6.3 - Add room join UI

Finally, we'll add some HTML to provide an interface for the user to join a room of their choosing.

Add the following to `/public/index.html` below the `<!-- Add Chat Room UI Here -->` comment.

```html
<h1>CHATROOM</h1>
<div class="room-select">
  <input type="text" class="full-width" placeholder="Room Name" id="room-input" v-model="pendingRoom" @keyup.enter="joinRoom()">
  <input class="yellow-button full-width" type="submit" v-on:click="joinRoom()" value="JOIN">
</div>
<div class="divider"></div>
```

### 6.4 - Add Autoscroll

An annoying bug remaining in the app is that the notification and chat lists do not yet auto-scroll to display new messages.

In `/public/page.js`, add the following function to the `methods` block.

```javascript
/** Autoscoll DOM element to bottom */
autoscroll (element) {
  if (element) { element.scrollTop = element.scrollHeight }
},
```

To auto-scroll the notification and message lists, we'll call `autoscroll` at the end of their respective `add` methods.

```javascript
/** Add message to UI, and scroll the view to display the new message. */
addMessage (message) {
  this.messages.push(message)
  this.autoscroll(this.$refs.chatContainer)
},

/** Append a notification message in the UI */
addNotification (notification) {
  console.log(notification)
  this.notifications.push(notification)
  this.autoscroll(this.$refs.notificationContainer)
},
```

## 7 - What next?

Congrats! You have just built a completely functional end-to-end encrypted messaging app.

You can view the complete source code for the app here - (INSERT GH LINK)
A live preview of the app is running at https://chat.patricktriest.com

Using this baseline source code you could deploy a private messaging app on your own servers.  In order to coordinate which room to meet in, one slick option could be using a time-based pseudo-random number generator (such as Google Authenticator), with a shared seed between you and a second party (I've got a web-based TOTP generator tutorial in the works - stay tuned).

### Further Improvements

There are lots of ways to build up the app from here:

- Group chats, by storing multiple public keys, and encrypting the message for each user individually.
- Multimedia messages, by encrypting the byte-array containing the photo/video/audio file.
- Import and export key pairs as local files.
- Sign messages with the private key for sender identity verification.  Note that this is a trade-off because it increases the difficulty of fabricating messages, but also undermines the core anonymity outlined in the OTR messaging standard.
- Experiment with different encryption systems such as:
  - **AES** - Symmetric encryption, with a shared secret between the users.  This is the only publically available algorithm that is in use by the NSA and US Military.
  - **ElGamal** - Similar to RSA, but with smaller cyphertexts, faster decryption, and slower encryption.  This is the core algorithm that is used in PGP (a popular tool for email encryption).
  - Implement a **Diffie-Helman** key exchange.  This is a technique of using asymmetric encryption (such as ElGamal) to exchange a shared secret, such as a symmetric encryption key (for AES).  Building this on top of our existing project, and exchanging a new shared secret before each message, is a good way to improve the security of the app (see "Perfect Forward Security").
- Build an app for virtually any use-case where intermediate servers should never have unencrypted access to the transmitted data, such as password-managers and P2P (peer-to-peer) networks.
- Refactor the app for React Native, Ionic, Cordova, or Electron in order to provide a secure pre-built application bundle for mobile and/or desktop environments.

> Please remember to be careful.  The use of these protocols in a browser-based Javascript app is a great way to experiment and understand how they work in practice, but these techniques are **not suitable replacements** for established, peer-reviewed encryption protocol implementations such as OpenSSL (used for TLS/SSL in HTTPS) and GnuPG (for PGP).

Feel free to comment below with questions or feedback about the tutorial, and stay tuned for more full-stack Javascript tutorials in the coming weeks.

## Footnote - Isn't client-side encryption considered insecure?

Yes, client-side browser encryption is an inherently less-secure approach to key generation than using a tool (such as Open-SSL) installed directly on your machine.  Performing these operations within the browser opens a slew of new attack vectors for an untrusted party to gain access to your new encryption keys, and the Javascript RSA encryption implementation is less well-audited than equivalent libraries written in C.

Our approach here, however, somewhat mitigates these concerns through the use of ephemeral encryption keys.

Standard end-to-end encryption methods can vulnerable in the event of a security breach since if an attacker steals your persistent personal encryption private key, they can decrypt *all* of your messages.  The benefit of this traditional approach is that, as long as your private key is secure, it can be used to verify your identity online.  This is how HTTPS works to verify that the "amazon.com" in your web browser is actually being sent to you by a valid Amazon server and not by hackers spoofing the site in your local network.

> Also, while we're on the subject, please note that **end-to-end data encryption is not an alternative serving your site over HTTPS**.  Without HTTPS enabled, a hacker could send users a modified version of the frontend-code with compromised encryption and/or embedded spyware.

Our app differs from the traditional approach in that encryption keys are generated anew each time the site is opened.  With this approach, we lose the benefit of persistent identity verification in favor of completely ephemeral, anonymous communication.  This is a similar model to the Off-the-Record Messaging (OTR) protocol (https://en.wikipedia.org/wiki/Off-the-Record_Messaging), which uses symmetric AES encryption and a Diffie-Helman key exchange to achieve the same result.  In order to decrypt the messages, an attacker would need unrestricted access to your browser's memory heap *while* you are using the site. If this is the case, you're probably completely screwed, and the best course of action is to blow up your hard drive and cycle all of your passwords.

/** The core Vue instance controlling the UI */
const vm = new Vue ({
  el: '#vue-instance',
  data () {
    return {
      cryptWorker: null,
      socket: null,
      originPublicKey: null,
      destinationPublicKey: null,
      messages: [],
      notifications: [],
      currentRoom: null,
      pendingRoom: Math.floor(Math.random() * 1000),
      draft: ''
    }
  },
  async created () {
    this.addNotification('Welcome! Generating a new keypair now.')

    // Initialize crypto webworker thread
    this.cryptWorker = new Worker('crypto-worker.js')

    // Generate keypair and join default room
    this.originPublicKey = await this.getWebWorkerResponse('generate-keys')
    this.addNotification(`Keypair Generated - ${this.getKeySnippet(this.originPublicKey)}`)

    // Initialize socketio
    this.socket = io()
    this.setupSocketListeners()
  },
  methods: {
    /** Setup Socket.io event listeners */
    setupSocketListeners () {
      // Automatically join default room on connect
      this.socket.on('connect', () => {
        this.addNotification('Connected To Server.')
        this.joinRoom()
      })

      // Notify user that they have lost the socket connection
      this.socket.on('disconnect', () => this.addNotification('Lost Connection'))

      // Decrypt and display message when received
      this.socket.on('MESSAGE', async (message) => {
        // Only decrypt messages that were encrypted with the user's public key
        if (message.recipient === this.originPublicKey) {
          // Decrypt the message text in the webworker thread
          message.text = await this.getWebWorkerResponse('decrypt', message.text)
          this.messages.push(message)
        }
      })

      // When a user joins the current room, send them your public key
      this.socket.on('NEW_CONNECTION', () => {
        this.addNotification('Another user joined the room.')
        this.sendPublicKey()
      })

      // Notify user that they've joined a new room
      this.socket.on('ROOM_JOINED', (newRoom) => {
        this.currentRoom = newRoom
        this.addNotification(`Joined Room - ${this.currentRoom}`)
        this.sendPublicKey()
      })

      // Save publickey when received
      this.socket.on('PUBLIC_KEY', (key) => {
        this.addNotification(`Public Key Received - ${this.getKeySnippet(key)}`)
        this.destinationPublicKey = key
      })

      // Notify user that the other user has left the room
      this.socket.on('user disconnected', () => {
        this.notify(`User Disconnected - ${this.getKeySnippet(this.destinationKey)}`)
        this.destinationPublicKey = null
      })

      // Notify user that the room they are attempting to join is full
      this.socket.on('ROOM_FULL', () => {
        this.addNotification(`Cannot join ${this.pendingRoom}, room is full`)

        // Join a random room as a fallback
        this.pendingRoom = Math.floor(Math.random() * 1000)
        this.joinRoom()
      })

      // Notify room that someone attempted to join
      this.socket.on('INTRUSION_ATTEMPT', () => {
        this.addNotification('A third user attempted to join the room.')
      })
    },

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

    /** Join the specified chatroom */
    joinRoom () {
      if (this.pendingRoom !== this.currentRoom && this.originPublicKey) {
        this.addNotification(`Connecting to Room - ${this.pendingRoom}`)

        // Reset room state variables
        this.messages = []
        this.destinationPublicKey = null

        // Emit room join request.
        this.socket.emit('JOIN', this.pendingRoom)
      }
    },

    /** Add message to UI, and scroll the view to display the new message. */
    addMessage (message) {
      this.messages.push(message)
      this.autoscroll(this.$refs.chatContainer)
    },

    /** Append a notification message in the UI */
    addNotification (notification) {
      console.log(notification)
      notification = `${new Date().toLocaleTimeString()} - ${notification}`
      this.notifications.push(notification)
      this.autoscroll(this.$refs.notificationContainer)
    },

    /** Post a message to the webworker, and return a promise that will resolve with the response.  */
    getWebWorkerResponse (messageType, messagePayload) {
      return new Promise((resolve, reject) => {
        // Generate a random message id to identify the corresponding event callback
        const messageId = Math.floor(Math.random() * 100000)

        // Post the message to the webworker
        this.cryptWorker.postMessage([messageType, messageId].concat(messagePayload))

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

        // Assign the handler to the webworker 'message' event.
        this.cryptWorker.addEventListener('message', handler)
      })
    },

    /** Emit the public key to all users in the chatroom */
    sendPublicKey () {
      if (this.originPublicKey) {
        this.socket.emit('PUBLIC_KEY', this.originPublicKey)
      }
    },

    /** Get key snippet for display purposes */
    getKeySnippet (key) {
      return key.slice(400, 416)
    },

    /** Autoscoll DOM element to bottom */
    autoscroll (element) {
      if (element) { element.scrollTop = element.scrollHeight }
    }
  }
})

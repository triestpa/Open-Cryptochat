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
  async created () {
    this.notify('Welcome! Generating a new keypair now.')

    // Initialize crypto webworker thread
    this.cryptWorker = new Worker("rsa-crypto-worker.js")

    // Generate keypair and join default room
    this.originPublicKey = await this.getWebWorkerResponse('generate-keys')
    this.notify('Keypair Generated')

    // Initialize socketio
    this.socket = io()
    this.setupSocketListeners()
  },
  methods: {
    /** Setup Socket.io event listeners */
    setupSocketListeners () {
      // Automatically join default room on connect
      this.socket.on('connect', () => {
        this.notify('Connected To Server.')
        this.joinRoom()
      })

      // Decrypt and display message when recieved
      this.socket.on('message', async (message) => {
        // Only decrypt messages encrypted with the user's publickey
        if (message.recipient === this.originPublicKey) {
          // Decrypt the message text in the webworker thread
          message.text = await this.getWebWorkerResponse('decrypt', message.text)
          this.addMessage(message)
        }
      })

      // When a user joins the current room, send them your public key
      this.socket.on('new connection', () => {
        this.notify('Another user joined the room.')
        this.sendPublicKey()
      })

      // Save publickey when recieved
      this.socket.on('publickey', (key) => {
        this.notify(`Public Key Received - ${this.getKeySnippet(key)}`)
        this.destinationPublicKey = key
      })

      // Notify user that the room they are attempting to join is full
      this.socket.on('room is full', () => {
        this.notify(`Cannot join ${ this.pendingRoom }, room is full`)

        // Join a random room as a fallback
        this.pendingRoom = Math.floor(Math.random() * 1000)
        this.joinRoom()
      })

      // Notify user that someone attempted to join the room
      this.socket.on('intrusion attempt', () => {
        this.notify('A third user attempted to join the room.')
      })

      // Notify user that they've joined a new room
      this.socket.on('room joined', () => {
        this.notify('Room join successful.')
      })

      // Notify user that the other user has left the room
      this.socket.on('user disconnected', () => {
        this.notify(`User Disconnected - ${ this.getKeySnippet(this.destinationKey) }`, )
        this.destinationPublicKey = null
      })

      // Notify user that they have lost the socket connection
      this.socket.on('disconnect', () => this.notify('Lost Connection'))
    },

    /** Join the specified chatroom */
    async joinRoom () {
      if (this.pendingRoom !== this.currentRoom && this.originPublicKey) {
        this.notify(`Connecting to Room - ${this.pendingRoom}`)

        // Reset room state variables
        this.messages = []
        this.destinationPublicKey = null

        // Attempt to join room.
        // The 'room is full' socket event will be triggered if join is unsuccessful.
        this.socket.emit('join', this.pendingRoom)
        this.currentRoom = this.pendingRoom
        this.sendPublicKey()
      }
    },

     /** Emit the public key to all users in the chatroom */
    async sendPublicKey () {
      if (this.originPublicKey) {
        this.socket.emit('publickey', this.originPublicKey)
      }
    },

    /** Encrypt and emit the current draft message */
    async sendMessage () {
      // Don't send message if there is nothing to send
      if (!this.draft || this.draft === '') { return }

      // Use immutable.js to avoid unintended side-effects.
      // Admittedly, it's a bit silly for us to be including the entire library to only use it once,
      // But it's still a useful paradigm to be familiar with for larger projects.
      let message = Immutable.Map({
        text: this.draft,
        recipient: this.destinationPublicKey,
        sender: this.originPublicKey
      })

      // Reset the UI input draft text
      this.draft = ''

      // Instantly add message to local UI
      this.addMessage(message.toObject())

      if (this.destinationPublicKey) {
        // Encrypt message with the public key of the other user
        const encryptedText = await this.getWebWorkerResponse(
          'encrypt', [ message.get('text'), this.destinationPublicKey ])

        const encryptedMsg = message.set('text', encryptedText)

        // Emit the encrypted message
        this.socket.emit('message', encryptedMsg.toObject())
      }
    },

    /** Add message to UI, and scroll the view to display new message  */
    addMessage (message) {
      this.messages.push(message)
      this.autoscroll(this.$refs.chatContainer)
    },

    /** Get shortened key for display purposes  */
    getKeySnippet (key) {
      return key.slice(410, 416)
    },

    /** Append a notification message in the UI */
    notify (notification) {
      console.log(notification)
      this.notifications.push(notification)
      this.autoscroll(this.$refs.notificationContainer)
    },

    /** Autoscoll DOM element to bottom */
    autoscroll (element) {
      if (element) {
        element.scrollTop = element.scrollHeight
      }
    },

    /** Post a message to the webworker, and return a promise that will resolve with the response.  */
    getWebWorkerResponse(messageType, messagePayload) {
      return new Promise((resolve, reject) => {
        // Post the message to the webworker
        this.cryptWorker.postMessage([messageType].concat(messagePayload))

        // Create a handler for the webworker message event
        const handler = function (e) {
          // Only react to messages of the given message type
          if (e.data[0] === messageType) {
            // Remove the event listener once the listener has been called.
            e.currentTarget.removeEventListener(e.type, handler)

            // Resolve the promise with the message payload.
            resolve(e.data[1])
          }
        }

        // Assign the handler to the webworker 'message' event.
        this.cryptWorker.addEventListener('message', handler)
      })
    }
  }
})
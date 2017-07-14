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
      pendingRoom: null,
      currentRoom: null,
      draft: ''
    }
  },
  computed: {
    originKeyShort: function () {
      if (this.originPublicKey) {
        return this.originPublicKey.slice(400, 416)
      }
    },
    destinationKeyShort: function () {
      if (this.destinationPublicKey) {
        return this.destinationPublicKey.slice(400, 416)
      }
    }
  },
  async created () {
    // Generate a random default room number
    this.pendingRoom = Math.floor(Math.random() * 1000)

    // Initialize crypto webworker thread
    this.cryptWorker = new Worker("crypto-worker.js")

    this.addNotification('Welcome! Generating a new keypair now.')

    // Generate keypair and join default room
    this.originPublicKey = await this.generateKeypair()
    this.addNotification('Keypair Generated')

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

      // Decrypt and display message when recieved
      this.socket.on('message', this.recieveMessage)

      // When a user joins the current room, send them your public key
      this.socket.on('new connection', () => {
        this.addNotification('Another user joined the room.')
        this.sendPublicKey()
      })

      // Save publickey when recieved
      this.socket.on('publickey', this.recievePublicKey)

      // Notify user that the room they are attempting to join is full
      this.socket.on('room is full', () => {
        this.addNotification(`Cannot join ${ this.pendingRoom },room is full`)

        // Join a random room instead
        this.pendingRoom = Math.floor(Math.random() * 1000)
        this.joinRoom()
      })

      // Notify user that someone attempted to join the room
      this.socket.on('intrusion attempt', () => this.addNotification('A third user attempted to join the room.'))

      // Notify user that the other user has left the room
      this.socket.on('user disconnected', this.destinationUserDisconnected)

      // Notify user that they have lost the socket connection
      this.socket.on('disconnect', () => this.addNotification('Lost Connection'))
    },

    addNotification (notification) {
      this.notifications.push(notification)
    },

    /** Notify user that the other user has left the room  */
    destinationUserDisconnected () {
      this.addNotification(`User Disconnected - ${ this.destinationKeyShort }`, )
      this.destinationPublicKey = null
    },

    /** Join the specified chatroom */
    async joinRoom () {
      if (this.pendingRoom !== this.currentRoom) {
        this.addNotification(`Connecting to Room - ${this.pendingRoom}`)
        this.messages = []
        this.destinationPublicKey = null
        this.socket.emit('join', this.pendingRoom)
        this.currentRoom = this.pendingRoom
        this.sendPublicKey()
      }
    },

    /** Encrypt and emit the current draft message */
    async sendMessage () {
      // Don't send message if there is missing information
      if (!this.draft || this.draft === '') {
        return
      }

      // Use immutable.js to avoid unintended side-effects
      message = Immutable.Map({
        text: this.draft,
        recipient: this.destinationPublicKey,
        sender: this.originPublicKey
      })

      // Reset draft text
      this.draft = ''

      // Instantly add message to local UI
      this.messages.push(message.toObject())

      if (this.destinationPublicKey) {
        // Encrypt Message
        const encryptedText = await this.encrypt(message.get('text'))
        const encryptedMsg = message.set('text', encryptedText)

        // Emit the encrypted message
        this.socket.emit('message', encryptedMsg.toObject())
      }
    },

    /** Decrypt and display a new message */
    async recieveMessage (message) {
      // As a failsafe, only decrypt messages encrypted with the user's publickey
      if (message.recipient === this.originPublicKey) {
        message.text = await this.decrypt(message.text)
        this.messages.push(message)
      }
    },

    /** Emit the public key to all users in the chatroom */
    async sendPublicKey () {
      if (this.originPublicKey) {
        this.socket.emit('publickey', this.originPublicKey)
      }
    },

    /** Save/overwrite the recieved publickey */
    recievePublicKey (key) {
      this.currentRoom = this.pendingRoom
      this.destinationPublicKey = key
      this.addNotification(`Public Key Received - ${this.destinationKeyShort}`)
    },

    /** Get shortened key for display purposes  */
    getKeySnippet (key) {
      return key.slice(400, 416)
    },

    /** Generate a public/private keypair on the webworker thread  */
    generateKeypair () {
      return new Promise((resolve, reject) => {
        this.cryptWorker.postMessage(['generate-keys'])

        let handler = (e) => {
          if (e.data[0] === 'generate-keys') {
            e.currentTarget.removeEventListener(e.type, handler);
            resolve(e.data[1])
          }
        }

        this.cryptWorker.addEventListener('message', handler)
      })
    },

    /** Encrypt the provided string with the destination public key */
    encrypt (content) {
      return new Promise((resolve, reject) => {
        this.cryptWorker.postMessage(['encrypt', content, this.destinationPublicKey])

        let handler = (e) => {
          if (e.data[0] === 'encrypt') {
            e.currentTarget.removeEventListener(e.type, handler);
            resolve(e.data[1])
          }
        }

        this.cryptWorker.addEventListener('message', handler)
      })
    },

    /** Decrypt the provided string with the local private key */
    decrypt (content) {
      return new Promise((resolve, reject) => {
        this.cryptWorker.postMessage(['decrypt', content])

        let handler = (e) => {
          if (e.data[0] === 'decrypt') {
            e.currentTarget.removeEventListener(e.type, handler);
            resolve(e.data[1])
          }
        }

        this.cryptWorker.addEventListener('message', handler)
      })
    }
  }
})
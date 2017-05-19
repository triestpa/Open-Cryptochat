class Crypt {
  constructor () {
    this.crypt = new JSEncrypt({default_key_size: 1028})
    this.privateKey = this.crypt.getPrivateKey()
    this.originPublicKey = this.crypt.getPublicKey()
    this.destinationPublicKey = this.crypt.getPublicKey()
    console.log('keys', { privateKey: this.privateKey, publicKey: this.originPublicKey })
  }

  encrypt (content) {
    this.crypt.setKey(this.destinationPublicKey)
    return this.crypt.encrypt(content)
  }

  decrypt (content) {
    this.crypt.setKey(this.privateKey)
    return this.crypt.decrypt(content)
  }
}

const vm = new Vue({
  el: '#vue-instance',
  data () {
    return {
      draft: '',
      messages: [],
      userid: null,
      socket: null,
      crypt: null,
      room: 'Room 1'
    }
  },
  created () {
    this.userid = Math.floor(Math.random() * 1000)
    this.socket = io()
    this.crypt = new Crypt()

    this.socket.on('connect', (newSocket) => this.joinRoom())
    this.socket.on('new connection', () => this.sendPublicKey())
    this.socket.on('message', (msg) => this.recieveMessage(msg))
    this.socket.on('room is full', () => console.log('room is full'))
    this.socket.on('publickey', (key) => this.recievePublicKey(key))
    this.socket.on('disconnect', () => console.log('disconnected'))
  },
  methods: {
    joinRoom () {
      this.messages = []
      this.socket.emit('join', this.room)
      this.sendPublicKey()
    },
    sendPublicKey () {
      if (this.crypt.originPublicKey) {
        this.socket.emit('publickey', this.crypt.originPublicKey)
      }
    },
    recievePublicKey (key) {
      console.log('received key', key)
      this.crypt.destinationPublicKey = key
    },
    sendMessage () {
      this.messages.push(this.draft)
      const encryptedMsg = this.crypt.encrypt(this.draft)
      this.draft = ''
      this.socket.emit('message', encryptedMsg)
    },
    recieveMessage (msg) {
      const decryptedMsg = this.crypt.decrypt(msg)
      this.messages.push(decryptedMsg)
    }
  }
})

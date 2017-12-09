self.window = self // This is required for the sjcl library to work within the webworker

// Import the SJCL library
// Must use a version build with the ecc module enabled
self.importScripts('https://cdn.patricktriest.com/vendor/sjcl/sjcl.min.js');

let keypair = null

/** Webworker onmessage listener */
onmessage = function(e) {
  // Load the parameters
  const [ message_type, text, key ] = e.data
  let result

  // Call the requested function
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
  postMessage([ message_type, result ]);
}

/** Generate and store keypair */
function generateKeypair () {
  keypair = sjcl.ecc.elGamal.generateKeys(256)

  // Only return the public key, keep the private key hidden
  return serializePublicKey(keypair.pub.get())
}

/** Encrypt the provided string with the destination public key */
function encrypt (content, publicKey) {
  publicKey = unserializePublicKey(publicKey)
  return sjcl.encrypt(publicKey, content)
}

/** Decrypt the provided string with the local private key */
function decrypt (content) {
  return sjcl.decrypt(keypair.sec, content)
}

/** Convert the public key to a string */
function serializePublicKey (key) {
  return sjcl.codec.base64.fromBits(key.x.concat(key.y))
}

/** Convert a string to the public key */
function unserializePublicKey (key) {
  return new sjcl.ecc.elGamal.publicKey(
      sjcl.ecc.curves.c256,
      sjcl.codec.base64.toBits(key)
  )
}
self.window = self // This is required for the sjcl library to work within the webworker

// Import the SJCL library
self.importScripts('http://bitwiseshiftleft.github.io/sjcl/sjcl.js');

/** Webworker onmessage listener */
onmessage = function(e) {
  // Load the parameters
  const [ message_type, text, secret ] = e.data
  let result

  // Call the requested function
  switch (message_type) {
    case 'encrypt':
      result = encrypt(text, secret)
      break
    case 'decrypt':
      result = decrypt(text, secret)
      break
  }

  // Return result to the UI thread
  postMessage([ message_type, result ]);
}

/** Encrypt the provided string with the shared secret */
function encrypt (content, secret) {
  return sjcl.encrypt(secret, content, { ks: 256 })
}

/** Decrypt the provided string with the shared secret */
function decrypt (content, secret) {
  return sjcl.decrypt(secret, content, { ks: 256 })
}
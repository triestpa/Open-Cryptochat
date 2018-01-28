# An Introduction To Utilizing Public-Key Cryptography In Javascript

## Open Cryptochat - A Tutorial

Cryptography is important.  Without encryption, the internet as we know it would not be possible - data sent online would be as vulnerable to interception as a message shouted across a crowded room.  Cryptography is also a major topic in current events, increasingly playing a central role in [law enforcement investigations](https://en.wikipedia.org/wiki/FBI%E2%80%93Apple_encryption_dispute) and [government legislation](https://www.politico.com/tipsheets/morning-cybersecurity/2017/11/10/texas-shooting-could-revive-encryption-legislation-223290).

Encryption is an invaluable tool for journalists, activists, nation-states, businesses, and everyday people who need to protect their data from the ever-present threat of hackers, spies, and advertising agencies.

An understanding of how to utilize strong encryption is essential for modern software development.  We will not be delving much into the underlying math and theory of cryptography for this tutorial; instead, the focus will be on how to harness these techniques for your own applications.

![Screenshot 5](https://cdn.patricktriest.com/blog/images/posts/e2e-chat/screenshot_5.png)

In this tutorial, we will walk through the basic concepts and implementation of an end-to-end 2048-bit [RSA encrypted](https://en.wikipedia.org/wiki/RSA_(cryptosystem)) messenger. We'll be utilizing [Vue.js](https://vuejs.org/) for coordinating the frontend functionality along with a [Node.js](https://nodejs.org/en/) backend using [Socket.io](https://socket.io/) for sending messages between users.

- Live Preview - https://chat.patricktriest.com
- Github Repository - https://github.com/triestpa/Open-Cryptochat

The concepts that we are covering in this tutorial are implemented in Javascript and are mostly intended to be platform-agnostic.  We will be building a traditional browser-based web app, but you can adapt this code to work within a pre-built desktop (using [Electron](https://electronjs.org/)) or mobile ( [React Native](https://facebook.github.io/react-native/), [Ionic](https://ionicframework.com/), [Cordova](https://cordova.apache.org/)) application binary if you are concerned about browser-based application security.[^1]  Likewise, implementing similar functionality in another programming language should be relatively straightforward since most languages have reputable open-source encryption libraries available; the base syntax will change but the core concepts remain universal.

> Disclaimer - This is meant to be a primer in end-to-end encryption implementation, not a definitive guide to building the Fort Knox of browser chat applications. I've worked to provide useful information on adding cryptography to your Javascript applications, but I cannot 100% guarantee the security of the resulting app.  There's a lot that can go wrong at all stages of the process, especially at the stages not covered by this tutorial such as setting up web hosting and securing the server(s).  If you are a security expert, and you find vulnerabilities in the tutorial code, please feel free to reach out to me by email (patrick.triest@gmail.com) or in the comments section below.

To read more, visit - https://github.com/triestpa/Open-Cryptochat

___


This app is 100% open-source, feel free to utilize the code however you would like.

```
The MIT License (MIT)

Copyright (c) 2018 Patrick Triest

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')
const http = require('http')

// Keep Render happy with a dummy web server
http.createServer((req, res) => res.end('Bot running')).listen(3000)

let pairingRequested = false

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Chrome (Linux)', '', '']
    })

    if (!sock.authState.creds.registered && !pairingRequested) {
        pairingRequested = true
        await new Promise(r => setTimeout(r, 3000))
        const phoneNumber = '2348106712645'
        try {
            const code = await sock.requestPairingCode(phoneNumber)
            console.log(`============================`)
            console.log(`PAIRING CODE: ${code}`)
            console.log(`============================`)
        } catch (e) {
            console.log('Pairing code error:', e.message)
            pairingRequested = false
        }
    }

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            const shouldReconnect = code !== DisconnectReason.loggedOut
            console.log('Connection closed, reconnecting...')
            if (shouldReconnect) setTimeout(() => startBot(), 5000)
        }
        if (connection === 'open') {
            console.log('Bot connected!')
            pairingRequested = false
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return
        const from = msg.key.remoteJid
        const text = msg.message.conversation ||
                     msg.message.extendedTextMessage?.text || ''
        console.log(`Message: ${text}`)
        await sock.sendMessage(from, { text: 'Bot is working!' })
    })
}

startBot()

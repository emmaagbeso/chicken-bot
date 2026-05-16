const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    })

    // Use pairing code instead of QR
    if (!sock.authState.creds.registered) {
        const phoneNumber = '2348106712645' // e.g. 2348012345678 (with country code, no + or spaces)
        const code = await sock.requestPairingCode(phoneNumber)
        console.log(`Your pairing code: ${code}`)
    }

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        }
        if (connection === 'open') {
            console.log('✅ Bot connected!')
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
        await sock.sendMessage(from, { text: 'Bot is working! 🍗' })
    })
}

startBot()
import net from 'net';

const LIQ_TELNET_HOST = process.env.LIQ_TELNET_HOST || '127.0.0.1';
const LIQ_TELNET_PORT = parseInt(process.env.LIQ_TELNET_PORT || '1234', 10);
const LIQ_TELNET_PASSWORD = process.env.LIQ_TELNET_PASSWORD || '';

export const pushToLiquidsoap = filepath =>
    new Promise((resolve, reject) => {
        const client = new net.Socket();
        let buffer = '';

        const close = err => {
            try { client.destroy(); } catch {}
            err ? reject(err) : resolve();
        };

        client.setTimeout(5000);

        client.on('data', chunk => {
            buffer += chunk.toString();

            if (buffer.match(/(Welcome|> )/i)) {
                const cmds = [];
                if (LIQ_TELNET_PASSWORD) cmds.push(`authenticate ${LIQ_TELNET_PASSWORD}`);
                cmds.push(`request.push "${filepath.replace(/(["\\])/g, '\\$1')}"`, 'quit');
                client.write(cmds.join('\n') + '\n');
            }

            if (buffer.match(/(OK|Added|queued)/i)) close();
        });

        client.on('timeout', () => close(new Error('Liquidsoap telnet timeout')));
        client.on('error', close);
        client.on('close', close);
        client.connect(LIQ_TELNET_PORT, LIQ_TELNET_HOST);
    });
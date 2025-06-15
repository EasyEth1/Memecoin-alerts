console.log("Bot startet...");

require('dotenv').config(); // <-- Umgebungsvariablen laden

const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let alerts = {}; // Speichert Alerts als { tokenAddress: marketCapThreshold }

client.once('ready', () => {
  console.log(`[BOT] Eingeloggt als ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!alert')) return;

  const args = message.content.split(' ');
  if (args.length !== 3) {
    message.channel.send('Nutze: !alert <TokenAdresse> <MarketCap>');
    return;
  }

  const token = args[1].toLowerCase();
  const marketCapLimit = Number(args[2]);
  if (isNaN(marketCapLimit)) {
    message.channel.send('Bitte gib eine gültige Zahl für MarketCap an.');
    return;
  }

  alerts[token] = marketCapLimit;
  message.channel.send(`Alert gesetzt für Token ${token} bei MarketCap >= ${marketCapLimit}`);
});

setInterval(async () => {
  for (const token in alerts) {
    try {
      const res = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${token}`);
      const marketCap = res.data.pairs[0]?.liquidity?.usd || 0;

      if (marketCap >= alerts[token]) {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel) {
          channel.send(`⚠️ MarketCap Alert: Token ${token} hat die Grenze von ${alerts[token]} USD erreicht (aktuell: ${marketCap} USD)`);
          delete alerts[token];
        }
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Marketcap:', error.message);
    }
  }
}, 60000);

client.login(DISCORD_TOKEN).catch(err => {
  console.error('Fehler beim Login:', err);
});


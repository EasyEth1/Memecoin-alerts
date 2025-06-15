console.log("Bot started...");

require('dotenv').config(); // <-- Load environment variables

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

let alerts = {}; // Stores alerts as { tokenAddress: marketCapThreshold }

client.once('ready', () => {
  console.log(`[BOT] Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!alert')) return;

  const args = message.content.split(' ');
  if (args.length !== 3) {
    message.channel.send('Usage: !alert <TokenAddress> <MarketCap>');
    return;
  }

  const token = args[1].toLowerCase();
  const marketCapLimit = Number(args[2]);
  if (isNaN(marketCapLimit)) {
    message.channel.send('Please provide a valid number for MarketCap.');
    return;
  }

  alerts[token] = marketCapLimit;
  message.channel.send(`Alert set for ${token} when MarketCap >= ${marketCapLimit}`);
});

setInterval(async () => {
  for (const token in alerts) {
    try {
      const res = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${token}`);
      const marketCap = res.data.pairs[0]?.liquidity?.usd || 0;

      if (marketCap >= alerts[token]) {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel) {
          channel.send(`⚠️ MarketCap Alert: Token ${token} has reached the threshold of ${alerts[token]} USD (current: ${marketCap} USD)`);
          delete alerts[token];
        }
      }
    } catch (error) {
      console.error('Error fetching MarketCap:', error.message);
    }
  }
}, 60000);

client.login(DISCORD_TOKEN).catch(err => {
  console.error('Login error:', err);
});

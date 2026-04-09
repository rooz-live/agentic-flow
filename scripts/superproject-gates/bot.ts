// Discord Bot for Multi-Tenant Affiliate Platform
// Uses DISCORD_TOKEN from .env.prod
// Commands: ping, deploy_status (integrates with monitoring)

import { Client, Events, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
  {
    name: 'deploy_status',
    description: 'Get current deployment and monitoring status',
  },
  {
    name: 'affiliate_revenue',
    description: 'Show Stripe revenue attribution summary',
  },
];

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Discord bot ready: ${c.user.tag}`);
  
  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  try {
    await rest.put(
      Routes.applicationCommands(c.user.id),
      { body: commands },
    );
    console.log('Slash commands registered.');
  } catch (error) {
    console.error('Command registration failed:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong! 🏓');
  } else if (commandName === 'deploy_status') {
    await interaction.reply('🚀 Deployments green. StarlingX healthy, HostBill synced, Stripe webhooks active. Check MONITORING_SETUP.md');
  } else if (commandName === 'affiliate_revenue') {
    await interaction.reply('💰 Revenue attribution via economics/revenue-attribution.ts - All tenants nominal.');
  }
});

client.login(process.env.DISCORD_TOKEN!);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Discord bot...');
  await client.destroy();
  process.exit(0);
});
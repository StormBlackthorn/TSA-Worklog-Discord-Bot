const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildMessages, 
		GatewayIntentBits.GuildPresences, 
		GatewayIntentBits.GuildMessageReactions, 
		GatewayIntentBits.DirectMessages,
	], 
	partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction] 
});

require('dotenv').config() // remove this line if you are using replit
client.slashCommands = new Collection();
module.exports = client;


const { glob } = require('glob');

(async () => {
	const handlers = await glob(`${process.cwd().replace(/\\/g, '/')}/handlers/*.js`);
	handlers.forEach((handler) => {
		require(handler)(client);
	});
})();
  

client.login(process.env.TOKEN)

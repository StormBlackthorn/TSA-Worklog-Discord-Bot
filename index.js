const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildPresences, 
		GatewayIntentBits.DirectMessages,
	], 
	partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember] 
});
//TODO: figure out exactly which intents and partials are needed

require('dotenv').config() 
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

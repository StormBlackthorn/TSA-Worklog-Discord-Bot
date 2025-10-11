const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { glob } = require('glob');
const { google } = require('googleapis');
const readline = require("node:readline");

require('dotenv').config({debug: false});

const client = new Client({ //TODO: figure out exactly which intents and partials are needed
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildPresences, 
		
        GatewayIntentBits.DirectMessages,
    ], 
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember] 
});
client.slashCommands = new Collection();

const googleClient = {};

(async () => {
	const oAuth2Client = new google.auth.OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		"urn:ietf:wg:oauth:2.0:oob" // Add the redirect URI here
	);

	console.log('Authorize this app by visiting this url:', oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: [
			'https://www.googleapis.com/auth/drive.file',
			'https://www.googleapis.com/auth/documents',
		],
	}));

	// Prompt user to enter the code from Google
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.question('Enter the code from that page here: ', async (code) => {
		rl.close();

		oAuth2Client.setCredentials((await oAuth2Client.getToken(code)).tokens);		
		googleClient.drive = google.drive({ version: 'v3', auth: oAuth2Client });
		googleClient.docs = google.docs({ version: 'v1', auth: oAuth2Client });

		module.exports = { client, googleClient };


		const handlers = await glob(`${process.cwd().replace(/\\/g, '/')}/handlers/*.js`);
		handlers.forEach((handler) => {
			require(handler)(client);
		});

		client.login(process.env.TOKEN);

	});


})();


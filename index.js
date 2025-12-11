const { Client, GatewayIntentBits, Partials, Collection, WebhookClient, EmbedBuilder } = require('discord.js');
const { glob } = require('glob');
const { google } = require('googleapis');
const readline = require("node:readline");
const mongoose = require("mongoose");
const { Events, Errors } = require("./utils/utils.js")
require('dotenv').config({debug: false});

const client = new Client({ //TODO: figure out exactly which intents and partials are needed
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildPresences, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ], 
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember] 
});
client.slashCommands = new Collection();

const googleClient = {};

(async () => {

	//Database
	const database = mongoose.createConnection(process.env.MONGODB_URI);

	database.on("error", (error) => console.log(`MongoDB>$ Error: ${error}`));

	database.once("connecting", () => console.log(`MongoDB>$ connecting to ${database.name}...`));
	database.once("connected", () => console.log(`MongoDB>$ Successfully connected to ${database.name}`));

	database.on("disconnecting", () => console.log(`MongoDB>$ disconnecting from ${database.name}...`));
	database.on("close", () => console.log(`MongoDB>$ disconnected from ${database.name}`));

	database.on("reconnected", () => console.log(`MongoDB>$ reconnected to ${database.name}`));

	//Google OAuth2
	const oAuth2Client = new google.auth.OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		"urn:ietf:wg:oauth:2.0:oob" // Add the redirect URI here
	);

	let validToken = false;
	if(process.env.GOOGLE_AUTH_REFRESH_TOKEN) {
		oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_AUTH_REFRESH_TOKEN });
		try {
			await oAuth2Client.getAccessToken();
			validToken = true;
		} catch (e) {
			console.log("Invalid Refresh Token in .env, falling back to manual auth...");
		}
	}
	
	if(!validToken) {

		console.log('Authorize this app by visiting this url:', oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: [
				'https://www.googleapis.com/auth/drive.file',
				'https://www.googleapis.com/auth/documents',
			],
		}));

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const code = await new Promise(resolve => {
			rl.question('Enter the code from that page here: ', code => {
				rl.close();
				resolve(code);
			});
		});

		const { tokens } = await oAuth2Client.getToken(code);
		oAuth2Client.setCredentials(tokens);
		console.log("Refresh Token:", tokens.refresh_token);

	}

	googleClient.drive = google.drive({ version: 'v3', auth: oAuth2Client });
	googleClient.docs = google.docs({ version: 'v1', auth: oAuth2Client });

	module.exports = { client, googleClient, database };


	const handlers = await glob(`${process.cwd().replace(/\\/g, '/')}/handlers/*.js`);
	handlers.forEach((handler) => {
		require(handler)(client);
	});

	client.login(process.env.TOKEN);


})();

Events.fetchEventsData();


process.on('uncaughtException', (err, origin) => {
	Errors.errorMessage({
		stack: err.stack, 
		content: `${err} [ ${origin} ]`, 
		title: "UncaughtException Error"
	})		
});

process.on('unhandledRejection', (reason, promise) => {
	Errors.errorMessage({
		stack: reason.stack,
		content: reason,
		title: "UnhandledRejection Error"
	})
}); 

process.once("exit", code => console.log(`Process exited with code: ${code}`));

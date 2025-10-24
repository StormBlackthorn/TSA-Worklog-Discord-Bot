const { Client, GatewayIntentBits, Partials, Collection, WebhookClient, EmbedBuilder } = require('discord.js');
const { glob } = require('glob');
const { google } = require('googleapis');
const readline = require("node:readline");
const mongoose = require("mongoose");
const { fetchEventsData } = require("./utils/utils.js");

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

	if(process.env.GOOGLE_AUTH_REFRESH_TOKEN) 
		oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_AUTH_REFRESH_TOKEN });
	else {

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

		const token = await oAuth2Client.getToken(code).tokens;
		oAuth2Client.setCredentials(token);
		console.log(await oAuth2Client.getToken(code));

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

fetchEventsData();

const webHook = new WebhookClient({ url: process.env.WEBHOOK_URL });

process.on('uncaughtException', (err, origin) => {
			webHook.send({
			content: `<@1409557350729257090>`,
			embeds: [
				new EmbedBuilder()
					.setTitle('UncaughtException Error')
					.setColor('Red')
					.setDescription(`***${err} [ \`${origin}\` ]***\n\n\`\`\`sh\n${err.stack.length > 2000 ? err.stack.slice(0, 2000) + '\n... [TRUNCATED, LOGGED IN CONSOLE]' : err.stack}\`\`\` `)
					.setTimestamp()
			]
		})

		console.warn(`----------ERROR----------\n${err} [ ${origin} ]\n\n${err.stack}\n-------------------------`)
})

process.on('unhandledRejection', (reason, promise) => {
	webHook.send({
		content: `<@1409557350729257090>`,
		embeds: [
			new EmbedBuilder()
				.setTitle('UnhandledRejection Error')
				.setColor('Red')
				.setDescription(`***${reason}***\n\n\`\`\`sh\n${reason.stack.length > 2000 ? reason.stack.slice(0, 2000) + '\n... [TRUNCATED, LOGGED IN CONSOLE]' : reason.stack}\`\`\` `)
				.setTimestamp()
		]
	})

	console.warn(`----------ERROR----------\nUnhandledRejection: ${reason}\n\n${reason.stack}\n-------------------------`)
}); 

process.once("exit", code => console.log(`Process exited with code: ${code}`));

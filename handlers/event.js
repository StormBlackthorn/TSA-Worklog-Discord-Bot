const { Client } = require('discord.js');
const chalk = require('chalk');
const { glob } = require('glob');
const AsciiTable = require('ascii-table');

const table = new AsciiTable().setHeading('Events', 'Stats').setBorder('|', '=', "0", "0")

/**
 * @param {Client} client
 */
module.exports = async (client) => {
  const eventFiles = await glob(`${process.cwd().replace(/\\/g, '/')}/events/*.js`);
  console.log(process.cwd())
  eventFiles.forEach((ev) => {
    const event = require(ev);
    if (!event?.event || !event?.run) return table.addRow(event.event, 'ERROR')

    client.on(event.event, event.run);
    table.addRow(event.event, 'OK')
  })

  console.log(chalk.greenBright(table.toString()));
} 
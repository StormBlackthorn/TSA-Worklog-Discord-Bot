/**
 * Thank you claud for donating me this piece of software
 * Being a vibe coder feels good when you have the premium models because things actually (somewhat) works
 */
const { EmbedBuilder } = require("discord.js");
const { inspect } = require("util");

module.exports = {
    event: "messageCreate",
    run: async (message) => {
        //nuh uh only I can use this
        if (message.author.id !== "1409557350729257090") return;
        if (!message.content.startsWith(";eval")) return;

        let code = message.content.replace(";eval", "");

        // Remove code block syntax if present
        if (code.includes("```")) {
            code = code.replace(/```js|```/g, "");
        }

        try {
            const logs = [];
            const originalLog = console.log;
            console.log = (...args) => {
                logs.push(args.map(a => typeof a === 'string' ? a : inspect(a, { depth: 0 })).join(" "));
                originalLog(...args);
            };

            let evaled = await eval(code);

            console.log = originalLog;

            if (typeof evaled !== "string") {
                evaled = inspect(evaled, { depth: 0 });
            }

            const output = logs.length > 0 ? `**Logs:**\n\`\`\`js\n${logs.join("\n")}\n\`\`\`\n**Result:**\n\`\`\`js\n${evaled}\n\`\`\`` : `\`\`\`js\n${evaled}\n\`\`\``;

            const embed = new EmbedBuilder()
                .setTitle("Eval Output")
                .setDescription(output)
                .setColor("Green");

            await message.reply({ embeds: [embed] });
            console.log("===eval executed==");

        } catch (e) {
            const embed = new EmbedBuilder()
                .setTitle("Eval Error")
                .setDescription(`\`\`\`js\n${e}\n\`\`\``)
                .setColor("Red");

            await message.reply({ embeds: [embed] });
            console.log("===eval executed==");
        }
    }
};

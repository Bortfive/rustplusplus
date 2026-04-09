/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/

const Discord = require("discord.js");
const Path = require("path");

const BattlemetricsHandler = require("../handlers/battlemetricsHandler.js");
const Config = require("../../config");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    try {
      console.log("Ready event fired! User:", client.user.tag);
      console.log("Guilds cache size:", client.guilds.cache.size);
      for (const guild of client.guilds.cache) {
        require("../util/CreateInstanceFile")(client, guild[1]);
        require("../util/CreateCredentialsFile")(client, guild[1]);
        client.fcmListenersLite[guild[0]] = new Object();
      }

      client.loadGuildsIntl();
      console.log("About to log logged in message");
      client.log(
        client.intlGet(null, "infoCap"),
        client.intlGet(null, "loggedInAs", {
          name: client.user.tag,
        }),
      );
      console.log("Logged in message logged");
    } catch (error) {
      console.error("Error in ready event:", error);
    }

    console.log("Setting username");
    try {
      await client.user.setUsername(Config.discord.username);
    } catch (e) {
      client.log(
        client.intlGet(null, "warningCap"),
        client.intlGet(null, "ignoreSetUsername"),
      );
    }
    console.log("Username set");

    console.log("Setting avatar");
    try {
      await client.user.setAvatar(
        Path.join(__dirname, "..", "resources/images/rustplusplus_logo.png"),
      );
    } catch (e) {
      client.log(
        client.intlGet(null, "warningCap"),
        client.intlGet(null, "ignoreSetAvatar"),
      );
    }
    console.log("Avatar set");

    console.log("Setting presence");
    client.user.setPresence({
      activities: [{ name: "/help", type: Discord.ActivityType.Listening }],
      status: "online",
    });
    console.log("Presence set");

    client.uptimeBot = new Date();
    console.log("Uptime set");

    console.log("Starting guild setup loop");
    for (let guildArray of client.guilds.cache) {
      const guild = guildArray[1];

      try {
        await guild.members.me.setNickname(Config.discord.username);
      } catch (e) {
        client.log(
          client.intlGet(null, "warningCap"),
          client.intlGet(null, "ignoreSetNickname"),
        );
      }
      await client.syncCredentialsWithUsers(guild);
      await client.setupGuild(guild);
    }

    await client.updateBattlemetricsInstances();
    BattlemetricsHandler.handler(client, true);
    client.battlemetricsIntervalId = setInterval(
      BattlemetricsHandler.handler,
      60000,
      client,
      false,
    );

    client.createRustplusInstancesFromConfig();
  },
};

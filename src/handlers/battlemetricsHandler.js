const Constants = require("../util/constants.js");
const DiscordMessages = require("../discordTools/discordMessages.js");
const DiscordTools = require("../discordTools/discordTools.js");
const Scrape = require("../util/scrape.js");

/**
 * Builds standard Discord Embed Fields for chunked lists of players
 * to prevent the "interaction undefined" crashing bug in older code.
 */
function buildPlayerEmbedFields(client, guildId, playerIds, bmInstance) {
  let totalCharacters = 50;
  let fieldCharacters = 0;
  let fields = [""];
  let fieldIndex = 0;
  let isEmbedFull = false;
  let playerCounter = 0;

  for (const playerId of playerIds) {
    playerCounter += 1;
    const name = bmInstance.players[playerId]["name"]
      .replace("[", "(")
      .replace("]", ")");
    const playerStr = `[${name}](${Constants.BATTLEMETRICS_PROFILE_URL + `${playerId}`})\n`;

    if (
      totalCharacters + playerStr.length >=
      Constants.EMBED_MAX_TOTAL_CHARACTERS
    ) {
      isEmbedFull = true;
      break;
    }

    if (
      fieldCharacters + playerStr.length >=
      Constants.EMBED_MAX_FIELD_VALUE_CHARACTERS
    ) {
      fieldCharacters = 0;
      fieldIndex += 1;
      fields.push("");
    }

    fields[fieldIndex] += playerStr;
    totalCharacters += playerStr.length;
    fieldCharacters += playerStr.length;
  }

  let description = "";
  if (isEmbedFull) {
    description = client.intlGet(guildId, "andMorePlayers", {
      number: playerIds.length - playerCounter,
    });
  }

  const outputFields = fields.map((f) => ({
    name: "\u200B",
    value: f || "\u200B",
    inline: true,
  }));

  return { description, fields: outputFields };
}

async function processGlobalNameChanges(
  client,
  guildId,
  battlemetricsId,
  bmInstance,
) {
  const title = client.intlGet(guildId, "battlemetricsPlayersNameChanged");
  const oldNameFieldName = client.intlGet(guildId, "old");
  const playerIdFieldName = client.intlGet(guildId, "playerId");
  const newNameFieldName = client.intlGet(guildId, "new");

  let totalCharacters = 50;
  let oldName = [""],
    playerId = [""],
    newName = [""];
  let oldNameChars = 0,
    playerIdChars = 0,
    newNameChars = 0;
  let fieldIndex = 0;
  let isEmbedFull = false;
  let playerCounter = 0;

  for (const player of bmInstance.nameChangedPlayers) {
    playerCounter += 1;
    const fieldRowMaxLength = Constants.EMBED_FIELD_MAX_WIDTH_LENGTH_3;

    let oldN = `${player.from}`;
    oldN =
      oldN.length <= fieldRowMaxLength
        ? oldN
        : oldN.substring(0, fieldRowMaxLength - 2) + "..";
    oldN += "\n";

    const id = `[${player.id}](${Constants.BATTLEMETRICS_PROFILE_URL + `${player.id}`})\n`;

    let newN = `${player.to}`;
    newN =
      newN.length <= fieldRowMaxLength
        ? newN
        : newN.substring(0, fieldRowMaxLength - 2) + "..";
    newN += "\n";

    if (
      totalCharacters + (oldN.length + id.length + newN.length) >=
      Constants.EMBED_MAX_TOTAL_CHARACTERS
    ) {
      isEmbedFull = true;
      break;
    }

    if (
      oldNameChars + oldN.length > Constants.EMBED_MAX_FIELD_VALUE_CHARACTERS ||
      playerIdChars + id.length > Constants.EMBED_MAX_FIELD_VALUE_CHARACTERS ||
      newNameChars + newN.length > Constants.EMBED_MAX_FIELD_VALUE_CHARACTERS
    ) {
      fieldIndex += 1;
      oldName.push("");
      playerId.push("");
      newName.push("");
      oldNameChars = 0;
      playerIdChars = 0;
      newNameChars = 0;
    }

    oldNameChars += oldN.length;
    playerIdChars += id.length;
    newNameChars += newN.length;
    totalCharacters += oldN.length + id.length + newN.length;

    oldName[fieldIndex] += oldN;
    playerId[fieldIndex] += id;
    newName[fieldIndex] += newN;
  }

  let description = "";
  if (isEmbedFull) {
    description = client.intlGet(guildId, "andMorePlayers", {
      number: bmInstance.nameChangedPlayers.length - playerCounter,
    });
  }

  const fields = [];
  for (let i = 0; i <= fieldIndex; i++) {
    fields.push({
      name: i === 0 ? oldNameFieldName : "\u200B",
      value: oldName[i] || client.intlGet(guildId, "empty"),
      inline: true,
    });
    fields.push({
      name: i === 0 ? playerIdFieldName : "\u200B",
      value: playerId[i] || client.intlGet(guildId, "empty"),
      inline: true,
    });
    fields.push({
      name: i === 0 ? newNameFieldName : "\u200B",
      value: newName[i] || client.intlGet(guildId, "empty"),
      inline: true,
    });
  }

  await DiscordMessages.sendBattlemetricsEventMessage(
    guildId,
    battlemetricsId,
    title,
    description,
    fields,
  );
}

module.exports = {
  handler: async function (client, firstTime = false) {
    const searchSteamProfiles = client.battlemetricsIntervalCounter === 0;
    const calledSteamProfiles = {};

    if (!firstTime) await client.updateBattlemetricsInstances();

    for (const [guildId, instance] of client.guilds.cache) {
      if (!instance) continue;
      const cachedInstance = client.getInstance(guildId);
      const rustplus = client.rustplusInstances[guildId];

      if (!firstTime) {
        await module.exports.handleBattlemetricsChanges(client, guildId);
      }

      /* Update information channel battlemetrics players */
      const bmId =
        cachedInstance.activeServer !== null
          ? cachedInstance.serverList[cachedInstance.activeServer]
              ?.battlemetricsId
          : null;
      let condition =
        cachedInstance.generalSettings
          ?.displayInformationBattlemetricsAllOnlinePlayers &&
        cachedInstance.activeServer !== null &&
        bmId !== null &&
        client.battlemetricsInstances.hasOwnProperty(bmId) &&
        rustplus?.isOperational;

      if (condition) {
        await DiscordMessages.sendUpdateBattlemetricsOnlinePlayersInformationMessage(
          rustplus,
          bmId,
        );
      } else if (
        cachedInstance.informationMessageId?.battlemetricsPlayers !== null
      ) {
        await DiscordTools.deleteMessageById(
          guildId,
          cachedInstance.channelId.information,
          cachedInstance.informationMessageId.battlemetricsPlayers,
        );
        cachedInstance.informationMessageId.battlemetricsPlayers = null;
        client.setInstance(guildId, cachedInstance);
      }

      /* Update Trackers */
      if (!cachedInstance.trackers) continue;

      for (const [trackerId, content] of Object.entries(
        cachedInstance.trackers,
      )) {
        const battlemetricsId = content.battlemetricsId;
        const bmInstance = client.battlemetricsInstances[battlemetricsId];

        if (!bmInstance || !bmInstance.lastUpdateSuccessful) continue;

        if (firstTime || searchSteamProfiles) {
          for (const player of content.players) {
            if (!player.steamId) continue;

            let name = calledSteamProfiles[player.steamId];
            if (!name) {
              try {
                name = await Scrape.scrapeSteamProfileName(
                  client,
                  player.steamId,
                );
                calledSteamProfiles[player.steamId] = name;
              } catch (err) {
                client.log(
                  "Error",
                  `Failed to scrape steam profile: ${player.steamId}`,
                  "error",
                );
                continue;
              }
            }
            if (!name) continue;

            name = (content.clanTag ? `${content.clanTag} ` : "") + `${name}`;

            if (player.name !== name) {
              await module.exports.trackerNewNameDetected(
                client,
                guildId,
                trackerId,
                battlemetricsId,
                player.name,
                name,
              );
              const newPlayerId = Object.keys(bmInstance.players).find(
                (e) => bmInstance.players[e]?.name === name,
              );
              player.playerId = newPlayerId || player.playerId;
              player.name = name;
            }
          }

          client.setInstance(guildId, cachedInstance);
          if (firstTime) {
            await DiscordMessages.sendTrackerMessage(guildId, trackerId);
            continue;
          }
        }

        const trackerPlayerIds = content.players
          .map((e) => e.playerId)
          .filter((id) => id !== null);

        /* Process Name Changes */
        const changedPlayers = bmInstance.nameChangedPlayers.filter((e) =>
          trackerPlayerIds.includes(e.id),
        );
        for (const player of changedPlayers) {
          for (const playerT of content.players) {
            if (playerT.playerId !== player.id) continue;
            await module.exports.trackerNewNameDetected(
              client,
              guildId,
              trackerId,
              battlemetricsId,
              player.from,
              player.to,
            );
            playerT.name = player.to;
          }
        }

        /* Process Logins/Online */
        const joinedPlayers = trackerPlayerIds.filter(
          (e) =>
            bmInstance.newPlayers.includes(e) ||
            bmInstance.loginPlayers.includes(e),
        );
        for (const playerId of joinedPlayers) {
          for (const player of content.players) {
            if (player.playerId !== playerId) continue;
            const str = client.intlGet(guildId, "playerJustConnectedTracker", {
              name: player.name,
              tracker: content.name,
            });
            await DiscordMessages.sendActivityNotificationMessage(
              guildId,
              content.serverId,
              Constants.COLOR_ACTIVE,
              str,
              null,
              content.title,
              content.everyone,
            );
            if (rustplus?.serverId === content.serverId && content.inGame) {
              rustplus.sendInGameMessage(str);
            }
          }
        }

        /* Process Offline */
        const leftPlayers = trackerPlayerIds.filter((e) =>
          bmInstance.logoutPlayers.includes(e),
        );
        for (const playerId of leftPlayers) {
          for (const player of content.players) {
            if (player.playerId !== playerId) continue;
            const str = client.intlGet(
              guildId,
              "playerJustDisconnectedTracker",
              { name: player.name, tracker: content.name },
            );
            await DiscordMessages.sendActivityNotificationMessage(
              guildId,
              content.serverId,
              Constants.COLOR_INACTIVE,
              str,
              null,
              content.title,
              content.everyone,
            );
            if (rustplus?.serverId === content.serverId && content.inGame) {
              rustplus.sendInGameMessage(str);
            }
          }
        }

        client.setInstance(guildId, cachedInstance);
        await DiscordMessages.sendTrackerMessage(guildId, trackerId);
      }
    }

    client.battlemetricsIntervalCounter =
      client.battlemetricsIntervalCounter === 29
        ? 0
        : client.battlemetricsIntervalCounter + 1;
  },

  handleBattlemetricsChanges: async function (client, guildId) {
    const instance = client.getInstance(guildId);
    const settings = instance.generalSettings;
    const activeServer = instance.activeServer;
    const server = instance.serverList[activeServer];

    // De-duplicate BM IDs to process
    const battlemetricsIds = new Set();
    if (
      server?.battlemetricsId &&
      client.battlemetricsInstances[server.battlemetricsId]
        ?.lastUpdateSuccessful
    ) {
      battlemetricsIds.add(server.battlemetricsId);
    }
    for (const content of Object.values(instance.trackers || {})) {
      if (
        client.battlemetricsInstances[content.battlemetricsId]
          ?.lastUpdateSuccessful
      ) {
        battlemetricsIds.add(content.battlemetricsId);
      }
    }

    for (const battlemetricsId of battlemetricsIds) {
      const bmInstance = client.battlemetricsInstances[battlemetricsId];

      /* Server Name Changes */
      if (
        settings.battlemetricsServerNameChanges &&
        bmInstance.serverEvaluation.hasOwnProperty("server_name")
      ) {
        const oldName = bmInstance.serverEvaluation["server_name"].from;
        const newName = bmInstance.serverEvaluation["server_name"].to;
        const title = client.intlGet(guildId, "battlemetricsServerNameChanged");
        const description = `__**${client.intlGet(guildId, "old")}:**__ ${oldName}\n__**${client.intlGet(guildId, "new")}:**__ ${newName}`;
        await DiscordMessages.sendBattlemetricsEventMessage(
          guildId,
          battlemetricsId,
          title,
          description,
        );
      }

      /* Global Name Changes */
      if (
        settings.battlemetricsGlobalNameChanges &&
        bmInstance.nameChangedPlayers.length > 0
      ) {
        await processGlobalNameChanges(
          client,
          guildId,
          battlemetricsId,
          bmInstance,
        );
      }

      /* Global Logins */
      const loginIds = Array.from(
        new Set(bmInstance.loginPlayers.concat(bmInstance.newPlayers)),
      );
      if (settings.battlemetricsGlobalLogin && loginIds.length > 0) {
        const { description, fields } = buildPlayerEmbedFields(
          client,
          guildId,
          loginIds,
          bmInstance,
        );
        await DiscordMessages.sendBattlemetricsEventMessage(
          guildId,
          battlemetricsId,
          client.intlGet(guildId, "battlemetricsPlayersLogin"),
          description,
          fields,
        );
      }

      /* Global Logouts */
      if (
        settings.battlemetricsGlobalLogout &&
        bmInstance.logoutPlayers.length > 0
      ) {
        const { description, fields } = buildPlayerEmbedFields(
          client,
          guildId,
          bmInstance.logoutPlayers,
          bmInstance,
        );
        await DiscordMessages.sendBattlemetricsEventMessage(
          guildId,
          battlemetricsId,
          client.intlGet(guildId, "battlemetricsPlayersLogout"),
          description,
          fields,
        );
      }
    }
  },

  trackerNewNameDetected: async function (
    client,
    guildId,
    trackerId,
    battlemetricsId,
    oldName,
    newName,
  ) {
    const instance = client.getInstance(guildId);
    const trackerName = instance.trackers[trackerId].name;
    const title = client.intlGet(
      guildId,
      "battlemetricsTrackerPlayerNameChanged",
    );
    const description = `__**${client.intlGet(guildId, "tracker")}:**__ ${trackerName}\n\n__**${client.intlGet(guildId, "old")}:**__ ${oldName}\n__**${client.intlGet(guildId, "new")}:**__ ${newName}`;

    await DiscordMessages.sendBattlemetricsEventMessage(
      guildId,
      battlemetricsId,
      title,
      description,
      null,
      instance.trackers[trackerId].everyone,
    );
  },
};

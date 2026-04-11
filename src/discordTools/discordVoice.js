/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)
    Copyright (C) 2023 FaiThiX

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
const {
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");
const axios = require("axios");
const googleTTS = require("google-tts-api");
const fs = require("fs");
const path = require("path");
const getStaticFilesStorage = require("../util/getStaticFilesStorage");
const Client = require("../../index.ts");

const Actors = getStaticFilesStorage().getDatasetObject("actors");

const voiceLocks = new Map();
const alarmCooldowns = new Map();

const GUILD_ID = "927624007577141278";
const ALLOWED_CHANNEL_IDS = [
  "927624007577141283",
  "1404237888107053156",
  "927624007577141284",
  "1278075681988939887",
  "1278075754722103426",
  "1377671741454946324",
];

/**
 * Finds the most populated allowed voice channel.
 * Returns the channel object or null if no users are present.
 */
async function findBestChannel(guildId) {
  const guild = await Client.client.guilds.fetch(guildId);
  let bestChannel = null;
  let maxUsers = 0;

  for (const channelId of ALLOWED_CHANNEL_IDS) {
    const channel = guild.channels.cache.get(channelId);
    if (channel && channel.isVoiceBased() && channel.members.size > maxUsers) {
      bestChannel = channel;
      maxUsers = channel.members.size;
    }
  }

  return bestChannel;
}

module.exports = {
  sendDiscordVoiceMessage: async function (guildId, text, alarmName = null) {
    // Only execute for the specific guild
    if (guildId !== GUILD_ID) {
      return;
    }

    // Check if alarm voice is enabled in settings
    const instance = Client.client.getInstance(guildId);
    if (!instance || !instance.generalSettings.alarmVoiceEnabled) {
      return;
    }

    // Per-alarm cooldown: 1 minute
    if (alarmName) {
      const cooldownKey = `${guildId}-${alarmName}`;
      const lastPlayed = alarmCooldowns.get(cooldownKey);
      if (lastPlayed && Date.now() - lastPlayed < 60 * 1000) {
        Client.client.log("Debug", `Alarm "${alarmName}" is on cooldown, skipping`, "info");
        return;
      }
      alarmCooldowns.set(cooldownKey, Date.now());
    }

    // Concurrency lock: wait for any in-progress voice message to finish first
    if (voiceLocks.has(guildId)) {
      try {
        await voiceLocks.get(guildId);
      } catch { /* ignore previous lock errors */ }
    }

    const execute = async () => {
      // --- Step 1: Find the target channel ---
      let bestChannel;
      try {
        bestChannel = await findBestChannel(guildId);
      } catch (err) {
        Client.client.log("Error", `Failed to fetch guild channels: ${err}`, "error");
        return;
      }

      if (!bestChannel) {
        Client.client.log("Debug", `No users in any allowed voice channel, skipping`, "info");
        return;
      }

      // --- Step 2: Destroy any existing connection ---
      const existingConnection = getVoiceConnection(guildId);
      if (existingConnection) {
        try { existingConnection.destroy(); } catch { /* ignore */ }
      }

      // --- Step 3: Join the voice channel ---
      Client.client.log(
        "Debug",
        `Joining voice channel "${bestChannel.name}" (${bestChannel.members.size} users)`,
        "info",
      );

      const connection = joinVoiceChannel({
        channelId: bestChannel.id,
        guildId: guildId,
        adapterCreator: bestChannel.guild.voiceAdapterCreator,
      });

      connection.on("error", (error) => {
        Client.client.log("Error", `Voice connection error: ${error.message}`, "error");
      });

      // --- Step 4: Wait for Ready ---
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      } catch (err) {
        Client.client.log(
          "Error",
          `Voice connection did not reach Ready state (state: "${connection.state.status}"): ${err.message}`,
          "error",
        );
        try { connection.destroy(); } catch { /* ignore */ }
        return;
      }

      Client.client.log("Debug", `Voice connection is Ready`, "info");

      // --- Step 5: Build audio resource ---
      let resource;

      if (alarmName) {
        const lower = alarmName.toLowerCase();
        let fileName = null;
        if (lower.includes("launch")) fileName = "launch.mp3";
        else if (lower.includes("main")) fileName = "main.mp3";

        if (fileName) {
          const audioPath = path.join(__dirname, "..", "..", "audio", fileName);
          if (fs.existsSync(audioPath)) {
            try {
              Client.client.log("Debug", `Playing local file: ${fileName}`, "info");
              resource = createAudioResource(audioPath);
            } catch (e) {
              Client.client.log("Error", `Failed to create resource for ${fileName}: ${e}`, "error");
            }
          }
        }
      }

      if (!resource) {
        let url;
        try {
          url = googleTTS.getAudioUrl(text, {
            lang: "es",
            slow: false,
            host: "https://translate.google.com",
          });
        } catch (e) {
          Client.client.log("Error", `Google TTS URL generation failed: ${e}`, "error");
          try { connection.destroy(); } catch { /* ignore */ }
          return;
        }

        try {
          const response = await axios({
            method: "get",
            url: url,
            responseType: "stream",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            },
          });
          resource = createAudioResource(response.data);
        } catch (e) {
          Client.client.log("Error", `Failed to fetch TTS audio: ${e}`, "error");
          try { connection.destroy(); } catch { /* ignore */ }
          return;
        }
      }

      // --- Step 6: Play ---
      try {
        const player = createAudioPlayer();

        player.on("error", (error) => {
          Client.client.log("Error", `Audio player error: ${error.message}`, "error");
        });

        player.on("stateChange", (oldState, newState) => {
          Client.client.log("Debug", `Player: ${oldState.status} → ${newState.status}`, "info");
        });

        connection.subscribe(player);
        player.play(resource);
        Client.client.log("Debug", `Audio playback started`, "info");
      } catch (error) {
        Client.client.log("Error", `Failed to play audio: ${error}`, "error");
        try { connection.destroy(); } catch { /* ignore */ }
      }
    };

    const lockPromise = execute();
    voiceLocks.set(guildId, lockPromise);

    try {
      await lockPromise;
    } finally {
      if (voiceLocks.get(guildId) === lockPromise) {
        voiceLocks.delete(guildId);
      }
    }
  },

  getVoice: async function (guildId) {
    const instance = Client.client.getInstance(guildId);
    const gender = instance.generalSettings.voiceGender;
    const language = instance.generalSettings.language;

    if (Actors[language]?.[gender] == null) {
      return Actors[language]?.[gender === "male" ? "female" : "male"];
    }
    return Actors[language]?.[gender];
  },
};

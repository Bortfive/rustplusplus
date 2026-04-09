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

module.exports = {
  sendDiscordVoiceMessage: async function (guildId, text, alarmName = null) {
    // Check if alarm voice is enabled in settings
    const instance = Client.client.getInstance(guildId);
    if (!instance || !instance.generalSettings.alarmVoiceEnabled) {
      Client.client.log(
        "Debug",
        `Alarm voice disabled in settings for guild ${guildId}, skipping voice message`,
        "info",
      );
      return;
    }

    if (alarmName) {
      const cooldownKey = `${guildId}-${alarmName}`;
      const lastPlayed = alarmCooldowns.get(cooldownKey);
      if (lastPlayed && Date.now() - lastPlayed < 1 * 60 * 1000) {
        Client.client.log(
          "Debug",
          `Alarm ${alarmName} is on cooldown for guild ${guildId}, skipping voice message`,
          "info",
        );
        return;
      }
      alarmCooldowns.set(cooldownKey, Date.now());
    }

    // Basic concurrency lock per guild
    if (voiceLocks.has(guildId)) {
      Client.client.log(
        "Debug",
        `Voice message for guild ${guildId} is already in progress, waiting...`,
        "info",
      );
      try {
        await voiceLocks.get(guildId);
      } catch (e) {
        /* Ignore previous lock errors */
      }
    }

    const execute = async () => {
      let connection = getVoiceConnection(guildId);
      let targetChannelId = null;

      // If connection exists but is disconnected or destroyed, clean it up
      if (
        connection &&
        (connection.state.status === VoiceConnectionStatus.Disconnected ||
          connection.state.status === VoiceConnectionStatus.Destroyed)
      ) {
        Client.client.log(
          "Debug",
          `Cleaning up stale voice connection in state: ${connection.state.status}`,
          "info",
        );
        connection.destroy();
        connection = null;
      }

      // Custom logic for the specific guild
      if (!connection && guildId === "927624007577141278") {
        try {
          const guild = await Client.client.guilds.fetch(guildId);
          const allowedChannelIds = [
            "927624007577141283",
            "1404237888107053156",
            "927624007577141284",
            "1278075681988939887",
            "1278075754722103426",
            "1377671741454946324",
          ];
          let mostPopulatedChannel = null;
          let maxUsers = 0;

          for (const channelId of allowedChannelIds) {
            const channel = guild.channels.cache.get(channelId);
            if (
              channel &&
              channel.isVoiceBased() &&
              channel.members.size > maxUsers
            ) {
              mostPopulatedChannel = channel;
              maxUsers = channel.members.size;
            }
          }

          if (mostPopulatedChannel) {
            targetChannelId = mostPopulatedChannel.id;
            connection = joinVoiceChannel({
              channelId: targetChannelId,
              guildId: guildId,
              adapterCreator: guild.voiceAdapterCreator,
              selfDeaf: true,
              selfMute: false,
            });
          }
        } catch (error) {
          Client.client.log(
            "Error",
            `Failed to join channel for custom alarm: ${error}`,
            "error",
          );
        }
      }

      let resource;

      // Check if we should play a local file based on keywords in the alarm name
      if (alarmName) {
        const lowerName = alarmName.toLowerCase();
        let fileNameToPlay = null;

        if (lowerName.includes("launch")) {
          fileNameToPlay = "launch.mp3";
        } else if (lowerName.includes("main")) {
          fileNameToPlay = "main.mp3";
        }

        if (fileNameToPlay) {
          const audioPath = path.join(
            __dirname,
            "..",
            "..",
            "audio",
            fileNameToPlay,
          );

          if (fs.existsSync(audioPath)) {
            Client.client.log(
              "Debug",
              `Found local audio file for keyword in ${alarmName} at ${audioPath}`,
              "info",
            );
            resource = createAudioResource(audioPath);
          }
        }
      }

      if (!resource && alarmName) {
        const voice = await this.getVoice(guildId);

        // Map existing voices to languages for Google TTS (fallback to 'es' if male/female mapping is weird)
        let lang = "es";

        let url;
        try {
          url = googleTTS.getAudioUrl(text, {
            lang: lang,
            slow: false,
            host: "https://translate.google.com",
          });
        } catch (e) {
          Client.client.log(
            "Error",
            `Google TTS URL generation failed: ${e}`,
            "error",
          );
          return;
        }

        Client.client.log(
          "Debug",
          `Attempting to play audio from Google TTS API. URL: ${url}`,
          "info",
        );

        try {
          // Use axios to fetch the stream directly to ensure we don't get blocked by the API
          const response = await axios({
            method: "get",
            url: url,
            responseType: "stream",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            },
          });
          resource = createAudioResource(response.data);
        } catch (e) {
          Client.client.log(
            "Error",
            `Failed to fetch TTS audio stream: ${e}`,
            "error",
          );
          return;
        }
      }

      if (connection && resource) {
        try {
          // Add state change logging for the connection itself
          if (!connection.listenerCount("stateChange")) {
            connection.on("stateChange", (oldState, newState) => {
              Client.client.log(
                "Debug",
                `Voice connection transitioned from ${oldState.status} to ${newState.status}`,
                "info",
              );
            });
          }

          Client.client.log(
            "Debug",
            `Waiting for VoiceConnectionStatus.Ready...`,
            "info",
          );

          const player = createAudioPlayer();

          player.on("error", (error) => {
            Client.client.log(
              "Error",
              `Audio Player Error: ${error.message}`,
              "error",
            );
            console.error("Audio Player Error:", error);
          });

          player.on("stateChange", (oldState, newState) => {
            Client.client.log(
              "Debug",
              `Audio player transitioned from ${oldState.status} to ${newState.status}`,
              "info",
            );
          });

          let connectionReady = false;
          let retries = 0;
          const maxRetries = 2;

          while (!connectionReady && retries <= maxRetries) {
            try {
              // Increased timeout from 30s to 60s for Raspberry Pi compatibility
              await entersState(connection, VoiceConnectionStatus.Ready, 60000);
              Client.client.log("Debug", `Connection is ready!`, "info");
              connectionReady = true;
            } catch (error) {
              retries++;
              if (retries <= maxRetries) {
                Client.client.log(
                  "Debug",
                  `Voice connection attempt ${retries} failed, retrying... Error: ${error.message}`,
                  "info",
                );
                // Wait a bit before retrying
                await new Promise((resolve) => setTimeout(resolve, 2000));
                // Reconnect with saved channel ID
                try {
                  connection.destroy();
                  const guild = await Client.client.guilds.fetch(guildId);
                  const channelId =
                    targetChannelId || connection.joinConfig?.channelId;

                  if (!channelId) {
                    Client.client.log(
                      "Error",
                      `Cannot retry: no channel ID available for reconnection`,
                      "error",
                    );
                    break;
                  }

                  connection = joinVoiceChannel({
                    channelId: channelId,
                    guildId: guildId,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: false,
                  });
                } catch (e) {
                  Client.client.log(
                    "Error",
                    `Failed to reconnect voice channel: ${e.message}`,
                    "error",
                  );
                }
              } else {
                Client.client.log(
                  "Error",
                  `Voice connection failed to reach Ready state within 60 seconds after ${maxRetries} retries: ${error.message}`,
                  "error",
                );
                connection.destroy();
                return;
              }
            }
          }

          connection.subscribe(player);
          player.play(resource);
          Client.client.log("Debug", `Resource played!`, "info");
        } catch (error) {
          Client.client.log(
            "Error",
            `Unexpected error playing audio: ${error}`,
            "error",
          );
          if (connection) connection.destroy();
        }
      } else {
        Client.client.log(
          "Error",
          `Could not play audio because voice connection or resource is missing.`,
          "error",
        );
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

    if (
      Actors[language]?.[gender] === null ||
      Actors[language]?.[gender] === undefined
    ) {
      return Actors[language]?.[gender === "male" ? "female" : "male"];
    } else {
      return Actors[language]?.[gender];
    }
  },
};

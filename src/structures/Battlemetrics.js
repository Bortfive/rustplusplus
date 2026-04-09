/*
    Copyright (C) 2023 Alexander Emanuelsson (alexemanuelol)

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

const Axios = require("axios");
const getStaticFilesStorage = require("../util/getStaticFilesStorage");

const Client = require("../../index.ts");
const Utils = (require = require("../util/utils.js"));

const SERVER_LOG_SIZE = 1000;
const CONNECTION_LOG_SIZE = 1000;
const PLAYER_CONNECTION_LOG_SIZE = 100;
const NAME_CHANGE_LOG_SIZE = 100;

class Battlemetrics {
  /**
   *  Constructor for the Battlemetrics Class.
   *  @param {number|null} id The id of the server, default null.
   *  @param {string|null} name The name of the server, default null.
   */
  constructor(id = null, name = null) {
    this._id = id;
    this._name = name;

    this._data = null;

    this._ready = false;
    this._updatedAt = null;
    this._lastUpdateSuccessful = null;
    this._rustmapsAvailable = null;
    this._streamerMode = true; /* Until proven otherwise */
    this._serverLog = [];
    this._connectionLog = [];

    this._players = new Object();

    this._newPlayers =
      []; /* New players in the players variable, updates every evaluation call. (id) */
    this._loginPlayers =
      []; /* Players that just logged in, updates every evaluation call. (id) */
    this._logoutPlayers =
      []; /* Players that just logged out, updates every evaluation call. (id) */
    this._nameChangedPlayers =
      []; /* Players that changed name, updates every evaluation call({id, from, to}) */
    this._onlinePlayers =
      []; /* Players that are online, updates every evaluation call. (id) */
    this._offlinePlayers =
      []; /* Player that are offline, updates every evaluation call. (id) */

    this._serverEvaluation = new Object();

    /* Init API parameter variables */

    this.server_name = null;
    this.server_address = null;
    this.server_ip = null;
    this.server_port = null;
    this.server_players = null;
    this.server_maxPlayers = null;
    this.server_rank = null;
    this.server_location = null;
    this.server_status = null;
    this.server_private = null;
    this.server_createdAt = null;
    this.server_updatedAt = null;
    this.server_portQuery = null;
    this.server_country = null;
    this.server_queryStatus = null;
    this.server_official = null;
    this.server_rust_type = null;
    this.server_map = null;
    this.server_environment = null;
    this.server_rust_build = null;
    this.server_rust_ent_cnt_i = null;
    this.server_rust_fps = null;
    this.server_rust_fps_avg = null;
    this.server_rust_gc_cl = null;
    this.server_rust_gc_mb = null;
    this.server_rust_hash = null;
    this.server_rust_headerimage = null;
    this.server_rust_mem_pv = null;
    this.server_rust_mem_ws = null;
    this.server_pve = null;
    this.server_rust_uptime = null;
    this.server_rust_url = null;
    this.server_rust_world_seed = null;
    this.server_rust_world_size = null;
    this.server_rust_description = null;
    this.server_rust_modded = null;
    this.server_rust_queued_players = null;
    this.server_rust_gamemode = null;
    this.server_rust_born = null;
    this.server_rust_last_seed_change = null;
    this.server_rust_last_wipe = null;
    this.server_rust_last_wipe_ent = null;
    this.server_serverSteamId = null;
    this.map_url = null;
    this.map_thumbnailUrl = null;
    this.map_monuments = null;
    this.map_barren = null;
    this.map_updatedAt = null;
  }

  /***********************************************************************************
   *  Getters and Setters
   **********************************************************************************/

  get id() {
    return this._id;
  }
  set id(id) {
    this._id = id;
  }
  get name() {
    return this._name;
  }
  set name(name) {
    this._name = name;
  }
  get data() {
    return this._data;
  }
  set data(data) {
    this._data = data;
  }
  get ready() {
    return this._ready;
  }
  set ready(ready) {
    this._ready = ready;
  }
  get updatedAt() {
    return this._updatedAt;
  }
  set updatedAt(updatedAt) {
    this._updatedAt = updatedAt;
  }
  get lastUpdateSuccessful() {
    return this._lastUpdateSuccessful;
  }
  set lastUpdateSuccessful(lastUpdateSuccessful) {
    this._lastUpdateSuccessful = lastUpdateSuccessful;
  }
  get rustmapsAvailable() {
    return this._rustmapsAvailable;
  }
  set rustmapsAvailable(rustmapsAvailable) {
    this._rustmapsAvailable = rustmapsAvailable;
  }
  get streamerMode() {
    return this._streamerMode;
  }
  set streamerMode(streamerMode) {
    this._streamerMode = streamerMode;
  }
  get serverLog() {
    return this._serverLog;
  }
  set serverLog(serverLog) {
    this._serverLog = serverLog;
  }
  get connectionLog() {
    return this._connectionLog;
  }
  set connectionLog(connectionLog) {
    this._connectionLog = connectionLog;
  }
  get players() {
    return this._players;
  }
  set players(players) {
    this._players = players;
  }
  get newPlayers() {
    return this._newPlayers;
  }
  set newPlayers(newPlayers) {
    this._newPlayers = newPlayers;
  }
  get loginPlayers() {
    return this._loginPlayers;
  }
  set loginPlayers(loginPlayers) {
    this._loginPlayers = loginPlayers;
  }
  get logoutPlayers() {
    return this._logoutPlayers;
  }
  set logoutPlayers(logoutPlayers) {
    this._logoutPlayers = logoutPlayers;
  }
  get nameChangedPlayers() {
    return this._nameChangedPlayers;
  }
  set nameChangedPlayers(nameChangedPlayers) {
    this._nameChangedPlayers = nameChangedPlayers;
  }
  get onlinePlayers() {
    return this._onlinePlayers;
  }
  set onlinePlayers(onlinePlayers) {
    this._onlinePlayers = onlinePlayers;
  }
  get offlinePlayers() {
    return this._offlinePlayers;
  }
  set offlinePlayers(offlinePlayers) {
    this._offlinePlayers = offlinePlayers;
  }
  get serverEvaluation() {
    return this._serverEvaluation;
  }
  set serverEvaluation(serverEvaluation) {
    this._serverEvaluation = serverEvaluation;
  }

  /**
   *  Construct the Battlemetrics API call for searching servers by name.
   *  @param {string} name The name of the server.
   *  @return {string} The Battlemetrics API call string.
   */
  SEARCH_SERVER_NAME_API_CALL(name) {
    return `https://api.battlemetrics.com/servers?filter[search]=${name}&filter[game]=rust`;
  }

  /**
   *  Construct the Battlemetrics API call for getting server data.
   *  @param {number} id The id of the server.
   *  @return {string} The Battlemetrics API call string.
   */
  GET_SERVER_DATA_API_CALL(id) {
    return `https://api.battlemetrics.com/servers/${id}?include=player`;
  }

  /**
   *  Construct the Battlemetrics API call for getting profile data.
   *  @param {number} id The id of the player.
   *  @return {string} The Battlemetrics API call string.
   */
  GET_PROFILE_DATA_API_CALL(id) {
    return `https://api.battlemetrics.com/players/${id}?include=identifier`;
  }

  /**
   *  Construct the Battlemetrics API call for getting most time played data.
   *  @param {number} id The id of the server.
   *  @param {number} days The number of days before today to look.
   *  @return {string} The Battlemetrics API call string.
   */
  GET_SERVER_MOST_TIME_PLAYED_API_CALL(id, days = null) {
    let period = "AT"; /* All-time if days are not provided */
    if (days !== null) {
      const now = new Date().toISOString();
      const daysAgo = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();
      period = `${daysAgo}:${now}`;
    }

    return `https://api.battlemetrics.com/servers/${id}/relationships/leaderboards/time?filter[period]=${period}`;
  }

  /**
   *  Construct the Battlemetrics player profile URL.
   *  @param {number} id The id of the player.
   *  @return {string} The Battlemetrics player profile URL.
   */
  GET_BATTLEMETRICS_PLAYER_URL(id) {
    return `https://www.battlemetrics.com/players/${id}`;
  }

  /***********************************************************************************
   *  Private methods
   **********************************************************************************/

  /**
   *  Request a get call from the Axios library.
   *  @param {string} api_call The request api call string.
   *  @return {object} The response from Axios library.
   */
  async #request(api_call) {
    try {
      return await Axios.get(api_call);
    } catch (e) {
      return {};
    }
  }

  /**
   *  Parse the data from a most time played api call.
   *  @param {object} data The data to be parsed.
   *  @return {object} The parsed data object.
   */
  #parseMostTimePlayedApiResponse(data) {
    const parsed = new Object();
    parsed["players"] = [];

    for (const entity of data.data) {
      if (entity.type !== "leaderboardPlayer") continue;

      const player = new Object();
      player["id"] = entity.id;
      player["name"] = Utils.removeInvisibleCharacters(entity.attributes.name);
      player["time"] = entity.attributes.value;
      player["rank"] = entity.attributes.rank;
      player["url"] = this.GET_BATTLEMETRICS_PLAYER_URL(entity.id);

      parsed["players"].push(player);
    }

    if (data.hasOwnProperty("links") && data["links"].hasOwnProperty("next")) {
      parsed["next"] = data.links.next;
    }

    return parsed;
  }

  /**
   *  Parse the data from a profile data api call.
   *  @param {object} data The data to be parsed.
   *  @return {object} The parsed data object.
   */
  #parseProfileDataApiResponse(data) {
    const parsed = [];

    for (const name of data.included) {
      if (name.type !== "identifier") continue;
      if (!name.hasOwnProperty("attributes")) continue;
      if (!name["attributes"].hasOwnProperty("type")) continue;
      if (name["attributes"]["type"] !== "name") continue;
      if (!name["attributes"].hasOwnProperty("identifier")) continue;
      if (!name["attributes"].hasOwnProperty("lastSeen")) continue;

      parsed.push({
        name: name["attributes"]["identifier"],
        lastSeen: name["attributes"]["lastSeen"],
      });
    }

    return parsed;
  }

  /**
   *  Update the server log of the server.
   *  @param {object} data Types 0 = Online, 1 = Offline. And time in iso format.
   */
  #updateServerLog(data) {
    if (this.serverLog.length === SERVER_LOG_SIZE) {
      this.serverLog.pop();
    }
    this.serverLog.unshift(data);
  }

  /**
   *  Update the connection log of a player.
   *  @param {number} id The id of the player.
   *  @param {object} data Types 0 = Login, 1 = Logout. And time in iso format.
   */
  #updateConnectionLog(id, data) {
    if (!this.players.hasOwnProperty(id)) return;

    if (
      this.players[id]["connectionLog"].length === PLAYER_CONNECTION_LOG_SIZE
    ) {
      this.players[id]["connectionLog"].pop();
    }
    this.players[id]["connectionLog"].unshift(data);

    /* Add to server connection log of all players */
    if (this.connectionLog.length === CONNECTION_LOG_SIZE) {
      this.connectionLog.pop();
    }
    this.connectionLog.unshift({ id: id, data: data });
  }

  /**
   *  Update the name change history of a player.
   *  @param {number} id The id of the player.
   *  @param {object} data From and To names and time in iso format.
   */
  #updateNameChangeHistory(id, data) {
    if (!this.players.hasOwnProperty(id)) return;

    if (this.players[id]["nameChangeHistory"].length === NAME_CHANGE_LOG_SIZE) {
      this.players[id]["nameChangeHistory"].pop();
    }
    this.players[id]["nameChangeHistory"].unshift(data);
  }

  /**
   *  Evaluate if a server parameter have changed.
   *  @param {string} key The parameter key.
   *  @param {string} value1 The value of the current server setting.
   *  @param {string} value2 The value of the new server setting.
   */
  #evaluateServerParameter(key, value1, value2, firstTime) {
    if (firstTime) return;

    let isDifferent = false;
    if (Array.isArray(value1) || Array.isArray(value2)) {
      if (
        value1.length != value2.length ||
        !value1.every(function (u, i) {
          return u === value2[i];
        })
      ) {
        isDifferent = true;
      }
    } else {
      if (value1 !== value2) {
        isDifferent = true;
      }
    }

    if (isDifferent) {
      this.serverEvaluation[key] = { from: value1, to: value2 };

      const time = new Date().toISOString();
      this.#updateServerLog({ key: key, from: value1, to: value2, time: time });
    }
  }

  /**
   *  Format the time from timestamp to now [seconds,HH:MM].
   *  @param {string} timestamp The timestamp from before.
   *  @return {Array} index 0: seconds, index 1: The formatted time, null if invalid.
   */
  #formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const hoursStr = diffHours.toString().padStart(2, "0");
    const minutesStr = diffMinutes.toString().padStart(2, "0");
    return [parseInt(diffMs / 1000), `${hoursStr}:${minutesStr}`];
  }

  /***********************************************************************************
   *  Public methods
   **********************************************************************************/

  /**
   *  Request the data part of an API call.
   *  @param {string} api_call The request api call string.
   *  @return {(object|null)} The response data.
   */
  async request(api_call) {
    if (this.id === null) return null;

    const response = await this.#request(api_call);

    if (response.status !== 200) {
      Client.client.log(
        Client.client.intlGet(null, "errorCap"),
        Client.client.intlGet(null, "battlemetricsApiRequestFailed", {
          api_call: api_call,
        }),
        "error",
      );
      return null;
    }

    return response.data;
  }

  /**
   *  Setup the Battlemetrics instance based on the id or name of the server.
   *  This will update the instance for the first time with server data and
   *  decide if the server is streamer mode or not.
   */
  async setup() {
    if (this.id === null && this.name === null) {
      Client.client.log(
        Client.client.intlGet(null, "errorCap"),
        Client.client.intlGet(null, "battlemetricsIdAndNameMissing"),
        "error",
      );
      return;
    }

    if (this.id === null && this.name !== null) {
      this.id = await this.getServerIdFromName(this.name);
      if (!this.id) return;
    }

    this.updateStreamerMode();

    this.lastUpdateSuccessful = true;
    await this.evaluation(null, true);
  }

  /**
   *  Sends a request to get most time played data 30 days back and from that
   *  evaluate if the names are part of the "streamer mode names"-list or not.
   *  If any name can't be found in the "streamer mode names"-list, streamerMode
   *  flag will be set to false.
   */
  async updateStreamerMode() {
    const data = await this.request(
      this.GET_SERVER_MOST_TIME_PLAYED_API_CALL(this.id, 30),
    );
    if (!data) return;

    const parsed = this.#parseMostTimePlayedApiResponse(data);
    for (const player of parsed.players) {
      if (
        !getStaticFilesStorage()
          .getDatasetObject("RandomUsernames")
          .RandomUsernames.includes(player.name)
      )
        this.streamerMode = false;
    }
  }

  /**
   *  Get the id of a server based on the name of that server.
   *  @param {string} name The name of the server.
   *  @return {number|null} The id of the server.
   */
  async getServerIdFromName(name) {
    const originalName = name;
    name = encodeURI(name).replace("\#", "\*");
    const search = this.SEARCH_SERVER_NAME_API_CALL(name);
    const response = await this.#request(search);

    if (response.status !== 200) {
      Client.client.log(
        Client.client.intlGet(null, "errorCap"),
        Client.client.intlGet(null, "battlemetricsApiRequestFailed", {
          api_call: search,
        }),
        "error",
      );
      return null;
    }

    /* Find the correct server. */
    for (const server of response.data.data) {
      if (server.attributes.name === originalName) {
        return server.id;
      }
    }

    return null;
  }

  /**
   *  Get the profile data of a player.
   *  @param {id} id The id of the player.
   *  @return {object|null} The profile data object of the player.
   */
  async getProfileData(playerId) {
    const data = await this.request(this.GET_PROFILE_DATA_API_CALL(playerId));
    if (!data) return [];

    return this.#parseProfileDataApiResponse(data);
  }

  /**
   *  Evaluate the server data to check for changes.
   *  @param {bool} firstTime True if it is the first time evaluating, else false.
   *  @return {bool|null} null if id is not set, false if something went wrong, true if successful.
   */
  async evaluation(data = null, firstTime = false) {
    if (this.id === null) return null;

    if (data === null) {
      data = await this.request(this.GET_SERVER_DATA_API_CALL(this.id));
    }

    if (!data) {
      this.lastUpdateSuccessful = false;
      Client.client.log(
        Client.client.intlGet(null, "errorCap"),
        Client.client.intlGet(null, "battlemetricsFailedToUpdate", {
          server: this.id,
        }),
        "error",
      );
      return false;
    }

    this.lastUpdateSuccessful = true;
    this.data = data;

    const time = new Date().toISOString();
    this.updatedAt = time;

    /* Server parameter evaluation */

    const attributes = data.data.attributes;
    this.serverEvaluation = new Object();

    const attrMappings = [
      ["server_name", "name"],
      ["server_address", "address"],
      ["server_ip", "ip"],
      ["server_port", "port"],
      ["server_players", "players"],
      ["server_maxPlayers", "maxPlayers"],
      ["server_rank", "rank"],
      ["server_location", "location"],
      ["server_status", "status"],
      ["server_private", "private"],
      ["server_createdAt", "createdAt"],
      ["server_updatedAt", "updatedAt"],
      ["server_portQuery", "portQuery"],
      ["server_country", "country"],
      ["server_queryStatus", "queryStatus"],
    ];

    for (const [key, attr] of attrMappings) {
      this.#evaluateServerParameter(
        key,
        this[key],
        attributes[attr],
        firstTime,
      );
    }

    const details = attributes.details;
    if (details) {
      const detailMappings = [
        ["server_official", "official"],
        ["server_rust_type", "rust_type"],
        ["server_map", "map"],
        ["server_environment", "environment"],
        ["server_rust_build", "rust_build"],
        ["server_rust_ent_cnt_i", "rust_ent_cnt_i"],
        ["server_rust_fps", "rust_fps"],
        ["server_rust_fps_avg", "rust_fps_avg"],
        ["server_rust_gc_cl", "rust_gc_cl"],
        ["server_rust_gc_mb", "rust_gc_mb"],
        ["server_rust_hash", "rust_hash"],
        ["server_rust_headerimage", "rust_headerimage"],
        ["server_rust_mem_pv", "rust_mem_pv"],
        ["server_rust_mem_ws", "rust_mem_ws"],
        ["server_pve", "pve"],
        ["server_rust_uptime", "rust_uptime"],
        ["server_rust_url", "rust_url"],
        ["server_rust_world_seed", "rust_world_seed"],
        ["server_rust_world_size", "rust_world_size"],
        ["server_rust_description", "rust_description"],
        ["server_rust_modded", "rust_modded"],
        ["server_rust_queued_players", "rust_queued_players"],
        ["server_rust_gamemode", "rust_gamemode"],
        ["server_rust_born", "rust_born"],
        ["server_rust_last_seed_change", "rust_last_seed_change"],
        ["server_rust_last_wipe", "rust_last_wipe"],
        ["server_rust_last_wipe_ent", "rust_last_wipe_ent"],
        ["server_serverSteamId", "serverSteamId"],
      ];

      for (const [key, attr] of detailMappings) {
        this.#evaluateServerParameter(key, this[key], details[attr], firstTime);
      }
    }

    const rustMaps = details ? details.rust_maps : null;
    if (rustMaps) {
      const mapMappings = [
        ["map_url", "url"],
        ["map_thumbnailUrl", "thumbnailUrl"],
        ["map_monuments", "monuments"],
        ["map_barren", "barren"],
        ["map_updatedAt", "updatedAt"],
      ];
      for (const [key, attr] of mapMappings) {
        this.#evaluateServerParameter(
          key,
          this[key],
          rustMaps[attr],
          firstTime,
        );
      }
    }

    /* Players evaluation */

    if (data && data.included && Array.isArray(data.included)) {
      const included = data.included;

      this.newPlayers = [];
      this.loginPlayers = [];
      this.logoutPlayers = [];
      this.nameChangedPlayers = [];
      const prevOnlinePlayers = this.onlinePlayers;
      this.onlinePlayers = [];
      this.offlinePlayers = [];

      for (const entity of included) {
        if (entity.type !== "player") continue;

        const name = Utils.removeInvisibleCharacters(entity.attributes.name);

        if (
          !getStaticFilesStorage()
            .getDatasetObject("RandomUsernames")
            .RandomUsernames.includes(name)
        )
          this.streamerMode = false;

        if (!this.players.hasOwnProperty(entity.id)) {
          /* New Player */
          this.players[entity.id] = new Object();

          /* From Battlemetrics */
          this.players[entity.id]["id"] = entity.id;
          this.players[entity.id]["name"] = name;
          this.players[entity.id]["private"] = entity.attributes.private;
          this.players[entity.id]["positiveMatch"] =
            entity.attributes.positiveMatch;
          this.players[entity.id]["createdAt"] = entity.attributes.createdAt;
          this.players[entity.id]["updatedAt"] = entity.attributes.updatedAt;
          const firstTimeVar = entity.meta
            ? entity.meta.metadata.find((e) => e.key === "firstTime")
            : null;
          if (firstTimeVar)
            this.players[entity.id]["firstTime"] = firstTimeVar.value;

          /* Other */
          this.players[entity.id]["url"] = this.GET_BATTLEMETRICS_PLAYER_URL(
            entity.id,
          );
          this.players[entity.id]["status"] = true;
          this.players[entity.id]["nameChangeHistory"] = [];
          this.players[entity.id]["connectionLog"] = [];
          this.players[entity.id]["logoutDate"] = null;

          if (!firstTime)
            this.#updateConnectionLog(entity.id, {
              type: 0,
              time: time,
            }); /* 0 = Login event */

          this.newPlayers.push(entity.id);
        } else {
          /* Existing Player */
          /* From Battlemetrics */
          this.players[entity.id]["id"] = entity.id;
          if (this.players[entity.id]["name"] !== name) {
            this.nameChangedPlayers.push({
              id: entity.id,
              from: this.players[entity.id]["name"],
              to: name,
            });
            this.#updateNameChangeHistory(entity.id, {
              from: this.players[entity.id]["name"],
              to: name,
              time: time,
            });
            this.players[entity.id]["name"] = name;
          }
          this.players[entity.id]["private"] = entity.attributes.private;
          this.players[entity.id]["positiveMatch"] =
            entity.attributes.positiveMatch;
          this.players[entity.id]["createdAt"] = entity.attributes.createdAt;
          this.players[entity.id]["updatedAt"] = entity.attributes.updatedAt;
          const firstTimeVar = entity.meta
            ? entity.meta.metadata.find((e) => e.key === "firstTime")
            : null;
          if (firstTimeVar)
            this.players[entity.id]["firstTime"] = firstTimeVar.value;

          /* Other */
          this.players[entity.id]["url"] = this.GET_BATTLEMETRICS_PLAYER_URL(
            entity.id,
          );
          if (this.players[entity.id]["status"] === false) {
            this.players[entity.id]["status"] = true;
            this.#updateConnectionLog(entity.id, {
              type: 0,
              time: time,
            }); /* 0 = Login event */
            this.loginPlayers.push(entity.id);
          }
        }
        this.onlinePlayers.push(entity.id);
      }

      const offlinePlayers = prevOnlinePlayers.filter(
        (e) => !this.onlinePlayers.includes(e),
      );
      for (const id of offlinePlayers) {
        this.players[id]["status"] = false;
        this.players[id]["logoutDate"] = time;
        this.#updateConnectionLog(id, {
          type: 1,
          time: time,
        }); /* 1 = Logout event */
        this.logoutPlayers.push(id);
      }
    } else {
      // Keep existing state if included array is missing
      this.newPlayers = [];
      this.loginPlayers = [];
      this.logoutPlayers = [];
      this.nameChangedPlayers = [];
    }

    for (const [playerId, content] of Object.entries(this.players)) {
      if (content["status"] === false) this.offlinePlayers.push(playerId);
    }

    this.update(data);
    return true;
  }

  /**
   *  Update all parameters with fresh data.
   *  @param {object} data The data to update with.
   */
  update(data) {
    this.ready = true;
    this.id = data.data.id;

    const attributes = data.data.attributes;
    const attrMappings = [
      ["server_name", "name"],
      ["server_address", "address"],
      ["server_ip", "ip"],
      ["server_port", "port"],
      ["server_players", "players"],
      ["server_maxPlayers", "maxPlayers"],
      ["server_rank", "rank"],
      ["server_location", "location"],
      ["server_status", "status"],
      ["server_private", "private"],
      ["server_createdAt", "createdAt"],
      ["server_updatedAt", "updatedAt"],
      ["server_portQuery", "portQuery"],
      ["server_country", "country"],
      ["server_queryStatus", "queryStatus"],
    ];

    for (const [key, attr] of attrMappings) {
      this[key] = attributes[attr];
    }

    const details = attributes.details;
    if (details) {
      const detailMappings = [
        ["server_official", "official"],
        ["server_rust_type", "rust_type"],
        ["server_map", "map"],
        ["server_environment", "environment"],
        ["server_rust_build", "rust_build"],
        ["server_rust_ent_cnt_i", "rust_ent_cnt_i"],
        ["server_rust_fps", "rust_fps"],
        ["server_rust_fps_avg", "rust_fps_avg"],
        ["server_rust_gc_cl", "rust_gc_cl"],
        ["server_rust_gc_mb", "rust_gc_mb"],
        ["server_rust_hash", "rust_hash"],
        ["server_rust_headerimage", "rust_headerimage"],
        ["server_rust_mem_pv", "rust_mem_pv"],
        ["server_rust_mem_ws", "rust_mem_ws"],
        ["server_pve", "pve"],
        ["server_rust_uptime", "rust_uptime"],
        ["server_rust_url", "rust_url"],
        ["server_rust_world_seed", "rust_world_seed"],
        ["server_rust_world_size", "rust_world_size"],
        ["server_rust_description", "rust_description"],
        ["server_rust_modded", "rust_modded"],
        ["server_rust_queued_players", "rust_queued_players"],
        ["server_rust_gamemode", "rust_gamemode"],
        ["server_rust_born", "rust_born"],
        ["server_rust_last_seed_change", "rust_last_seed_change"],
        ["server_rust_last_wipe", "rust_last_wipe"],
        ["server_rust_last_wipe_ent", "rust_last_wipe_ent"],
        ["server_serverSteamId", "serverSteamId"],
      ];

      for (const [key, attr] of detailMappings) {
        this[key] = details[attr];
      }
    }

    const rustMaps = details ? details.rust_maps : null;
    if (rustMaps) {
      this.rustmapsAvailable = true;
      const mapMappings = [
        ["map_url", "url"],
        ["map_thumbnailUrl", "thumbnailUrl"],
        ["map_monuments", "monuments"],
        ["map_barren", "barren"],
        ["map_updatedAt", "updatedAt"],
      ];
      for (const [key, attr] of mapMappings) {
        this[key] = rustMaps[attr];
      }
    } else {
      this.rustmapsAvailable = false;
      this.map_url = null;
      this.map_thumbnailUrl = null;
      this.map_monuments = null;
      this.map_barren = null;
      this.map_updatedAt = null;
    }
  }

  /**
   *  Get the online time of a player.
   *  @param {string} playerId The id of the player to get online time from.
   *  @return {Array} index 0: seconds online, index 1: The formatted online time of a player.
   */
  getOnlineTime(playerId) {
    if (
      !this.lastUpdateSuccessful ||
      !this.players.hasOwnProperty(playerId) ||
      !this.players[playerId]["updatedAt"]
    ) {
      return null;
    }

    return this.#formatTime(this.players[playerId]["updatedAt"]);
  }

  /**
   *  Get the offline time of a player.
   *  @param {string} playerId The id of the player to get offline time from.
   *  @return {Array} index 0: seconds offline, index 1: The formatted offline time of a player.
   */
  getOfflineTime(playerId) {
    if (
      !this.lastUpdateSuccessful ||
      !this.players.hasOwnProperty(playerId) ||
      !this.players[playerId]["logoutDate"]
    ) {
      return null;
    }

    return this.#formatTime(this.players[playerId]["logoutDate"]);
  }

  /**
   *  Get an array of online players ordered by time played.
   *  @return {Array} An array of online players ordered by time played.
   */
  getOnlinePlayerIdsOrderedByTime() {
    const unordered = [];
    for (const playerId of this.onlinePlayers) {
      const seconds = this.#formatTime(this.players[playerId]["updatedAt"]);
      unordered.push([seconds !== null ? seconds[0] : 0, playerId]);
    }
    let ordered = unordered.sort(function (a, b) {
      return b[0] - a[0];
    });
    return ordered.map((e) => e[1]);
  }

  /**
   *  Get an array of offline players ordered by least time since online.
   *  @return {Array} An array of online players ordered by least time since online.
   */
  getOfflinePlayerIdsOrderedByLeastTimeSinceOnline() {
    const unordered = [];
    for (const playerId of this.offlinePlayers) {
      const seconds = this.#formatTime(this.players[playerId]["logoutDate"]);
      unordered.push([seconds !== null ? seconds[0] : 0, playerId]);
    }
    let ordered = unordered.sort(function (a, b) {
      return a[0] - b[0];
    });
    return ordered.map((e) => e[1]);
  }

  /**
   *  Get the offline time from a player.
   *  @param {string} playerId The id of the player to get offline time from.
   *  @return {Array} index 0: seconds offline, index 1: The formatted offline time of a player.
   */
  getOfflineTime(playerId) {
    if (
      !this.lastUpdateSuccessful ||
      !this.players.hasOwnProperty(playerId) ||
      !this.players[playerId]["logoutDate"]
    ) {
      return null;
    }

    return this.#formatTime(this.players[playerId]["logoutDate"]);
  }
}

module.exports = Battlemetrics;

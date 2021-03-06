import React, { useContext, useEffect } from "react";
import Player from "../player";

// contexts & actions
import { PlayerContext } from "../../contexts/playerContext";
import { playerUpdate, playerTrackUpdate } from "../../reducers/playerReducer";
import { UserContext } from "../../contexts/userContext";
import { setUserLogin, setUserLogout } from "../../reducers/userReducer";

const App = ({ history }) => {
  const { userState, userDispatch } = useContext(UserContext);
  const { playerDispatch } = useContext(PlayerContext);

  const { accessToken, deviceId } = userState;

  let playerCheckInterval = null;

  useEffect(() => {
    playerCheckInterval = setInterval(() => checkForPlayer(), 1000);
  }, []);

  const createEventHandlers = player => {
    player.addListener("initialization_error", ({ message }) => {
      console.error(`Init Error: ${message}`);
    });

    player.addListener("authentication_error", ({ message }) => {
      localStorage.removeItem("authToken");
      userDispatch(setUserLogout());
      history.push("/");
      console.error(`Auth Error: ${message}`);
    });

    player.addListener("account_error", ({ message }) => {
      console.error(`Aaccount error Error: ${message}`);
    });

    player.addListener("playback_error", ({ message }) => {
      console.error(`Playback Error: ${message}`);
    });

    player.addListener("player_state_changed", playerUpdatedState => {
      playerDispatch(playerUpdate(playerUpdatedState));
    });

    player.addListener("ready", ({ device_id }) => {
      userDispatch(setUserLogin({ deviceId: device_id }));
      transferPlaybackHere(device_id);
    });

    player.addListener("not_ready", ({ device_id }) => {
      console.log("Device ID has gone offline", device_id);
    });
  };

  const checkForPlayer = () => {
    if (window.Spotify !== null && userState.accessToken) {
      clearInterval(playerCheckInterval);
      const player = new window.Spotify.Player({
        name: "Spotify Web Player",
        getOAuthToken: cb => {
          cb(userState.accessToken);
        }
      });

      createEventHandlers(player);

      player.connect().then(success => {
        if (success) {
          console.log(
            "The Web Playback SDK successfully connected to Spotify!"
          );
        }
      });

      getUserDetails();
      setInterval(() => getPlaybackStatus(), 5000);
    }
  };

  const getUserDetails = async () => {
    const response = await fetch("https://api.spotify.com/v1/me/", {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    const { id, display_name } = await response.json();
    userDispatch(setUserLogin({ id: id, name: display_name }));
  };

  const getPlaybackStatus = async () => {
    const response = await fetch("https://api.spotify.com/v1/me/player", {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    const { progress_ms } = await response.json();
    playerDispatch(playerTrackUpdate({ position: progress_ms }));
  };

  const transferPlaybackHere = (localDeviceId = deviceId) => {
    fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        device_ids: [localDeviceId],
        play: true
      })
    });
  };

  return <Player />;
};

export default App;

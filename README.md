# jChat

**jChat** is an overlay that allows you to show your Twitch chat on screen with OBS, XSplit, and any other streaming software that supports browser sources.

It supports your [**BetterTTV**](https://betterttv.com/), [**FrankerFaceZ**](https://www.frankerfacez.com/) and [**7TV**](https://7tv.app/) emotes, always at the best available quality.

You have many options to customize your chat, like enabling a smooth animation for new messages, or fading old ones after some time.
If you have a chat full of !gamble addicts, you can choose to hide bots and commands messages.
It also comes with many fonts and styling options that can be combined as desired.

## Features

- 7TV, BTTV and FFZ emotes support
- Custom channel badges
- Lots of fonts and styling options
- Twitter emojis
- 7TV, BTTV, FFZ, FFZ:AP and Chatterino user badges (on/off)
- Smooth animation (on/off)
- Fade old messages (on/off)
- Hide bots messages (on/off)
- Hide commands messages (on/off)
- !refreshoverlay to make newly added emotes appear (mods only)

## Self Hosting / Local Files

1. Upload files
1. Generate a twitch auth token via <https://kcode.de/projects/jchat/host/> (source `host/index.html`, uses [implicit grant flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth#implicit-grant-flow))
1. In `v2` folder create `credentials.js` file with content  
   `const client_id = '--twitch-auth-token-----------';`

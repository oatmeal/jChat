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

## Using Local Files / Self Hosting

See `v2/credentials.js`

1. Generate a twitch auth token on <https://kcode.de/projects/jchat/host/>
1. Set the valid token value in the `v2/credentials.js` file.

The auth token page will also tell you for how long it is still valid. Once it expires you can generate and set a new one.

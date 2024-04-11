(function($) { // Thanks to BrunoLM (https://stackoverflow.com/a/3855394)
    $.QueryString = (function(paramsArray) {
        let params = {};

        for (let i = 0; i < paramsArray.length; ++i) {
            let param = paramsArray[i]
                .split('=', 2);

            if (param.length !== 2)
                continue;

            params[param[0]] = decodeURIComponent(param[1].replace(/\+/g, " "));
        }

        return params;
    })(window.location.search.substr(1).split('&'))
})(jQuery);

function escapeRegExp(string) { // Thanks to coolaj86 and Darren Cook (https://stackoverflow.com/a/6969486)
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(message) {
    return message
        .replace(/&/g, "&amp;")
        .replace(/(<)(?!3)/g, "&lt;")
        .replace(/(>)(?!\()/g, "&gt;");
}

function myAPI(url) {
    return $.ajax({
        // beforeSend: function(request) {
        //     request.setRequestHeader("Client-Id", clientid);
        //     request.setRequestHeader("Authorization", "Bearer " + token);
        // },
        dataType: "json",
        url: "https://twitch-api-proxy.5.workers.dev/" + url
    });
}

// helper function by Lazy_Luc
// cf. https://discuss.dev.twitch.tv/t/cant-calculate-offset-from-the-emotes-tag-if-the-message-contains-emojis/28414/2
function getCodepointToCodeunitMap(string) {
    let array = [];
    let count = 0;

    for (let char of string) {
        array.push(count);
        count += char.length;
    }

    return array;
};

Chat = {
    info: {
        channel: null,
        msgDelayMs: ('msgdelayms' in $.QueryString ? parseInt($.QueryString.msgdelayms) : null),
        animate: ('animate' in $.QueryString ? ($.QueryString.animate.toLowerCase() === 'true') : false),
        showBots: ('bots' in $.QueryString ? ($.QueryString.bots.toLowerCase() === 'true') : false),
        hideCommands: ('hide_commands' in $.QueryString ? ($.QueryString.hide_commands.toLowerCase() === 'true') : false),
        hideBadges: ('hide_badges' in $.QueryString ? ($.QueryString.hide_badges.toLowerCase() === 'true') : false),
        fade: ('fade' in $.QueryString ? parseInt($.QueryString.fade) : false),
        size: ('size' in $.QueryString ? parseInt($.QueryString.size) : 3),
        font: ('font' in $.QueryString ? parseInt($.QueryString.font) : 0),
        stroke: ('stroke' in $.QueryString ? parseInt($.QueryString.stroke) : false),
        shadow: ('shadow' in $.QueryString ? parseInt($.QueryString.shadow) : false),
        smallCaps: ('small_caps' in $.QueryString ? ($.QueryString.small_caps.toLowerCase() === 'true') : false),
        emotes: {},
        // list of emotes for each endpoint; used to update emotes
        emotesByEndpoint: {},
        badges: {},
        userBadges: {},
        ffzapBadges: null,
        bttvBadges: null,
        // TODO? (low prio) add back 7TV badges?
        // see e.g. https://github.com/SevenTV/API/blob/b2939b83e382232955eb56c8a3e78906b764b829/data/model/user.model.go#L46
        // https://github.com/SevenTV/API/blob/b2939b83e382232955eb56c8a3e78906b764b829/data/model/cosmetic.model.go#L157
        // seventvBadges: null,
        chatterinoBadges: null,
        cheers: {},
        lines: [],
        blockedUsers: ('block' in $.QueryString ? $.QueryString.block.toLowerCase().split(',') : false),
        bots: ['streamelements', 'streamlabs', 'nightbot', 'moobot', 'fossabot'],
        nicknameColor: ('cN' in $.QueryString ? $.QueryString.cN : false)
    },

    loadEmotes: function(channelID) {
        console.log('jChat: Refreshing emotes...');

        // this function should only be called if we successfully got new emote data from the endpoint
        // since each endpoint can fail, we update the emotes from each endpoint only if it succeeds
        function updateEmoteData(endpointPrefix, endpoint, emoteCodes) {
            const endpointKey = endpointPrefix + endpoint;
            // clear stale data in info.emotes from emotesByEndpoint (emote codes from last successful update)
            if (Chat.info.emotesByEndpoint[endpointKey]) {
                Chat.info.emotesByEndpoint[endpointKey].forEach(code => {
                    delete Chat.info.emotes[code];
                });
            }
            Chat.info.emotesByEndpoint[endpointKey] = [];

            emoteCodes.forEach(([code, emoteData]) => {
                // update emotesByEndpoint
                Chat.info.emotesByEndpoint[endpointKey].push(code);
                // update info.emotes
                Chat.info.emotes[code] = emoteData;
            });
            console.log('jChat: Successfully updated emotes from', endpointKey);

        }

        // Load BTTV, FFZ and 7TV emotes
        // TODO? BTTV personal emotes; cf. https://github.com/night/betterttv/blob/master/src/modules/emotes/personal-emotes.js
        // TODO: emote modifiers!
        ['emotes/global', 'users/twitch/' + encodeURIComponent(channelID)].forEach(endpoint => {
            $.getJSON('https://api.betterttv.net/3/cached/frankerfacez/' + endpoint).done(function(res) {
                const emoteCodes = [];
                res.forEach(emote => {
                    if (emote.images['4x']) {
                        var imageUrl = emote.images['4x'];
                        var upscale = false;
                    } else {
                        var imageUrl = emote.images['2x'] || emote.images['1x'];
                        var upscale = true;
                    }
                    emoteCodes.push([emote.code, {
                        id: emote.id,
                        image: imageUrl,
                        upscale: upscale
                    }]);
                });
                updateEmoteData('ffz/', endpoint, emoteCodes);
            });
        });

        ['emotes/global', 'users/twitch/' + encodeURIComponent(channelID)].forEach(endpoint => {
            $.getJSON('https://api.betterttv.net/3/cached/' + endpoint).done(function(res) {
                const emoteCodes = [];
                if (!Array.isArray(res)) {
                    res = res.channelEmotes.concat(res.sharedEmotes);
                }
                res.forEach(emote => {
                    emoteCodes.push([emote.code, {
                        id: emote.id,
                        image: 'https://cdn.betterttv.net/emote/' + emote.id + '/3x',
                        zeroWidth: ["5e76d338d6581c3724c0f0b2", "5e76d399d6581c3724c0f0b8", "567b5b520e984428652809b6", "5849c9a4f52be01a7ee5f79d", "567b5c080e984428652809ba", "567b5dc00e984428652809bd", "58487cc6f52be01a7ee5f205", "5849c9c8f52be01a7ee5f79e"].includes(emote.id)
                            // "5e76d338d6581c3724c0f0b2" => cvHazmat, "5e76d399d6581c3724c0f0b8" => cvMask, "567b5b520e984428652809b6" => SoSnowy, "5849c9a4f52be01a7ee5f79d" => IceCold, "567b5c080e984428652809ba" => CandyCane, "567b5dc00e984428652809bd" => ReinDeer, "58487cc6f52be01a7ee5f205" => SantaHat, "5849c9c8f52be01a7ee5f79e" => TopHat
                    }]);
                });
                updateEmoteData('bttv/', endpoint, emoteCodes);
            });
        });

        ['emote-sets/global', 'users/twitch/' + encodeURIComponent(channelID)].forEach(endpoint => {
            $.getJSON('https://7tv.io/v3/' + endpoint).done(function(res) {
                const emoteCodes = [];
                const emotes = res.emotes || (res.emote_set && res.emote_set.emotes);
                if (emotes) {
                    emotes.forEach(emote => {
                        emoteCodes.push([emote.name, {
                            id: emote.id, // not used?
                            image: 'https://' + emote.data.host.url + '/' +
                                (emote.data.animated ?
                                    emote.data.host.files[emote.data.host.files.length - 2].name :
                                    emote.data.host.files[emote.data.host.files.length - 1].name),
                            zeroWidth: emote.flags === 1
                        }]);
                    });
                    updateEmoteData('7tv/', endpoint, emoteCodes);
                } else {
                    console.warn("jChat: Bad response from 7tv", endpoint + ":", res);
                }
            });
        });
    },

    load: function(callback) {
        // TODO: notify user if we can't get data from API?
        myAPI("/users?login=" + Chat.info.channel).done(function(res) {
            res = res.data[0]
            Chat.info.channelID = res.id;
            Chat.loadEmotes(Chat.info.channelID);
            // reload emotes every 5 minutes (per BTTV API response headers)
            setInterval(Chat.loadEmotes, 5 * 60000, Chat.info.channelID);

            // Load CSS
            switch (Chat.info.size) {
                case 1:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/size_small.css"
                    }).appendTo("head");
                    break;
                case 2:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/size_medium.css"
                    }).appendTo("head");
                    break;
                default:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/size_large.css"
                    }).appendTo("head");
                    break;
            }

            switch (Chat.info.font) {
                case 1:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_SegoeUI.css"
                    }).appendTo("head");
                    break;
                case 2:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_Roboto.css"
                    }).appendTo("head");
                    break;
                case 3:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_Lato.css"
                    }).appendTo("head");
                    break;
                case 4:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_NotoSans.css"
                    }).appendTo("head");
                    break;
                case 5:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_SourceCodePro.css"
                    }).appendTo("head");
                    break;
                case 6:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_Impact.css"
                    }).appendTo("head");
                    break;
                case 7:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_Comfortaa.css"
                    }).appendTo("head");
                    break;
                case 8:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_DancingScript.css"
                    }).appendTo("head");
                    break;
                case 9:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_IndieFlower.css"
                    }).appendTo("head");
                    break;
                case 10:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_PressStart2P.css"
                    }).appendTo("head");
                    break;
                case 11:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_Wallpoet.css"
                    }).appendTo("head");
                    break;
                default:
                    $("<link/>", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: "styles/font_BalooTammudu.css"
                    }).appendTo("head");
                    break;
            }

            if (Chat.info.stroke) {
                switch (Chat.info.stroke) {
                    case 1:
                        $("<link/>", {
                            rel: "stylesheet",
                            type: "text/css",
                            href: "styles/stroke_thin.css"
                        }).appendTo("head");
                        break;
                    case 2:
                        $("<link/>", {
                            rel: "stylesheet",
                            type: "text/css",
                            href: "styles/stroke_medium.css"
                        }).appendTo("head");
                        break;
                    case 3:
                        $("<link/>", {
                            rel: "stylesheet",
                            type: "text/css",
                            href: "styles/stroke_thick.css"
                        }).appendTo("head");
                        break;
                    case 4:
                        $("<link/>", {
                            rel: "stylesheet",
                            type: "text/css",
                            href: "styles/stroke_thicker.css"
                        }).appendTo("head");
                        break;
                }
            }

            if (Chat.info.shadow) {
                switch (Chat.info.shadow) {
                    case 1:
                        $("<link/>", {
                            rel: "stylesheet",
                            type: "text/css",
                            href: "styles/shadow_small.css"
                        }).appendTo("head");
                        break;
                    case 2:
                        $("<link/>", {
                            rel: "stylesheet",
                            type: "text/css",
                            href: "styles/shadow_medium.css"
                        }).appendTo("head");
                        break;
                    case 3:
                        $("<link/>", {
                            rel: "stylesheet",
                            type: "text/css",
                            href: "styles/shadow_large.css"
                        }).appendTo("head");
                        break;
                }
            }

            if (Chat.info.smallCaps) {
                $("<link/>", {
                    rel: "stylesheet",
                    type: "text/css",
                    href: "styles/variant_SmallCaps.css"
                }).appendTo("head");
            }

            // Load badges
            myAPI('/chat/badges/global').done(function(res) {
                res?.data.forEach(badge => {
                    badge?.versions.forEach(version => {
                        Chat.info.badges[badge.set_id + ':' + version.id] = version.image_url_4x;
                    });
                });

                myAPI('/chat/badges?broadcaster_id=' + Chat.info.channelID).done(function(res) {
                    res?.data.forEach(badge => {
                        badge?.versions.forEach(version => {
                            Chat.info.badges[badge.set_id + ':' + version.id] = version.image_url_4x;
                        });
                    });

                    $.getJSON('https://api.frankerfacez.com/v1/_room/id/' + encodeURIComponent(Chat.info.channelID)).done(function(res) {
                        if (res.room.moderator_badge) {
                            Chat.info.badges['moderator:1'] = 'https://cdn.frankerfacez.com/room-badge/mod/' + Chat.info.channel + '/4/rounded';
                        }
                        if (res.room.vip_badge) {
                            Chat.info.badges['vip:1'] = 'https://cdn.frankerfacez.com/room-badge/vip/' + Chat.info.channel + '/4';
                        }
                    });
                });
            });

            if (!Chat.info.hideBadges) {
                $.getJSON('https://api.ffzap.com/v1/supporters')
                    .done(function(res) {
                        Chat.info.ffzapBadges = res;
                    })
                    .fail(function() {
                        Chat.info.ffzapBadges = [];
                    });
                $.getJSON('https://api.betterttv.net/3/cached/badges')
                    .done(function(res) {
                        Chat.info.bttvBadges = res;
                    })
                    .fail(function() {
                        Chat.info.bttvBadges = [];
                    });

                $.getJSON('https://api.chatterino.com/badges')
                    .done(function(res) {
                        Chat.info.chatterinoBadges = res.badges;
                    })
                    .fail(function() {
                        Chat.info.chatterinoBadges = [];
                    });
            }

            // Load cheers images
            myAPI("/bits/cheermotes?broadcaster_id=" + Chat.info.channelID).done(function(res) {
                res = res.data
                res.forEach(action => {
                    Chat.info.cheers[action.prefix] = {}
                    action.tiers.forEach(tier => {
                        Chat.info.cheers[action.prefix][tier.min_bits] = {
                            image: tier.images.dark.animated['4'],
                            color: tier.color
                        };
                    });
                });
            });

            callback(true);
        });
    },

    update: setInterval(function() {
        if (Chat.info.lines.length > 0) {
            var lines = Chat.info.lines.join('');

            if (Chat.info.animate) {
                var $auxDiv = $('<div></div>', { class: "hidden" }).appendTo("#chat_container");
                $auxDiv.append(lines);
                var auxHeight = $auxDiv.height();
                $auxDiv.remove();

                var $animDiv = $('<div></div>');
                $('#chat_container').append($animDiv);
                $animDiv.animate({ "height": auxHeight }, 150, function() {
                    $(this).remove();
                    $('#chat_container').append(lines);
                });
            } else {
                $('#chat_container').append(lines);
            }
            Chat.info.lines = [];
            var linesToDelete = $('.chat_line').length - 100;
            while (linesToDelete > 0) {
                $('.chat_line').eq(0).remove();
                linesToDelete--;
            }
        } else if (Chat.info.fade) {
            var messageTime = $('.chat_line').eq(0).data('time');
            if ((Date.now() - messageTime) / 1000 >= Chat.info.fade) {
                $('.chat_line').eq(0).fadeOut(function() {
                    $(this).remove();
                });
            }
        }
    }, 200),

    loadUserBadges: function(nick, userId) {
        Chat.info.userBadges[nick] = [];
        $.getJSON('https://api.frankerfacez.com/v1/user/' + nick).always(function(res) {
            if (res.badges) {
                Object.entries(res.badges).forEach(badge => {
                    var userBadge = {
                        description: badge[1].title,
                        url: badge[1].urls['4'],
                        color: badge[1].color
                    };
                    if (!Chat.info.userBadges[nick].includes(userBadge)) Chat.info.userBadges[nick].push(userBadge);
                });
            }
            Chat.info.ffzapBadges.forEach(user => {
                if (user.id.toString() === userId) {
                    var color = '#755000';
                    if (user.tier == 2) color = (user.badge_color || '#755000');
                    else if (user.tier == 3) {
                        if (user.badge_is_colored == 0) color = (user.badge_color || '#755000');
                        else color = false;
                    }
                    var userBadge = {
                        description: 'FFZ:AP Badge',
                        url: 'https://api.ffzap.com/v1/user/badge/' + userId + '/3',
                        color: color
                    };
                    if (!Chat.info.userBadges[nick].includes(userBadge)) Chat.info.userBadges[nick].push(userBadge);
                }
            });
            Chat.info.bttvBadges.forEach(user => {
                if (user.name === nick) {
                    var userBadge = {
                        description: user.badge.description,
                        url: user.badge.svg
                    };
                    if (!Chat.info.userBadges[nick].includes(userBadge)) Chat.info.userBadges[nick].push(userBadge);
                }
            });
            Chat.info.chatterinoBadges.forEach(badge => {
                badge.users.forEach(user => {
                    if (user === userId) {
                        var userBadge = {
                            description: badge.tooltip,
                            url: badge.image3 || badge.image2 || badge.image1
                        };
                        if (!Chat.info.userBadges[nick].includes(userBadge)) Chat.info.userBadges[nick].push(userBadge);
                    }
                });
            });
        });
    },

    write: function(nick, info, message) {
        if (info) {
            var $chatLine = $('<div></div>');
            $chatLine.addClass('chat_line');
            $chatLine.attr('data-nick', nick);
            $chatLine.attr('data-time', Date.now());
            $chatLine.attr('data-id', info.id);
            var $userInfo = $('<span></span>');
            $userInfo.addClass('user_info');

            // Writing badges
            if (Chat.info.hideBadges) {
                if (typeof(info.badges) === 'string') {
                    info.badges.split(',').forEach(badge => {
                        var $badge = $('<img/>');
                        $badge.addClass('badge');
                        badge = badge.split('/');
                        $badge.attr('src', Chat.info.badges[badge[0] + ':' + badge[1]]);
                        $userInfo.append($badge);
                    });
                }
            } else {
                var badges = [];
                const priorityBadges = ['predictions', 'admin', 'global_mod', 'staff', 'twitchbot', 'broadcaster', 'moderator', 'vip'];
                if (typeof(info.badges) === 'string') {
                    info.badges.split(',').forEach(badge => {
                        badge = badge.split('/');
                        var priority = (priorityBadges.includes(badge[0]) ? true : false);
                        badges.push({
                            description: badge[0],
                            url: Chat.info.badges[badge[0] + ':' + badge[1]],
                            priority: priority
                        });
                    });
                }
                var $modBadge;
                badges.forEach(badge => {
                    if (badge.priority) {
                        var $badge = $('<img/>');
                        $badge.addClass('badge');
                        $badge.attr('src', badge.url);
                        if (badge.description === 'moderator') $modBadge = $badge;
                        $userInfo.append($badge);
                    }
                });
                if (Chat.info.userBadges[nick]) {
                    Chat.info.userBadges[nick].forEach(badge => {
                        var $badge = $('<img/>');
                        $badge.addClass('badge');
                        if (badge.color) $badge.css('background-color', badge.color);
                        if (badge.description === 'Bot' && info.mod === '1') {
                            $badge.css('background-color', 'rgb(0, 173, 3)');
                            $modBadge.remove();
                        }
                        $badge.attr('src', badge.url);
                        $userInfo.append($badge);
                    });
                }
                badges.forEach(badge => {
                    if (!badge.priority) {
                        var $badge = $('<img/>');
                        $badge.addClass('badge');
                        $badge.attr('src', badge.url);
                        $userInfo.append($badge);
                    }
                });
            }

            // Writing username
            var $username = $('<span></span>');
            $username.addClass('nick');
            if (Chat.info.nicknameColor) var color = Chat.info.nicknameColor;
            else {
                if (typeof(info.color) === 'string') {
                    if (tinycolor(info.color).getBrightness() <= 50) var color = tinycolor(info.color).lighten(30);
                    else var color = info.color;
                } else {
                    const twitchColors = ["#FF0000", "#0000FF", "#008000", "#B22222", "#FF7F50", "#9ACD32", "#FF4500", "#2E8B57", "#DAA520", "#D2691E", "#5F9EA0", "#1E90FF", "#FF69B4", "#8A2BE2", "#00FF7F"];
                    var color = twitchColors[nick.charCodeAt(0) % 15];
                }
            }
            $username.css('color', color);
            $username.html(info['display-name'] ? info['display-name'] : nick);
            $userInfo.append($username);

            // Writing message
            var $message = $('<span></span>');
            $message.addClass('message');
            if (/^\x01ACTION.*\x01$/.test(message)) {
                $message.css('color', color);
                message = message.replace(/^\x01ACTION/, '').replace(/\x01$/, '').trim();
                $userInfo.append('<span>&nbsp;</span>');
            } else {
                $userInfo.append('<span class="colon">:</span>');
            }
            $chatLine.append($userInfo);

            // Replacing emotes and cheers
            var replacements = {};
            if (typeof(info.emotes) === 'string') {
                info.emotes.split('/').forEach(emoteData => {
                    var twitchEmote = emoteData.split(':');
                    var indexes = twitchEmote[1].split(',')[0].split('-');
                    var map = getCodepointToCodeunitMap(message);
                    var emoteCode = message.substr(map[indexes[0]], map[indexes[1]] - map[indexes[0]] + 1);
                    replacements[emoteCode] = '<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v2/' + twitchEmote[0] + '/default/dark/3.0" />';
                });
            }

            Object.entries(Chat.info.emotes).forEach(emote => {
                if (message.search(escapeRegExp(emote[0])) > -1) {
                    if (emote[1].upscale) replacements[emote[0]] = '<img class="emote upscale" src="' + emote[1].image + '" />';
                    else if (emote[1].zeroWidth) replacements[emote[0]] = '<img class="emote" data-zw="true" src="' + emote[1].image + '" />';
                    else replacements[emote[0]] = '<img class="emote" src="' + emote[1].image + '" />';
                }
            });

            message = escapeHtml(message);

            if (info.bits && parseInt(info.bits) > 0) {
                var chunks = message.split(' ');

                for (let i = 0; i < chunks.length; i++) {
                    var chunk = chunks[i];
                    var parsed = false;
                    for (cheerType of Object.entries(Chat.info.cheers)) {
                        if (!parsed) {
                            var regex = new RegExp("^" + cheerType[0] + "(\\d+)$");
                            var regexResult = regex.exec(chunk);
                            if (regexResult) {
                                var bits = parseInt(regexResult[1]);
                                var closest = 1;
                                for (cheerTier of Object.keys(cheerType[1]).map(Number).sort((a, b) => a - b)) {
                                    if (bits >= cheerTier) closest = cheerTier;
                                    else break;
                                }
                                chunks[i] = '<img class="cheer_emote" src="' + cheerType[1][closest].image + '" /><span class="cheer_bits" style="color: ' + cheerType[1][closest].color + ';">' + bits + '</span>';
                                parsed = true;
                            }
                        }
                    }
                }
                message = chunks.join(' ');
            }

            var replacementKeys = Object.keys(replacements);
            replacementKeys.sort(function(a, b) {
                return b.length - a.length;
            });

            replacementKeys.forEach(replacementKey => {
                var regex = new RegExp("(?<!\\S)(" + escapeRegExp(replacementKey) + ")(?!\\S)", 'g');
                message = message.replace(regex, replacements[replacementKey]);
            });

            message = twemoji.parse(message);
            $message.html(message);

            // Writing zero-width emotes
            messageNodes = $message.children();
            messageNodes.each(function(i) {
                if (i != 0 && $(this).data('zw') && ($(messageNodes[i - 1]).hasClass('emote') || $(messageNodes[i - 1]).hasClass('emoji')) && !$(messageNodes[i - 1]).data('zw')) {
                    var $container = $('<span></span>');
                    $container.addClass('zero-width_container');
                    $(this).addClass('zero-width');
                    $(this).before($container);
                    $container.append(messageNodes[i - 1], this);
                }
            });
            $message.html($message.html().trim());
            $chatLine.append($message);

            if (Chat.info.msgDelayMs !== null) {
                $chatLine.css('display', 'none');
            }

            Chat.info.lines.push($chatLine.wrap('<div>').parent().html());

            if (Chat.info.msgDelayMs !== null) {
                setTimeout(() => {
                    $('.chat_line[data-id=' + info.id + ']').css('display', '');
                }, Chat.info.msgDelayMs);
            }
        }
    },

    clearChat: function(nick) {
        setTimeout(function() {
            $('.chat_line[data-nick=' + nick + ']').remove();
        }, 100);
    },

    clearMessage: function(id) {
        setTimeout(function() {
            $('.chat_line[data-id=' + id + ']').remove();
        }, 100);
    },

    connect: function(channel) {
        Chat.info.channel = channel;
        var title = $(document).prop('title');
        $(document).prop('title', title + Chat.info.channel);

        Chat.load(function() {
            console.log('jChat: Connecting to IRC server...');
            var socket = new ReconnectingWebSocket('wss://irc-ws.chat.twitch.tv', 'irc', { reconnectInterval: 2000 });

            socket.onopen = function() {
                console.log('jChat: Connected');
                socket.send('PASS blah\r\n');
                socket.send('NICK justinfan' + Math.floor(Math.random() * 99999) + '\r\n');
                socket.send('CAP REQ :twitch.tv/commands twitch.tv/tags\r\n');
                socket.send('JOIN #' + Chat.info.channel + '\r\n');
            };

            socket.onclose = function() {
                console.log('jChat: Disconnected');
            };

            socket.onmessage = function(data) {
                data.data.split('\r\n').forEach(line => {
                    if (!line) return;
                    var message = window.parseIRC(line);
                    if (!message.command) return;

                    switch (message.command) {
                        case "PING":
                            socket.send('PONG ' + message.params[0]);
                            return;
                        case "JOIN":
                            console.log('jChat: Joined channel #' + Chat.info.channel);
                            return;
                        case "CLEARMSG":
                            if (message.tags) Chat.clearMessage(message.tags['target-msg-id']);
                            return;
                        case "CLEARCHAT":
                            if (message.params[1]) Chat.clearChat(message.params[1]);
                            return;
                        case "PRIVMSG":
                            if (message.params[0] !== '#' + channel || !message.params[1]) return;
                            var nick = message.prefix.split('@')[0].split('!')[0];

                            if (message.params[1].toLowerCase() === "!refreshoverlay" && typeof(message.tags.badges) === 'string') {
                                var flag = false;
                                message.tags.badges.split(',').forEach(badge => {
                                    badge = badge.split('/');
                                    if (badge[0] === "moderator" || badge[0] === "broadcaster") {
                                        flag = true;
                                        return;
                                    }
                                });
                                if (flag) {
                                    Chat.loadEmotes(Chat.info.channelID);
                                    return;
                                }
                            }

                            if (message.params[1].toLowerCase() === "!reloadchat" && typeof(message.tags.badges) === 'string') {
                                var flag = false;
                                message.tags.badges.split(',').forEach(badge => {
                                    badge = badge.split('/');
                                    if (badge[0] === "moderator" || badge[0] === "broadcaster") {
                                        flag = true;
                                        return;
                                    }
                                });
                                if (flag) {
                                    location.reload();
                                }
                            }

                            if (Chat.info.hideCommands) {
                                if (/^!.+/.test(message.params[1])) return;
                            }

                            if (!Chat.info.showBots) {
                                if (Chat.info.bots.includes(nick)) return;
                            }

                            if (Chat.info.blockedUsers) {
                                if (Chat.info.blockedUsers.includes(nick)) return;
                            }

                            if (!Chat.info.hideBadges) {
                                if (Chat.info.bttvBadges && Chat.info.chatterinoBadges && Chat.info.ffzapBadges && !Chat.info.userBadges[nick]) Chat.loadUserBadges(nick, message.tags['user-id']);
                            }

                            Chat.write(nick, message.tags, message.params[1]);
                            return;
                    }
                });
            };
        });
    }
};

$(document).ready(function () {
    const channelname = $.QueryString.channel
    if (channelname === undefined) {
        document.body.innerText = 'ERROR: Missing channel name parameter `channel`';
        return;
    }
    Chat.connect(channelname.toLowerCase());
});

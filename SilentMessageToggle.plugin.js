/**
 * @name SilentMessageToggle
 * @version 1.0.1
 * @description Toggles a "@silent " prefix for messages in Discord.
 * @author Zen
 * @authorId 391715612314959872
 */

'use strict';

/* @module react */
const React = BdApi.React;
/*@end */

/* @module @manifest */
var manifest = {
    "name": "SilentMessageToggle",
    "version": "1.0.1",
    "author": "Zen",
    "authorId": "391715612314959872",
    "description": "Toggles a \"@silent \" prefix for messages in Discord."
};
/*@end */

/* @module @api */
const {
    Patcher,
    Webpack
} = new BdApi(manifest.name);
/*@end */

/* @module shared.js */
const Dispatcher = Webpack.getByKeys("_dispatch");
const Flux = Webpack.getByKeys("Store");
const TypingModule = Webpack.getByKeys("startTyping");
const useStateFromStores = Webpack.getByStrings("useStateFromStores", {
    searchExports: true
});
const buildClassName = (...args) => {
    return args.reduce((classNames, arg) => {
        if (!arg) return classNames;
        if (typeof arg === "string" || typeof arg === "number") {
            classNames.push(arg);
        } else if (Array.isArray(arg)) {
            const nestedClassNames = buildClassName(...arg);
            if (nestedClassNames) classNames.push(nestedClassNames);
        } else if (typeof arg === "object") {
            Object.keys(arg).forEach((key) => {
                if (arg[key]) classNames.push(key);
            });
        }
        return classNames;
    }, []).join(" ");
};

/*@end */

/* @module silenceButton.scss */
const Styles = {
    sheets: [],
    _element: null,
    load() {
       const style = document.createElement('style');
        style.textContent = this.sheets.join("\n");
        document.head.appendChild(style);
        this._element = style;
    },
    unload() {
         if(this._element){
            this._element.remove();
            this._element = null;
         }
    }
};
Styles.sheets.push("/* silenceButton.scss */", `.silentMessageButton svg {
  color: var(--interactive-normal);
  overflow: visible;
  margin-top: 2.5px;
}

.silentMessageButton.enabled svg {
  color: #f04747;
}

.silentMessageButton {
  background: transparent;
}
.silentMessageButton:hover:not(.disabled) svg {
  color: var(--interactive-hover);
}

.silentMessageTooltip {
  display: inline-flex;
}`);
const styles = {
    "silentMessageButton": "silentMessageButton",
    "disabledStrokeThrough": "disabledStrokeThrough",
    "disabled": "disabled",
    "silentMessageTooltip": "silentMessageTooltip",
    "enabled": "enabled"
};
/*@end */

/* @module bell.tsx */
function Bell({
    disabled,
    ...props
}) {
    const size = 21;
    return React.createElement("svg", {
        ...props,
        width: size,
        height: size,
         viewBox: "0 0 448 512"
    }, React.createElement("path", {
        fill: "currentColor",
         d: "M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 93.4-48 128.9V480c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32V354.7c-30.7-35.5-48-81.9-48-128.9V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm0 400c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"
     }));
}
/*@end */

/* @module silenceButton.tsx */
const ChatBarClasses = Webpack.getByKeys("channelTextArea", "button");
const removeItem = function(array, item) {
    while (array.includes(item)) {
        array.splice(array.indexOf(item), 1);
    }
    return array;
};
const Settings = new class Settings2 extends Flux.Store {
    constructor() {
        super(Dispatcher, {});
    }
    _settings = BdApi.Data.load("silentMessageToggle_settings") ?? {excludedChannels: []};
    get(key, def) {
        return this._settings[key] ?? def;
    }
    set(key, value) {
        this._settings[key] = value;
        BdApi.Data.save("silentMessageToggle_settings", this._settings);
        this.emitChange();
    }
}();

function SilentMessageToggle({
    channel,
    isEmpty
}) {
    const enabled = useStateFromStores([Settings], SilentMessageToggle.getState.bind(this, channel.id));
    const handleClick = React.useCallback(() => {
        const excludeList = [...Settings.get("excludedChannels", [])];
        if (excludeList.includes(channel.id)) {
             removeItem(excludeList, channel.id);
        } else {
            excludeList.push(channel.id);
        }
        Settings.set("excludedChannels", excludeList);
    }, [enabled, channel.id]);
    return React.createElement(
        "div", {
            style: {
                marginRight: "2.5px"
            },
            className: ChatBarClasses.buttons
        },
        React.createElement(BdApi.Components.Tooltip, {
            text: enabled ? "Silent Message Enabled" : "Silent Message Disabled"
        }, (props) => React.createElement(
            "button", {
                ...props,
                className: buildClassName(styles.silentMessageButton, {
                    [styles.enabled]: enabled
                }),
                onClick: handleClick,
            },
            React.createElement(Bell, {
            })
        ))
    );
}
SilentMessageToggle.getState = function(channelId) {
    const isExcluded = Settings.get("excludedChannels", []).includes(channelId);
    return isExcluded;
};
/*@end */

/* @module index.tsx */
class SilentMessageTogglePlugin {
    start() {
         Styles.load();
        this.patchMessage();
        this.patchChannelTextArea();
    }
    stop() {
       Styles.unload();
        Patcher.unpatchAll();
    }
    patchMessage() {
        const MessageModule = Webpack.getByKeys("sendMessage");
        Patcher.before(MessageModule, "sendMessage", (_, [channelId, message]) => {
            const excludeList = Settings.get("excludedChannels", []);
            const shouldPrefix = excludeList.includes(channelId);
             if (shouldPrefix) {
               message.content = "@silent " + message.content;
            }
        });
    }
    patchChannelTextArea() {
        const ChannelTextArea = Webpack.getModule((m) => m?.type?.render?.toString?.()?.includes?.("CHANNEL_TEXT_AREA"));
        Patcher.after(ChannelTextArea.type, "render", (_, __, res) => {
            const chatBar = BdApi.Utils.findInTree(res, (e) => Array.isArray(e?.children) && e.children.some((c) => c?.props?.className?.startsWith("attachButton")), {
                walkable: ["children", "props"]
            });
            if (!chatBar) return console.error("[SilentMessageToggle] Failed to find ChatBar");
            const textAreaState = BdApi.Utils.findInTree(chatBar, (e) => e?.props?.channel, {
                walkable: ["children"]
            });
            if (!textAreaState) return console.error("[SilentMessageToggle] Failed to find textAreaState");
            chatBar.children.splice(-1, 0, React.createElement(SilentMessageToggle, {
                channel: textAreaState?.props?.channel,
                isEmpty: !Boolean(textAreaState?.props?.editorTextContent)
            }));
        });
    }
}
/*@end */
module.exports = SilentMessageTogglePlugin;
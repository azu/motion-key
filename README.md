# motion-key

A keyboard configuration for your motion.

## Requirements

- macOS
    - Currently, [sendKeyStroke.ts](./src/main/sendKeyStroke.ts) is dependend on macOS
    - Welcome to Pull Request for supporting another platform
- web camera

## Feature

- Bind keystroke to your motion
- Support gesture like 👍 ✌️
- Configuration by JavaScript `~/.config/motion-key/motion-key.config.js`

## Installation

> https://github.com/azu/motion-key/releases/latest

1. Download a binary from [the latest releases](https://github.com/azu/motion-key/releases/latest)
2. Install app

:warning: This app is not signed. So, OS show warning about it.

Additional installation steps on macOS:

1. Select `motion-key.app`
2. Open context menu and Click "Open"

:warning: require permission on macOS.
Open the app, and you need to add permission for `motion-key.app`

- **Accessibility**
  - use accessibility permission to get `activeWindow` object
  - `activeWindow` includes active app info like bundle.id, url, title.
- **Screen Recording**
  - use Screen Recording permission to use web camera

## Config

You can write config file in `~/.config/motion-key/motion-key.config.js`.

Config location:

- `~/.config/motion-key/motion-key.config.js`

You can control reaction for pixel diffs:

```js
module.exports = ({ type, activeWindow, payload }) => {
    if (type === "PixelChangeAction") {
        // ignore diffs less than 5% of capture
        if (payload.diffPercent < 5) {
            return;
        }
        return {
            key: "ArrowDown"
        };
    } else if (type === "GestureAction") {
        return {
            key: "ArrowUp"
        };
    }
}
```

You can change the config for each application:

```js
const muPdf = ({ type }) => {
    if (type === "PixelChangeAction") {
        return {
            key: "j"
        }
    } else if (type === "GestureAction") {
        return {
            key: "k"
        }
    }
};

module.exports = ({ type, activeWindow, payload }) => {
    const bundleId = activeWindow?.owner?.bundleId;
    if (bundleId === 'info.efcl.mu-pdf-viewer') {
        return muPdf({ type });
    }
    if (type === "PixelChangeAction") {
        return {
            key: "ArrowDown"
        }
    } else if (type === "GestureAction") {
        return {
            key: "ArrowUp"
        }
    }
}
```

You can set `key` for each Gesture:

```js
module.exports = ({ type, activeWindow, payload }) => {
    if (type === "PixelChangeAction") {
        return {
            key: "ArrowDown"
        }
    } else if (type === "GestureAction") {
        if (payload.type === "👍") {
            return { key: "ArrowUp" }
        }
        if (payload.type === "✌️") {
            return { key: "ArrowRight" }
        }
    }
}
```

You can set `nextActionIntervalMs` to throttle keys.

motion-key ignore actions until the passage of `nextActionIntervalMs`.

```js
module.exports = ({ type, activeWindow, payload }) => {
    if (type === "PixelChangeAction") {
        return {
            key: "ArrowDown",
            nextActionIntervalMs: 5 * 1000
        }
    } else if (type === "GestureAction") {
        return {
            key: "ArrowUp",
            nextActionIntervalMs: 5 * 1000
        }
    }
}
```

For more details, see [Config.ts](src/main/Config.ts).

### Recipe

Only work on Kindle.app

```js
const kindle = ({ type, payload }) => {
    if (type === "PixelChangeAction") {
        // large motion to next page
        if (payload.diffPercent < 10) {
            return;
        }
        return {
            key: "Space"
        }
    } else if (type === "GestureAction") {
        // 👍 next page
        if (payload.type === "👍") {
            return { key: "Space" }
        }
        // ✌️ prev page
        if (payload.type === "✌️") {
            return { key: "Space", modifier: { "shift": true } }
        }
    }
};

module.exports = ({ type, activeWindow, payload }) => {
    const bundleId = activeWindow?.owner?.bundleId;
    if (bundleId === "com.amazon.Kindle") {
        return kindle({ type, payload })
    }
}
```

## Releases

    npm version {patch,minor,major}
    git push --tags

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT

# motion-key

A key config app for your motion.

## Requirements

- macOS
    - Currently, [sendKeyStroke.ts](./src/main/sendKeyStroke.ts) is dependend on macOS
    - Welcome to Pull Request for supporting another platform
- web camera

## Feature

- Bind keystroke to your motion
- Support gesture like 👍 ✌️
- Configuration by JavaScript `~/.config/motion-key/motion-key.config.js`

## Usage

    yarn install
    yarn start

## Config

You can write config file in `~/.config/motion-key/motion-key.config.js`.

Example: `~/.config/motion-key/motion-key.config.js`:

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

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT
